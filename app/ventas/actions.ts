'use server'

import { supabase } from '@/lib/supabase'

interface ProductoVenta {
  id: string
  precio_venta: number
  precio_proveedor: number
  proveedor_id: string | null
}

interface ConfirmarVentaInput {
  productos: ProductoVenta[]
  metodo_pago: 'efectivo' | 'transferencia' | 'tarjeta' | 'mixto'
  total_venta: number
  ganancia_negocio: number
  total_proveedores: number
  monto_efectivo?: number | null
  monto_transferencia?: number | null
}

export async function confirmarVenta(input: ConfirmarVentaInput): Promise<void> {
  const { productos, metodo_pago, total_venta, ganancia_negocio, total_proveedores, monto_efectivo, monto_transferencia } = input

  // Verify all products are still available before proceeding
  const { data: estadoActual, error: checkError } = await supabase
    .from('productos')
    .select('id, estado, codigo')
    .in('id', productos.map((p) => p.id))

  if (checkError) throw new Error(`Error al verificar productos: ${checkError.message}`)

  const noDisponibles = (estadoActual ?? []).filter((p) => p.estado !== 'disponible')
  if (noDisponibles.length > 0) {
    const codigos = noDisponibles.map((p) => p.codigo).join(', ')
    throw new Error(`Los siguientes productos ya no están disponibles: ${codigos}`)
  }

  // 1. Create the venta record
  const { data: venta, error: ventaError } = await supabase
    .from('ventas')
    .insert({
      metodo_pago,
      total_venta,
      ganancia_negocio,
      total_proveedores,
      monto_efectivo: monto_efectivo ?? null,
      monto_transferencia: monto_transferencia ?? null,
      fecha: new Date().toISOString(),
    })
    .select()
    .single()

  if (ventaError) throw new Error(`Error al crear la venta: ${ventaError.message}`)

  // 2. Create venta_productos records
  const { error: vpError } = await supabase.from('venta_productos').insert(
    productos.map((p) => ({
      venta_id: venta.id,
      producto_id: p.id,
      precio_venta_momento: p.precio_venta,
      precio_proveedor_momento: p.precio_proveedor,
    }))
  )

  if (vpError) throw new Error(`Error al registrar los productos de la venta: ${vpError.message}`)

  // 3. Mark products as sold
  const { error: updateError } = await supabase
    .from('productos')
    .update({ estado: 'vendido' })
    .in('id', productos.map((p) => p.id))

  if (updateError) throw new Error(`Error al actualizar el estado de los productos: ${updateError.message}`)

  // 4. Create pagos_proveedores records for each product that has a supplier
  const pagosConProveedor = productos.filter((p) => p.proveedor_id)
  if (pagosConProveedor.length > 0) {
    const { error: pagosError } = await supabase.from('pagos_proveedores').insert(
      pagosConProveedor.map((p) => ({
        producto_id: p.id,
        proveedor_id: p.proveedor_id!,
        venta_id: venta.id,
        monto: p.precio_proveedor,
        estado: 'pendiente' as const,
        fecha_venta: new Date().toISOString(),
      }))
    )

    if (pagosError) throw new Error(`Error al crear los pagos pendientes: ${pagosError.message}`)
  }
}

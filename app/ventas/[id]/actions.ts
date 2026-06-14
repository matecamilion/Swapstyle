'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

interface EditarPrecioInput {
  venta_producto_id: string
  nuevo_precio_venta: number
  nuevo_precio_proveedor: number
  venta_id: string
  producto_id: string
}

export async function editarPrecioProductoVendido(input: EditarPrecioInput): Promise<void> {
  const { venta_producto_id, nuevo_precio_venta, nuevo_precio_proveedor, venta_id, producto_id } = input

  // 1. Verificar estado del pago (maybeSingle por si el producto no tiene proveedor)
  const { data: pago, error: pagoCheckError } = await supabase
    .from('pagos_proveedores')
    .select('estado')
    .eq('producto_id', producto_id)
    .eq('venta_id', venta_id)
    .maybeSingle()

  if (pagoCheckError) throw new Error(`Error al verificar el pago: ${pagoCheckError.message}`)
  if (pago?.estado === 'pagado') {
    throw new Error('Este pago ya fue liquidado y no puede modificarse.')
  }

  // 2. Actualizar venta_productos
  const { error: vpError } = await supabase
    .from('venta_productos')
    .update({
      precio_venta_momento: nuevo_precio_venta,
      precio_proveedor_momento: nuevo_precio_proveedor,
    })
    .eq('id', venta_producto_id)

  if (vpError) throw new Error(`Error al actualizar el precio del producto: ${vpError.message}`)

  // 3. Actualizar monto en pagos_proveedores (solo si existe el pago)
  if (pago) {
    const { error: pagoUpdateError } = await supabase
      .from('pagos_proveedores')
      .update({ monto: nuevo_precio_proveedor })
      .eq('producto_id', producto_id)
      .eq('venta_id', venta_id)

    if (pagoUpdateError) throw new Error(`Error al actualizar el pago del proveedor: ${pagoUpdateError.message}`)
  }

  // 4. Recalcular totales de la venta
  const { data: todosVP, error: vpFetchError } = await supabase
    .from('venta_productos')
    .select('precio_venta_momento, precio_proveedor_momento')
    .eq('venta_id', venta_id)

  if (vpFetchError) throw new Error(`Error al recalcular los totales: ${vpFetchError.message}`)

  const filas = todosVP ?? []
  const total_venta = filas.reduce((sum, p) => sum + Number(p.precio_venta_momento), 0)
  const total_proveedores = filas.reduce((sum, p) => sum + Number(p.precio_proveedor_momento), 0)
  const ganancia_negocio = total_venta - total_proveedores

  const { error: ventaUpdateError } = await supabase
    .from('ventas')
    .update({ total_venta, total_proveedores, ganancia_negocio })
    .eq('id', venta_id)

  if (ventaUpdateError) throw new Error(`Error al actualizar los totales de la venta: ${ventaUpdateError.message}`)

  revalidatePath(`/ventas/${venta_id}`)
}

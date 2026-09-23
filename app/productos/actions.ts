'use server'

import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { getSession } from '@/lib/session'
import type { ProductoConProveedor } from '@/types/database'

export interface TalleCantidad {
  talle: string
  cantidad: number
}

export interface CrearPrendasInput {
  descripcion: string
  categoria: string | null
  proveedor_id: string | null
  precio_venta: number
  precio_proveedor: number
  /** Vacío => se crea una sola prenda con talle null (comportamiento histórico) */
  talles: TalleCantidad[]
}

/**
 * Las server actions son POST alcanzables directamente. El proxy ya exige la
 * cookie de sesión, pero las actions la revalidan acá por si
 * alguna vez cambia el matcher.
 */
async function requerirSesion(): Promise<void> {
  const session = await getSession()
  if (!session.isLoggedIn) throw new Error('Sesión expirada, volvé a iniciar sesión')
}

const CODIGO_MAXIMO = 999999
const MAX_UNIDADES = 100
const MAX_INTENTOS = 5

function formatCodigo(n: number): string {
  return `SW-${String(n).padStart(6, '0')}`
}

/**
 * Último correlativo usado. Misma lógica de siempre (regex sobre SW-\d+ + máximo),
 * pero resuelta en el servidor al momento de insertar.
 */
async function ultimoNumero(): Promise<number> {
  const { data, error } = await supabase.from('productos').select('codigo')
  if (error) throw new Error(`Error al leer los códigos existentes: ${error.message}`)

  const nums = (data ?? [])
    .map((p: { codigo: string }) => {
      const m = p.codigo.match(/^SW-(\d+)$/)
      return m ? parseInt(m[1], 10) : 0
    })
    .filter((n: number) => n > 0)

  return nums.length > 0 ? Math.max(...nums) : 0
}

/** Expande [{talle:'M',cantidad:2},{talle:'L',cantidad:1}] => ['M','M','L'] */
function expandirUnidades(talles: TalleCantidad[]): (string | null)[] {
  const limpios = talles
    .map((t) => ({ talle: t.talle.trim(), cantidad: Math.floor(t.cantidad) }))
    .filter((t) => t.talle.length > 0)

  if (limpios.length === 0) return [null]

  const unidades: string[] = []
  for (const t of limpios) {
    if (!Number.isFinite(t.cantidad) || t.cantidad < 1) {
      throw new Error(`La cantidad del talle "${t.talle}" debe ser al menos 1`)
    }
    for (let i = 0; i < t.cantidad; i++) unidades.push(t.talle)
  }
  return unidades
}

/**
 * Crea una fila en productos por cada unidad, con códigos correlativos generados
 * en el servidor. El insert multi-fila es una sola sentencia: o entran todas o
 * ninguna. Si otro alta tomó el mismo rango, el índice único de `codigo` rechaza
 * el lote completo y se reintenta con el siguiente correlativo libre.
 */
export async function crearPrendas(input: CrearPrendasInput): Promise<ProductoConProveedor[]> {
  await requerirSesion()

  const descripcion = input.descripcion.trim()
  if (!descripcion) throw new Error('La descripción es requerida')
  if (!Number.isFinite(input.precio_venta) || input.precio_venta <= 0) {
    throw new Error('Precio de venta inválido')
  }
  if (!Number.isFinite(input.precio_proveedor) || input.precio_proveedor <= 0) {
    throw new Error('Precio de proveedor inválido')
  }
  if (input.precio_proveedor >= input.precio_venta) {
    throw new Error('El precio del proveedor debe ser menor al precio de venta')
  }

  const unidades = expandirUnidades(input.talles)
  if (unidades.length > MAX_UNIDADES) {
    throw new Error(`No se pueden crear más de ${MAX_UNIDADES} prendas de una vez`)
  }

  const base = {
    descripcion,
    categoria: input.categoria || null,
    proveedor_id: input.proveedor_id || null,
    precio_venta: input.precio_venta,
    precio_proveedor: input.precio_proveedor,
    estado: 'disponible' as const,
  }

  for (let intento = 0; intento < MAX_INTENTOS; intento++) {
    const desde = (await ultimoNumero()) + 1
    if (desde + unidades.length - 1 > CODIGO_MAXIMO) {
      throw new Error(`Se alcanzó el límite máximo de códigos SW-${CODIGO_MAXIMO}`)
    }

    const filas = unidades.map((talle, i) => ({
      ...base,
      codigo: formatCodigo(desde + i),
      talle,
    }))

    const { data, error } = await supabase
      .from('productos')
      .insert(filas)
      .select('*, proveedores(id, nombre)')

    if (!error) return (data ?? []) as ProductoConProveedor[]

    // 23505 = unique_violation sobre `codigo`: otro alta ganó la carrera, reintentar
    if (error.code !== '23505') {
      throw new Error(`No se pudo guardar: ${error.message}`)
    }
  }

  throw new Error('No se pudieron generar códigos únicos, probá de nuevo')
}

// ─────────────────────────────────────────────────────────────────────────────
// Eliminación de prendas
// ─────────────────────────────────────────────────────────────────────────────

export interface VentaDeLaPrenda {
  id: string
  fecha: string
  metodo_pago: string
  total_venta: number
  monto_efectivo: number | null
  monto_transferencia: number | null
  /** Prendas que quedarían en la venta si se borra esta */
  productos_restantes: number
  /** total_venta que quedaría si se borra esta prenda */
  nuevo_total: number
}

export interface ContextoEliminacion {
  estado: 'disponible' | 'vendido'
  /** Bloquea el borrado definitivo */
  tiene_pago_pagado: boolean
  /** null si la prenda nunca pasó por una venta registrada */
  venta: VentaDeLaPrenda | null
}

/** Datos que el diálogo de eliminación necesita para decidir qué ofrecer. */
export async function contextoEliminacion(productoId: string): Promise<ContextoEliminacion> {
  await requerirSesion()

  const { data: producto, error: prodError } = await supabase
    .from('productos')
    .select('id, estado')
    .eq('id', productoId)
    .single()

  if (prodError || !producto) throw new Error('La prenda no existe')

  const { data: pagos, error: pagosError } = await supabase
    .from('pagos_proveedores')
    .select('estado')
    .eq('producto_id', productoId)

  if (pagosError) throw new Error(`Error al leer los pagos: ${pagosError.message}`)

  const { data: vinculo, error: vpError } = await supabase
    .from('venta_productos')
    .select('venta_id')
    .eq('producto_id', productoId)
    .maybeSingle()

  if (vpError) throw new Error(`Error al leer la venta: ${vpError.message}`)

  let venta: VentaDeLaPrenda | null = null

  if (vinculo?.venta_id) {
    const [{ data: ventaData }, { data: items }] = await Promise.all([
      supabase
        .from('ventas')
        .select('id, fecha, metodo_pago, total_venta, monto_efectivo, monto_transferencia')
        .eq('id', vinculo.venta_id)
        .single(),
      supabase
        .from('venta_productos')
        .select('producto_id, precio_venta_momento')
        .eq('venta_id', vinculo.venta_id),
    ])

    if (ventaData) {
      const otros = (items ?? []).filter(
        (i: { producto_id: string }) => i.producto_id !== productoId,
      )
      venta = {
        ...(ventaData as Omit<VentaDeLaPrenda, 'productos_restantes' | 'nuevo_total'>),
        productos_restantes: otros.length,
        nuevo_total: otros.reduce(
          (sum: number, i: { precio_venta_momento: number }) => sum + i.precio_venta_momento,
          0,
        ),
      }
    }
  }

  return {
    estado: producto.estado as 'disponible' | 'vendido',
    tiene_pago_pagado: (pagos ?? []).some((p: { estado: string }) => p.estado === 'pagado'),
    venta,
  }
}

/** Saca la prenda del listado sin tocar ventas, pagos ni cierre de caja. */
export async function ocultarPrenda(productoId: string): Promise<void> {
  await requerirSesion()

  const { data, error } = await supabase
    .from('productos')
    .update({ oculto_at: new Date().toISOString() })
    .eq('id', productoId)
    .eq('estado', 'vendido')
    .is('oculto_at', null)
    .select('id')

  if (error) throw new Error(`No se pudo quitar del listado: ${error.message}`)
  if (!data || data.length === 0) {
    throw new Error('Solo se pueden quitar del listado las prendas vendidas')
  }
}

/**
 * Borrado definitivo de una prenda disponible. El RPC revalida estado y
 * ausencia de ventas/pagos dentro de la misma sentencia.
 */
export async function eliminarPrendaDisponible(productoId: string): Promise<void> {
  await requerirSesion()

  const { error } = await getSupabaseAdmin().rpc('eliminar_producto_disponible', {
    p_producto_id: productoId,
  })
  if (error) throw new Error(error.message)
}

/**
 * Borrado definitivo de una prenda vendida: pagos -> venta_productos ->
 * venta (recalculada o borrada) -> producto, todo en una transacción.
 * Los montos solo se usan si la venta es mixta y le quedan otras prendas.
 */
export async function eliminarPrendaVendida(input: {
  productoId: string
  monto_efectivo?: number | null
  monto_transferencia?: number | null
}): Promise<void> {
  await requerirSesion()

  const { error } = await getSupabaseAdmin().rpc('eliminar_producto_vendido', {
    p_producto_id: input.productoId,
    p_monto_efectivo: input.monto_efectivo ?? null,
    p_monto_transferencia: input.monto_transferencia ?? null,
  })
  if (error) throw new Error(error.message)
}

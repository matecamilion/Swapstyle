'use server'

import { supabase } from '@/lib/supabase'
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

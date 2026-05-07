import { supabase } from '@/lib/supabase'
import { ProveedoresClient } from './ProveedoresClient'
import type { Proveedor } from '@/types/database'

export const dynamic = 'force-dynamic'

type ProveedorRaw = Proveedor & { productos: { id: string; estado: string }[] }

export default async function ProveedoresPage() {
  const { data, error } = await supabase
    .from('proveedores')
    .select(`
      *,
      productos(id, estado)
    `)
    .order('nombre')

  if (error) {
    return (
      <div className="text-[var(--color-danger)]">
        Error al cargar proveedores: {error.message}
      </div>
    )
  }

  const proveedores = (data as ProveedorRaw[] ?? []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    telefono: p.telefono,
    email: p.email,
    observaciones: p.observaciones,
    created_at: p.created_at,
    prendas_activas: p.productos.filter((prod) => prod.estado === 'disponible').length,
  }))

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Proveedores</h1>
        <p className="page-subtitle">Gestioná los proveedores del local</p>
      </div>
      <ProveedoresClient proveedores={proveedores} />
    </div>
  )
}

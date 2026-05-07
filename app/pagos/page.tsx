import { supabase } from '@/lib/supabase'
import { PagosClient } from './PagosClient'

export const dynamic = 'force-dynamic'

export default async function PagosPage() {
  const { data: pagos, error } = await supabase
    .from('pagos_proveedores')
    .select(`
      *,
      proveedores(id, nombre),
      productos(id, codigo, descripcion)
    `)
    .order('fecha_venta', { ascending: false })

  if (error) {
    return <div className="text-[var(--color-danger)]">Error al cargar pagos: {error.message}</div>
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Pagos a Proveedores</h1>
        <p className="page-subtitle">Gestioná los pagos pendientes y el historial</p>
      </div>
      <PagosClient pagos={pagos ?? []} />
    </div>
  )
}

import { supabase } from '@/lib/supabase'
import { ProductosClient } from './ProductosClient'

export const dynamic = 'force-dynamic'

export default async function ProductosPage() {
  const [{ data: productos, error }, { data: proveedores }] = await Promise.all([
    supabase
      .from('productos')
      .select('*, proveedores(id, nombre)')
      .order('created_at', { ascending: false }),
    supabase.from('proveedores').select('id, nombre').order('nombre'),
  ])

  if (error) {
    return <div className="text-[var(--color-danger)]">Error al cargar productos: {error.message}</div>
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Productos / Stock</h1>
        <p className="page-subtitle">Gestión de prendas en consignación</p>
      </div>
      <ProductosClient
        productos={productos ?? []}
        proveedores={proveedores ?? []}
      />
    </div>
  )
}

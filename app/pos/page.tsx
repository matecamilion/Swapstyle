import { supabase } from '@/lib/supabase'
import { POSClient } from './POSClient'

export const dynamic = 'force-dynamic'

export default async function POSPage() {
  const { data: productos, error } = await supabase
    .from('productos')
    .select('*, proveedores(id, nombre)')
    .eq('estado', 'disponible')
    .order('codigo')

  if (error) {
    return <div className="text-[var(--color-danger)]">Error al cargar productos: {error.message}</div>
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Punto de Venta</h1>
        <p className="page-subtitle">Registrá una nueva venta</p>
      </div>
      <POSClient productos={productos ?? []} />
    </div>
  )
}

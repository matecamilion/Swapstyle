import { supabase } from '@/lib/supabase'
import { GastosClient } from './GastosClient'

export const dynamic = 'force-dynamic'

export default async function GastosPage() {
  const { data: gastos, error } = await supabase
    .from('gastos')
    .select('*')
    .order('fecha', { ascending: false })

  if (error) {
    return <div className="text-[var(--color-danger)]">Error al cargar gastos: {error.message}</div>
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Gastos</h1>
        <p className="page-subtitle">Registrá y revisá los gastos del negocio</p>
      </div>
      <GastosClient gastos={gastos ?? []} />
    </div>
  )
}

import { supabase } from '@/lib/supabase'
import { MetricasClient } from './MetricasClient'

export const dynamic = 'force-dynamic'

export default async function MetricasPage() {
  const hace30 = new Date()
  hace30.setDate(hace30.getDate() - 30)
  const desde30 = hace30.toISOString().split('T')[0]

  const [
    { data: ventas },
    { data: ventaProductos },
    { data: productos },
    { data: gastos },
  ] = await Promise.all([
    supabase.from('ventas').select('id, fecha, total_venta, ganancia_negocio, total_proveedores, metodo_pago').order('fecha', { ascending: true }),
    supabase.from('venta_productos').select('venta_id, precio_venta_momento, productos(categoria, proveedor_id, proveedores(nombre))'),
    supabase.from('productos').select('id, estado, categoria'),
    supabase.from('gastos').select('monto, fecha, categoria'),
  ])

  return (
    <div>
      <div className="mb-10">
        <h1 className="page-title">Métricas</h1>
        <p className="page-subtitle">Rendimiento y crecimiento del negocio</p>
      </div>
      <MetricasClient
        ventas={(ventas ?? []) as any[]}
        ventaProductos={(ventaProductos ?? []) as any[]}
        productos={(productos ?? []) as any[]}
        gastos={(gastos ?? []) as any[]}
      />
    </div>
  )
}

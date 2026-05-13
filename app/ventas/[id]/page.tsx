import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { formatCurrency, formatDateTime } from '@/lib/format'
import Link from 'next/link'
import { ArrowLeft, Package, CreditCard, Calendar, Hash } from 'lucide-react'
import { ExportVentaButton } from './ExportVentaButton'

export const dynamic = 'force-dynamic'

type VentaDetalle = {
  id: string
  fecha: string
  metodo_pago: string
  total_venta: number
  ganancia_negocio: number
  total_proveedores: number
  venta_productos: {
    id: string
    precio_venta_momento: number
    precio_proveedor_momento: number
    productos: {
      codigo: string
      descripcion: string
      categoria: string | null
      proveedores: { nombre: string } | null
    } | null
  }[]
  pagos_proveedores: { estado: string }[]
}

export default async function VentaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data, error } = await supabase
    .from('ventas')
    .select(`
      id, fecha, metodo_pago, total_venta, ganancia_negocio, total_proveedores,
      venta_productos(
        id, precio_venta_momento, precio_proveedor_momento,
        productos(codigo, descripcion, categoria, proveedores(nombre))
      ),
      pagos_proveedores(estado)
    `)
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const venta = data as unknown as VentaDetalle
  const codigoCorto = venta.id.slice(0, 8).toUpperCase()

  const estadoPago = venta.pagos_proveedores.length === 0
    ? null
    : venta.pagos_proveedores.every((p) => p.estado === 'pagado')
      ? 'pagado'
      : venta.pagos_proveedores.some((p) => p.estado === 'pagado')
        ? 'parcial'
        : 'pendiente'

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-heading text-[11px] font-bold tracking-widest uppercase text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          Volver al dashboard
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="page-title">Detalle de venta</h1>
            <p className="page-subtitle">#{codigoCorto}</p>
          </div>
          <ExportVentaButton
            codigoCorto={codigoCorto}
            fecha={venta.fecha}
            metodoPago={venta.metodo_pago}
            totalVenta={venta.total_venta}
            gananciaNegocio={venta.ganancia_negocio}
            totalProveedores={venta.total_proveedores}
            items={venta.venta_productos.map((vp) => ({
              precio_venta_momento: vp.precio_venta_momento,
              precio_proveedor_momento: vp.precio_proveedor_momento,
              productos: vp.productos ? {
                codigo: vp.productos.codigo,
                descripcion: vp.productos.descripcion,
                proveedores: vp.productos.proveedores,
              } : null,
            }))}
          />
        </div>
      </div>

      {/* Resumen superior */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <Hash size={14} className="text-[var(--text-muted)]" />
            <p className="metric-label">Código</p>
          </div>
          <p className="font-display text-xl tracking-wide text-[var(--accent-primary-light)]">#{codigoCorto}</p>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={14} className="text-[var(--text-muted)]" />
            <p className="metric-label">Fecha</p>
          </div>
          <p className="text-[var(--text-primary)] text-sm font-bold">{formatDateTime(venta.fecha)}</p>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard size={14} className="text-[var(--text-muted)]" />
            <p className="metric-label">Pago</p>
          </div>
          <p className="text-[var(--text-primary)] text-sm font-bold capitalize">{venta.metodo_pago}</p>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <Package size={14} className="text-[var(--text-muted)]" />
            <p className="metric-label">Prendas</p>
          </div>
          <p className="font-display text-xl tracking-wide text-[var(--text-primary)]">{venta.venta_productos.length}</p>
        </div>
      </div>

      {/* Productos */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(180deg, var(--accent-primary), var(--accent-secondary))' }} />
          <h3 className="section-title">Prendas vendidas</h3>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                <th className="text-left px-4 py-3">Código</th>
                <th className="text-left px-4 py-3">Prenda</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Categoría</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Proveedor</th>
                <th className="text-right px-4 py-3">Precio</th>
              </tr>
            </thead>
            <tbody>
              {venta.venta_productos.map((vp) => (
                <tr key={vp.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-elevated)]">
                  <td className="px-4 py-3 font-heading text-[12px] uppercase tracking-wider text-[var(--accent-primary-light)] font-bold">
                    {vp.productos?.codigo ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-primary)]">
                    {vp.productos?.descripcion ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] hidden sm:table-cell">
                    {vp.productos?.categoria ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] hidden sm:table-cell">
                    {vp.productos?.proveedores?.nombre ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-[var(--text-primary)]">
                    {formatCurrency(vp.precio_venta_momento)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totales */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="font-heading uppercase tracking-widest text-[11px] font-bold text-[var(--text-muted)]">Corresponde a proveedores</span>
            <span className="text-[var(--text-secondary)] font-bold">{formatCurrency(venta.total_proveedores)}</span>
          </div>
          {estadoPago && (
            <div className="flex justify-between text-sm">
              <span className="font-heading uppercase tracking-widest text-[11px] font-bold text-[var(--text-muted)]">Estado de pago a proveedores</span>
              <span className={`font-heading font-bold text-[11px] uppercase tracking-wide px-2 py-0.5 rounded ${
                estadoPago === 'pagado' ? 'badge-pagado' : estadoPago === 'parcial' ? 'badge-pendiente' : 'badge-pendiente'
              }`}>
                {estadoPago === 'parcial' ? 'Parcial' : estadoPago}
              </span>
            </div>
          )}
          <div className="h-px bg-[var(--border-subtle)]" />
          <div className="flex justify-between items-center">
            <span className="font-heading uppercase tracking-widest text-[12px] font-bold text-[var(--text-primary)]">Total de la venta</span>
            <span className="font-display text-4xl tracking-wide text-[var(--color-success)]">{formatCurrency(venta.total_venta)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

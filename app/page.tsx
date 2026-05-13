import { supabase } from '@/lib/supabase'
import { Package, TrendingUp, Banknote } from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/lib/format'
import Link from 'next/link'
import { DashboardCharts } from './DashboardCharts'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const hoy = new Date().toISOString().split('T')[0]
  const inicioHoy = `${hoy}T00:00:00.000Z`
  const finHoy = `${hoy}T23:59:59.999Z`

  const [
    { count: stockDisponible },
    { data: ventasHoy },
    { data: pagosPendientes },
    { data: ultimasVentas },
    { data: ventas },
    { data: ventaProductos },
    { data: productos },
    { data: gastos },
  ] = await Promise.all([
    supabase.from('productos').select('*', { count: 'exact', head: true }).eq('estado', 'disponible'),
    supabase.from('ventas').select('total_venta').gte('fecha', inicioHoy).lte('fecha', finHoy),
    supabase.from('pagos_proveedores').select('monto').eq('estado', 'pendiente'),
    supabase
      .from('ventas')
      .select(`
        id, fecha, metodo_pago, total_venta,
        venta_productos(
          id,
          productos(codigo, descripcion)
        )
      `)
      .order('fecha', { ascending: false })
      .limit(5),
    // Métricas data
    supabase.from('ventas').select('id, fecha, total_venta, ganancia_negocio, total_proveedores, metodo_pago').order('fecha', { ascending: true }),
    supabase.from('venta_productos').select('venta_id, precio_venta_momento, productos(categoria, proveedor_id, proveedores(nombre))'),
    supabase.from('productos').select('id, estado, categoria'),
    supabase.from('gastos').select('monto, fecha, categoria'),
  ])

  const ventasHoyTyped = ventasHoy as { total_venta: number }[] | null
  const pagosPendientesTyped = pagosPendientes as { monto: number }[] | null
  const cantidadVentasHoy = ventasHoyTyped?.length ?? 0
  const montoVentasHoy = ventasHoyTyped?.reduce((sum, v) => sum + v.total_venta, 0) ?? 0
  const totalPendiente = pagosPendientesTyped?.reduce((sum, p) => sum + p.monto, 0) ?? 0

  const kpis = [
    {
      label: 'Prendas en stock',
      value: String(stockDisponible ?? 0),
      icon: Package,
      color: 'text-[var(--color-info)]',
      href: '/productos',
    },
    {
      label: 'Ventas del día',
      value: formatCurrency(montoVentasHoy),
      sub: `${cantidadVentasHoy} venta${cantidadVentasHoy !== 1 ? 's' : ''}`,
      icon: TrendingUp,
      color: 'text-[var(--color-success)]',
      href: '/cierre',
    },
    {
      label: 'Pagos pendientes',
      value: formatCurrency(totalPendiente),
      icon: Banknote,
      color: 'text-[var(--color-warning)]',
      href: '/pagos',
    },
  ]

  return (
    <div>
      <div className="mb-10">
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '56px',
            letterSpacing: '0.03em',
            lineHeight: 1,
            color: 'var(--text-primary)',
          }}
        >
          DASHBOARD
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginTop: '6px',
          }}
        >
          Resumen del negocio
        </p>
      </div>

      {/* BLOQUE 1 — Resumen del día */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
        {kpis.map((kpi) => (
          <Link
            key={kpi.label}
            href={kpi.href}
            className="metric-card block hover:translate-y-[-2px] transition-all duration-150"
          >
            <div className="flex items-start justify-between mb-4">
              <p className="metric-label">{kpi.label}</p>
              <kpi.icon size={18} className={kpi.color} />
            </div>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '48px',
                lineHeight: 1,
                color: 'var(--text-primary)',
              }}
            >
              {kpi.value}
            </p>
            {kpi.sub && (
              <p
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginTop: '6px',
                }}
              >
                {kpi.sub}
              </p>
            )}
          </Link>
        ))}
      </div>

      {/* BLOQUE 2 + 3 — Resumen global + Gráficos */}
      <div className="mb-12">
        <DashboardCharts
          ventas={(ventas ?? []) as any[]}
          ventaProductos={(ventaProductos ?? []) as any[]}
          productos={(productos ?? []) as any[]}
          gastos={(gastos ?? []) as any[]}
        />
      </div>

      {/* BLOQUE 4 — Últimas ventas */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-1 h-5 rounded-full flex-shrink-0"
            style={{ background: 'linear-gradient(180deg, var(--accent-primary), var(--accent-secondary))' }}
          />
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '22px',
              letterSpacing: '0.06em',
              color: 'var(--text-primary)',
            }}
          >
            ÚLTIMAS VENTAS
          </h3>
        </div>

        {!ultimasVentas || ultimasVentas.length === 0 ? (
          <div className="rounded-lg border border-[var(--border-subtle)] py-12 text-center text-[var(--text-muted)] bg-[var(--bg-card)]">
            No hay ventas registradas aún
          </div>
        ) : (
          <div className="space-y-3">
            {(ultimasVentas as unknown as {
              id: string
              fecha: string
              metodo_pago: string
              total_venta: number
              venta_productos: { id: string; productos: { codigo: string; descripcion: string } | null }[]
            }[]).map((v) => {
              const prods = v.venta_productos
              return (
                <Link
                  key={v.id}
                  href={`/ventas/${v.id}`}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-5 py-4 flex items-center justify-between hover:border-[var(--accent-primary)] hover:bg-[var(--bg-card)] transition-all duration-150 block"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[var(--text-secondary)] text-sm">{formatDateTime(v.fecha)}</span>
                      <span className="text-xs bg-[var(--bg-input)] text-[var(--text-secondary)] px-2 py-0.5 rounded capitalize">
                        {v.metodo_pago}
                      </span>
                    </div>
                    <p className="text-[var(--text-secondary)] text-sm">
                      {prods.map((vp) => vp.productos?.descripcion).filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <span className="font-display text-2xl text-[var(--color-success)] tracking-wide">
                    {formatCurrency(v.total_venta)}
                  </span>
                </Link>
              )
            })}
          </div>
        )}

        <div className="mt-4 text-center">
          <Link href="/cierre" className="font-heading text-[13px] font-bold tracking-widest uppercase text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors">
            Ver cierre de caja completo →
          </Link>
        </div>
      </div>
    </div>
  )
}

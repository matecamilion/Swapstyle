'use client'

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts'
import { formatCurrency } from '@/lib/format'

interface Props {
  ventas: { id: string; fecha: string; total_venta: number; ganancia_negocio: number; total_proveedores: number; metodo_pago: string }[]
  ventaProductos: { venta_id: string; precio_venta_momento: number; productos: { categoria: string | null; proveedor_id: string | null; proveedores: { nombre: string } | null } | null }[]
  productos: { id: string; estado: string; categoria: string | null }[]
  gastos: { monto: number; fecha: string; categoria: string | null }[]
}

const COLORS = ['#7C3AED', '#F59E0B', '#22C55E', '#EF4444', '#3B82F6', '#EC4899', '#8B5CF6', '#10B981']

function fmt$K(v: number) {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`
  return `$${v}`
}

const tooltipStyle = {
  contentStyle: { background: '#1A1A1A', border: '1px solid #2E2E2E', borderRadius: 8, color: '#fff', fontFamily: 'Barlow, sans-serif', fontSize: 13 },
  labelStyle: { color: '#A3A3A3' },
  cursor: { fill: 'rgba(124,58,237,0.08)' },
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(180deg, var(--accent-primary), var(--accent-secondary))' }} />
      <h3 className="section-title">{children}</h3>
    </div>
  )
}

export function DashboardCharts({ ventas, ventaProductos, productos, gastos }: Props) {
  // ── KPIs globales
  const totalVentas = ventas.reduce((s, v) => s + v.total_venta, 0)
  const totalGanancia = ventas.reduce((s, v) => s + v.ganancia_negocio, 0)
  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0)
  const resultadoNeto = totalGanancia - totalGastos
  const ticketPromedio = ventas.length > 0 ? totalVentas / ventas.length : 0
  const stockDisponible = productos.filter((p) => p.estado === 'disponible').length
  const stockVendido = productos.filter((p) => p.estado === 'vendido').length

  // ── Ventas por día (últimos 30)
  const hace30 = new Date(); hace30.setDate(hace30.getDate() - 30)
  const ventasRecientes = ventas.filter((v) => new Date(v.fecha) >= hace30)
  const porDia = ventasRecientes.reduce<Record<string, { fecha: string; total: number; cant: number }>>((acc, v) => {
    const dia = v.fecha.slice(0, 10)
    if (!acc[dia]) acc[dia] = { fecha: dia, total: 0, cant: 0 }
    acc[dia].total += v.total_venta
    acc[dia].cant += 1
    return acc
  }, {})
  const lineData = Object.values(porDia).sort((a, b) => a.fecha.localeCompare(b.fecha)).map((d) => ({ ...d, label: d.fecha.slice(5) }))

  // ── Por categoría
  const porCategoria = ventaProductos.reduce<Record<string, number>>((acc, vp) => {
    const cat = vp.productos?.categoria ?? 'Sin categoría'
    acc[cat] = (acc[cat] ?? 0) + vp.precio_venta_momento
    return acc
  }, {})
  const catData = Object.entries(porCategoria).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 8)

  // ── Por método de pago
  const porMetodo = ventas.reduce<Record<string, number>>((acc, v) => {
    acc[v.metodo_pago] = (acc[v.metodo_pago] ?? 0) + v.total_venta
    return acc
  }, {})
  const metodoData = Object.entries(porMetodo).map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-12">
      {/* BLOQUE 2 — Resumen global histórico */}
      <section>
        <SectionTitle>Resumen global</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total vendido', value: formatCurrency(totalVentas), color: 'var(--text-primary)' },
            { label: 'Ingreso neto Swapstyle', value: formatCurrency(totalGanancia), color: 'var(--color-success)' },
            { label: 'Total gastos', value: formatCurrency(totalGastos), color: 'var(--color-danger)' },
            { label: 'Resultado neto', value: formatCurrency(resultadoNeto), color: resultadoNeto >= 0 ? 'var(--color-success)' : 'var(--color-danger)' },
            { label: 'Ventas totales', value: String(ventas.length), color: 'var(--text-primary)' },
            { label: 'Ticket promedio', value: formatCurrency(ticketPromedio), color: 'var(--color-info)' },
            { label: 'En stock', value: String(stockDisponible), color: 'var(--color-success)' },
            { label: 'Prendas vendidas', value: String(stockVendido), color: 'var(--text-secondary)' },
          ].map((kpi) => (
            <div key={kpi.label} className="metric-card">
              <p className="metric-label mb-2">{kpi.label}</p>
              <p className="font-display text-3xl tracking-wide" style={{ color: kpi.color }}>{kpi.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BLOQUE 3 — Gráficos */}
      {/* Ventas por día — full width */}
      <section>
        <SectionTitle>Ventas por día (últimos 30 días)</SectionTitle>
        {lineData.length === 0 ? (
          <div className="rounded-xl border border-[var(--border-subtle)] py-12 text-center text-[var(--text-muted)]">Sin datos</div>
        ) : (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="label" tick={{ fill: '#525252', fontSize: 11, fontFamily: 'Barlow Condensed' }} />
                <YAxis tickFormatter={fmt$K} tick={{ fill: '#525252', fontSize: 11, fontFamily: 'Barlow Condensed' }} />
                <Tooltip {...tooltipStyle} formatter={(v) => [formatCurrency(Number(v)), 'Total']} />
                <Line type="monotone" dataKey="total" stroke="#7C3AED" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#8B5CF6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Categoría + Método de pago — 2 cols */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <SectionTitle>Ventas por categoría</SectionTitle>
          {catData.length === 0 ? (
            <div className="rounded-xl border border-[var(--border-subtle)] py-12 text-center text-[var(--text-muted)]">Sin datos</div>
          ) : (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={catData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" horizontal={false} />
                  <XAxis type="number" tickFormatter={fmt$K} tick={{ fill: '#525252', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fill: '#A3A3A3', fontSize: 11 }} />
                  <Tooltip {...tooltipStyle} formatter={(v) => [formatCurrency(Number(v)), 'Total']} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section>
          <SectionTitle>Distribución por método de pago</SectionTitle>
          {metodoData.length === 0 ? (
            <div className="rounded-xl border border-[var(--border-subtle)] py-12 text-center text-[var(--text-muted)]">Sin datos</div>
          ) : (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={metodoData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {metodoData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v) => [formatCurrency(Number(v)), 'Total']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

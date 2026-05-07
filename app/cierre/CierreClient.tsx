'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { formatCurrency, formatDateTime } from '@/lib/format'
import type { Venta, VentaProducto, Producto } from '@/types/database'

type VentaConDetalles = Venta & {
  venta_productos: (VentaProducto & { productos: Pick<Producto, 'codigo' | 'descripcion'> | null })[]
}

const hoy = new Date().toISOString().split('T')[0]

function fmt(d: Date) { return d.toISOString().split('T')[0] }

const ATAJOS = [
  {
    label: 'Hoy',
    desde: () => hoy,
    hasta: () => hoy,
  },
  {
    label: 'Esta semana',
    desde: () => {
      const d = new Date()
      d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1))
      return fmt(d)
    },
    hasta: () => hoy,
  },
  {
    label: 'Este mes',
    desde: () => {
      const d = new Date()
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    },
    hasta: () => hoy,
  },
  {
    label: 'Mes anterior',
    desde: () => {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - 1)
      return fmt(d)
    },
    hasta: () => {
      const d = new Date()
      d.setDate(0)
      return fmt(d)
    },
  },
  {
    label: 'Últimos 30 días',
    desde: () => {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      return fmt(d)
    },
    hasta: () => hoy,
  },
]

export function CierreClient() {
  const [fechaDesde, setFechaDesde] = useState(hoy)
  const [fechaHasta, setFechaHasta] = useState(hoy)
  const [ventas, setVentas] = useState<VentaConDetalles[]>([])
  const [gastos, setGastos] = useState<{ monto: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [consultado, setConsultado] = useState(false)
  const [atajoActivo, setAtajoActivo] = useState<string | null>('Hoy')

  const consultar = useCallback(async (desde: string, hasta: string) => {
    setLoading(true)
    const desdeISO = `${desde}T00:00:00.000Z`
    const hastaISO = `${hasta}T23:59:59.999Z`

    const [{ data: ventasData }, { data: gastosData }] = await Promise.all([
      supabase
        .from('ventas')
        .select(`*, venta_productos(*, productos(codigo, descripcion))`)
        .gte('fecha', desdeISO)
        .lte('fecha', hastaISO)
        .order('fecha', { ascending: false }),
      supabase.from('gastos').select('monto').gte('fecha', desde).lte('fecha', hasta),
    ])

    setVentas(ventasData ?? [])
    setGastos(gastosData ?? [])
    setConsultado(true)
    setLoading(false)
  }, [])

  function aplicarAtajo(atajo: typeof ATAJOS[0]) {
    const desde = atajo.desde()
    const hasta = atajo.hasta()
    setFechaDesde(desde)
    setFechaHasta(hasta)
    setAtajoActivo(atajo.label)
    consultar(desde, hasta)
  }

  function handleConsultar() {
    setAtajoActivo(null)
    consultar(fechaDesde, fechaHasta)
  }

  const totalBruto = ventas.reduce((sum, v) => sum + v.total_venta, 0)
  const totalProveedores = ventas.reduce((sum, v) => sum + v.total_proveedores, 0)
  const gananciaNeta = ventas.reduce((sum, v) => sum + v.ganancia_negocio, 0)
  const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0)
  const gananciaReal = gananciaNeta - totalGastos
  const porMetodo = ventas.reduce<Record<string, number>>((acc, v) => {
    acc[v.metodo_pago] = (acc[v.metodo_pago] ?? 0) + v.total_venta
    return acc
  }, {})

  const btnAtajo = (label: string) => ({
    fontFamily: 'var(--font-heading)',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    border: label === atajoActivo ? '2px solid var(--accent-primary)' : '1px solid var(--border-default)',
    background: label === atajoActivo ? 'rgba(124,58,237,0.15)' : 'transparent',
    color: label === atajoActivo ? 'var(--text-primary)' : 'var(--text-muted)',
  })

  return (
    <div className="space-y-8">
      {/* Atajos rápidos */}
      <div>
        <p className="font-heading text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2">Período rápido</p>
        <div className="flex flex-wrap gap-2">
          {ATAJOS.map((a) => (
            <button key={a.label} style={btnAtajo(a.label)} onClick={() => aplicarAtajo(a)}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtro personalizado */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label>Desde</Label>
          <Input
            type="date"
            value={fechaDesde}
            max={fechaHasta}
            onChange={(e) => { setFechaDesde(e.target.value); setAtajoActivo(null) }}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <Label>Hasta</Label>
          <Input
            type="date"
            value={fechaHasta}
            min={fechaDesde}
            onChange={(e) => { setFechaHasta(e.target.value); setAtajoActivo(null) }}
            className="w-40"
          />
        </div>
        <button onClick={handleConsultar} disabled={loading} className="btn-primary">
          {loading ? 'Consultando...' : 'Consultar'}
        </button>
      </div>

      {consultado && (
        <>
          {/* Resumen financiero */}
          <div>
            <h3 className="font-heading text-lg tracking-widest uppercase text-[var(--text-primary)] mb-4">Resumen financiero</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="metric-card">
                <p className="metric-label mb-2">Total vendido (bruto)</p>
                <p className="cierre-stat-value">{formatCurrency(totalBruto)}</p>
                <p className="font-heading uppercase font-bold text-[10px] text-[var(--text-muted)] mt-2">{ventas.length} venta{ventas.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="metric-card">
                <p className="metric-label mb-2">Corresponde a proveedores</p>
                <p className="cierre-stat-value text-[var(--color-warning)]">{formatCurrency(totalProveedores)}</p>
              </div>
              <div className="metric-card">
                <p className="metric-label mb-2">Ingreso neto Swapstyle</p>
                <p className="cierre-stat-value text-[var(--color-success)]">{formatCurrency(gananciaNeta)}</p>
              </div>
              <div className="metric-card">
                <p className="metric-label mb-2">Total de gastos</p>
                <p className="cierre-stat-value text-[var(--color-danger)]">{formatCurrency(totalGastos)}</p>
              </div>
              <div className={`metric-card col-span-1 lg:col-span-2 ${gananciaReal >= 0 ? '' : ''}`}
                style={{ borderColor: gananciaReal >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)' }}>
                <p className="metric-label mb-2">Resultado neto (ingreso − gastos)</p>
                <p className={`cierre-stat-neto ${gananciaReal >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                  {formatCurrency(gananciaReal)}
                </p>
              </div>
            </div>
          </div>

          <div className="h-px bg-[var(--border-subtle)]" />

          {/* Por método de pago */}
          <div>
            <h3 className="font-heading text-lg tracking-widest uppercase text-[var(--text-primary)] mb-4">Por método de pago</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['efectivo', 'transferencia', 'tarjeta'] as const).map((metodo) => (
                <div key={metodo} className="metric-card">
                  <p className="metric-label mb-2 capitalize">{metodo}</p>
                  <p className="cierre-stat-value">{formatCurrency(porMetodo[metodo] ?? 0)}</p>
                  <p className="font-heading uppercase font-bold text-[10px] text-[var(--text-muted)] mt-2">
                    {ventas.filter((v) => v.metodo_pago === metodo).length} venta{ventas.filter((v) => v.metodo_pago === metodo).length !== 1 ? 's' : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-[var(--border-subtle)]" />

          {/* Detalle de ventas — clickeables */}
          <div>
            <h3 className="font-heading text-lg tracking-widest uppercase text-[var(--text-primary)] mb-4">Detalle de ventas</h3>
            {ventas.length === 0 ? (
              <div className="rounded-xl border border-[var(--border-subtle)] py-12 text-center text-[var(--text-muted)] bg-[var(--bg-card)]">
                No hay ventas en el período seleccionado
              </div>
            ) : (
              <div className="space-y-3">
                {ventas.map((v) => (
                  <Link
                    key={v.id}
                    href={`/ventas/${v.id}`}
                    className="block rounded-xl border border-[var(--border-subtle)] overflow-hidden hover:border-[var(--accent-primary)] transition-colors"
                  >
                    <div className="flex items-center justify-between px-5 py-3 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
                      <div className="flex items-center gap-3">
                        <span className="text-[var(--text-secondary)] text-sm">{formatDateTime(v.fecha)}</span>
                        <span className="text-xs bg-[var(--bg-input)] text-[var(--text-secondary)] px-2 py-0.5 rounded capitalize">
                          {v.metodo_pago}
                        </span>
                      </div>
                      <span className="font-display text-2xl tracking-wide text-[var(--color-success)]">{formatCurrency(v.total_venta)}</span>
                    </div>
                    <div className="px-5 py-2 bg-[var(--bg-card)]">
                      {v.venta_productos.map((vp) => (
                        <div key={vp.id} className="flex items-center justify-between py-1.5 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-heading font-bold text-[12px] tracking-wider uppercase text-[var(--accent-primary-light)]">{vp.productos?.codigo}</span>
                            <span className="text-[var(--text-primary)]">{vp.productos?.descripcion}</span>
                          </div>
                          <span className="text-[var(--text-secondary)] font-medium">{formatCurrency(vp.precio_venta_momento)}</span>
                        </div>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-heading)',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        display: 'block',
        marginBottom: '4px',
      }}
    >
      {children}
    </span>
  )
}

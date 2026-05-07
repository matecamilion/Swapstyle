'use client'

import { useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/format'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Producto = { id: string; codigo: string; descripcion: string; categoria: string | null; estado: string; precio_venta: number; precio_proveedor: number }
type Pago = { id: string; monto: number; estado: string; fecha_venta: string; fecha_pago: string | null; productos: { codigo: string; descripcion: string } | null }

interface Props {
  productos: Producto[]
  pagos: Pago[]
}

export function ProveedorDetalleClient({ productos, pagos }: Props) {
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const [tab, setTab] = useState<'prendas' | 'pagos'>('prendas')

  const categorias = [...new Set(productos.map((p) => p.categoria).filter(Boolean))] as string[]

  const filtrados = productos.filter((p) => {
    const matchEstado = filtroEstado === 'todos' || p.estado === filtroEstado
    const matchCat = filtroCategoria === 'todas' || p.categoria === filtroCategoria
    return matchEstado && matchCat
  })

  const tabStyle = (active: boolean) => ({
    fontFamily: 'var(--font-heading)',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    border: 'none',
    background: active ? 'rgba(124,58,237,0.15)' : 'transparent',
    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
    borderBottom: active ? '2px solid var(--accent-primary)' : '2px solid transparent',
  })

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[var(--border-subtle)] pb-0">
        <button style={tabStyle(tab === 'prendas')} onClick={() => setTab('prendas')}>
          Prendas ({productos.length})
        </button>
        <button style={tabStyle(tab === 'pagos')} onClick={() => setTab('pagos')}>
          Historial de pagos ({pagos.length})
        </button>
      </div>

      {tab === 'prendas' && (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="w-36">
              <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v ?? 'todos')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="disponible">Disponible</SelectItem>
                  <SelectItem value="vendido">Vendido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {categorias.length > 0 && (
              <div className="w-44">
                <Select value={filtroCategoria} onValueChange={(v) => setFiltroCategoria(v ?? 'todas')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las categorías</SelectItem>
                    {categorias.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <p className="font-heading text-[11px] uppercase tracking-widest font-bold text-[var(--text-muted)] self-center ml-1">
              {filtrados.length} prenda{filtrados.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="text-left px-4 py-3">Código</th>
                  <th className="text-left px-4 py-3">Descripción</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Categoría</th>
                  <th className="text-right px-4 py-3">P. Venta</th>
                  <th className="text-center px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-[var(--text-muted)] py-12">Sin prendas</td></tr>
                ) : (
                  filtrados.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-elevated)]">
                      <td className="px-4 py-3 font-heading text-[12px] uppercase tracking-wider text-[var(--accent-primary-light)] font-bold">{p.codigo}</td>
                      <td className="px-4 py-3 text-[var(--text-primary)]">{p.descripcion}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] hidden sm:table-cell">{p.categoria ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-[var(--text-primary)]">{formatCurrency(p.precio_venta)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={p.estado === 'disponible' ? 'badge-disponible inline-block' : 'badge-vendido inline-block'}>
                          {p.estado}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'pagos' && (
        <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                <th className="text-left px-4 py-3">Prenda</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Fecha venta</th>
                <th className="text-right px-4 py-3">Monto</th>
                <th className="text-center px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3 hidden sm:table-cell">Fecha pago</th>
              </tr>
            </thead>
            <tbody>
              {pagos.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-[var(--text-muted)] py-12">Sin historial de pagos</td></tr>
              ) : (
                pagos.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-elevated)]">
                    <td className="px-4 py-3">
                      <p className="font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--accent-primary-light)]">{p.productos?.codigo}</p>
                      <p className="text-[var(--text-secondary)] text-sm">{p.productos?.descripcion}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] hidden sm:table-cell">{formatDate(p.fecha_venta)}</td>
                    <td className="px-4 py-3 text-right font-bold text-[var(--text-primary)]">{formatCurrency(p.monto)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={p.estado === 'pendiente' ? 'badge-pendiente inline-block' : 'badge-pagado inline-block'}>
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--text-muted)] text-sm hidden sm:table-cell">
                      {p.fecha_pago ? formatDate(p.fecha_pago) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Lock } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { editarPrecioProductoVendido } from './actions'

export type ItemVenta = {
  id: string
  producto_id: string
  precio_venta_momento: number
  precio_proveedor_momento: number
  estado_pago: 'pendiente' | 'pagado' | null
  productos: {
    codigo: string
    descripcion: string
    categoria: string | null
    proveedores: { nombre: string } | null
  } | null
}

interface Props {
  ventaId: string
  items: ItemVenta[]
}

type EditState = {
  ventaProductoId: string
  productoId: string
  precioVenta: number
  precioProveedor: number
}

export function PrendasVendidasTable({ ventaId, items }: Props) {
  const [editando, setEditando] = useState<EditState | null>(null)
  const [loading, setLoading] = useState(false)

  function abrirEdicion(item: ItemVenta) {
    setEditando({
      ventaProductoId: item.id,
      productoId: item.producto_id,
      precioVenta: item.precio_venta_momento,
      precioProveedor: item.precio_proveedor_momento,
    })
  }

  async function handleGuardar() {
    if (!editando) return
    setLoading(true)
    try {
      await editarPrecioProductoVendido({
        venta_producto_id: editando.ventaProductoId,
        nuevo_precio_venta: editando.precioVenta,
        nuevo_precio_proveedor: editando.precioProveedor,
        venta_id: ventaId,
        producto_id: editando.productoId,
      })
      toast.success('Precios actualizados')
      setEditando(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al actualizar los precios'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-subtle)]">
              <th className="table-header text-left px-4 py-3">Código</th>
              <th className="table-header text-left px-4 py-3">Prenda</th>
              <th className="table-header text-left px-4 py-3 hidden sm:table-cell">Categoría</th>
              <th className="table-header text-left px-4 py-3 hidden md:table-cell">Proveedor</th>
              <th className="table-header text-right px-4 py-3">Venta</th>
              <th className="table-header text-right px-4 py-3 hidden sm:table-cell">P. Prov.</th>
              <th className="table-header px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-elevated)]">
                <td className="px-4 py-3 font-heading text-[12px] uppercase tracking-wider text-[var(--accent-primary-light)] font-bold">
                  {item.productos?.codigo ?? '—'}
                </td>
                <td className="px-4 py-3 text-[var(--text-primary)]">
                  {item.productos?.descripcion ?? '—'}
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)] hidden sm:table-cell">
                  {item.productos?.categoria ?? '—'}
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)] hidden md:table-cell">
                  {item.productos?.proveedores?.nombre ?? '—'}
                </td>
                <td className="px-4 py-3 text-right font-bold text-[var(--text-primary)]">
                  {formatCurrency(item.precio_venta_momento)}
                </td>
                <td className="px-4 py-3 text-right text-[var(--text-secondary)] hidden sm:table-cell">
                  {formatCurrency(item.precio_proveedor_momento)}
                </td>
                <td className="px-4 py-3 text-right">
                  {item.estado_pago === 'pagado' ? (
                    <span className="badge-pagado inline-flex items-center gap-1">
                      <Lock size={10} />
                      Pagado
                    </span>
                  ) : (
                    <button
                      onClick={() => abrirEdicion(item)}
                      className="inline-flex items-center gap-1 font-heading text-[10px] uppercase tracking-widest font-bold text-[var(--accent-primary)] hover:text-[var(--accent-primary-light)] transition-colors"
                    >
                      <Pencil size={11} />
                      Editar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget && !loading) setEditando(null) }}
        >
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] p-6 w-full max-w-sm mx-4 shadow-2xl">
            <h2 className="font-display text-xl tracking-wide text-[var(--text-primary)] mb-1">Editar precios</h2>
            <p className="font-heading text-[11px] uppercase tracking-widest text-[var(--text-muted)] font-bold mb-5">
              Los totales de la venta se recalcularán automáticamente
            </p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="font-heading text-[11px] uppercase tracking-widest font-bold text-[var(--text-muted)] block mb-1.5">
                  Precio de venta
                </label>
                <input
                  type="number"
                  min="0"
                  value={editando.precioVenta}
                  onChange={(e) =>
                    setEditando((prev) =>
                      prev ? { ...prev, precioVenta: parseFloat(e.target.value) || 0 } : null
                    )
                  }
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg px-3 py-2.5 text-[var(--text-primary)] font-display text-lg tracking-wide focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
              <div>
                <label className="font-heading text-[11px] uppercase tracking-widest font-bold text-[var(--text-muted)] block mb-1.5">
                  Monto proveedor
                </label>
                <input
                  type="number"
                  min="0"
                  value={editando.precioProveedor}
                  onChange={(e) =>
                    setEditando((prev) =>
                      prev ? { ...prev, precioProveedor: parseFloat(e.target.value) || 0 } : null
                    )
                  }
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg px-3 py-2.5 text-[var(--text-primary)] font-display text-lg tracking-wide focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditando(null)}
                disabled={loading}
                className="flex-1 btn-ghost"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                disabled={loading}
                className="flex-1 btn-primary"
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

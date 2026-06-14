'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Search, X, ShoppingCart, CheckCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { confirmarVenta } from './actions'
import type { ProductoConProveedor } from '@/types/database'

type MetodoPago = 'efectivo' | 'transferencia' | 'tarjeta' | 'mixto'

type CarritoItem = ProductoConProveedor & {
  precio_venta_momento: number
  precio_proveedor_momento: number
}

interface Props {
  productos: ProductoConProveedor[]
}

export function POSClient({ productos: allProductos }: Props) {
  const router = useRouter()
  const [disponibles, setDisponibles] = useState(allProductos)
  const [search, setSearch] = useState('')
  const [carrito, setCarrito] = useState<CarritoItem[]>([])
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo')
  const [montoEfectivo, setMontoEfectivo] = useState(0)
  const [montoTransferencia, setMontoTransferencia] = useState(0)
  const [loading, setLoading] = useState(false)
  const [ventaConfirmada, setVentaConfirmada] = useState<{
    total: number
    ganancia: number
    cantidad: number
    metodo: string
  } | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const searchResults = search.length > 0
    ? disponibles.filter(
        (p) =>
          !carrito.some((c) => c.id === p.id) &&
          (p.codigo.toLowerCase().includes(search.toLowerCase()) ||
            p.descripcion.toLowerCase().includes(search.toLowerCase()))
      )
    : []

  function agregarAlCarrito(producto: ProductoConProveedor) {
    if (carrito.some((c) => c.id === producto.id)) {
      toast.error('Este producto ya está en el carrito')
      return
    }
    setCarrito((prev) => [
      ...prev,
      {
        ...producto,
        precio_venta_momento: producto.precio_venta,
        precio_proveedor_momento: producto.precio_proveedor,
      },
    ])
    setSearch('')
    searchRef.current?.focus()
  }

  function quitarDelCarrito(id: string) {
    setCarrito((prev) => prev.filter((p) => p.id !== id))
  }

  function actualizarPrecio(
    id: string,
    campo: 'precio_venta_momento' | 'precio_proveedor_momento',
    valor: number,
  ) {
    setCarrito((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)),
    )
  }

  const totalVenta = carrito.reduce((sum, p) => sum + p.precio_venta_momento, 0)
  const totalProveedor = carrito.reduce((sum, p) => sum + p.precio_proveedor_momento, 0)
  const ganancia = totalVenta - totalProveedor

  async function handleConfirmar() {
    if (carrito.length === 0) {
      toast.error('El carrito está vacío')
      return
    }

    if (metodoPago === 'mixto') {
      const sumaMixto = montoEfectivo + montoTransferencia
      if (Math.abs(sumaMixto - totalVenta) > 0.01) {
        toast.error('Los montos no suman el total de la venta')
        return
      }
    }

    setLoading(true)
    try {
      await confirmarVenta({
        productos: carrito.map((p) => ({
          id: p.id,
          precio_venta: p.precio_venta_momento,
          precio_proveedor: p.precio_proveedor_momento,
          proveedor_id: p.proveedor_id,
        })),
        metodo_pago: metodoPago,
        total_venta: totalVenta,
        ganancia_negocio: ganancia,
        total_proveedores: totalProveedor,
        monto_efectivo: metodoPago === 'mixto' ? montoEfectivo : null,
        monto_transferencia: metodoPago === 'mixto' ? montoTransferencia : null,
      })

      setVentaConfirmada({
        total: totalVenta,
        ganancia,
        cantidad: carrito.length,
        metodo: metodoPago,
      })

      // Remove sold products from available list
      const vendidosIds = new Set(carrito.map((p) => p.id))
      setDisponibles((prev) => prev.filter((p) => !vendidosIds.has(p.id)))
      setCarrito([])
      setMetodoPago('efectivo')
      setMontoEfectivo(0)
      setMontoTransferencia(0)
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al confirmar la venta'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  if (ventaConfirmada) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="bg-[var(--color-success-bg)] border border-[var(--color-success)] rounded-2xl p-10 max-w-sm w-full">
          <CheckCircle className="mx-auto mb-4 text-[var(--color-success)]" size={48} />
          <h3 className="font-display text-3xl text-[var(--text-primary)] mb-1 uppercase tracking-wide">¡Venta confirmada!</h3>
          <p className="text-[var(--text-secondary)] mb-6">{ventaConfirmada.cantidad} prenda{ventaConfirmada.cantidad !== 1 ? 's' : ''} vendida{ventaConfirmada.cantidad !== 1 ? 's' : ''} por {ventaConfirmada.metodo}</p>
          <div className="space-y-2 mb-6 text-left">
            <div className="flex justify-between text-sm">
              <span className="font-heading uppercase tracking-widest text-[var(--text-muted)] font-bold">Total cobrado</span>
              <span className="text-[var(--color-success)] font-bold font-display text-2xl tracking-wide">{formatCurrency(ventaConfirmada.total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-heading uppercase tracking-widest text-[var(--text-muted)] font-bold">{ventaConfirmada.cantidad} prenda{ventaConfirmada.cantidad !== 1 ? 's' : ''} — {ventaConfirmada.metodo}</span>
            </div>
          </div>
          <button
            onClick={() => setVentaConfirmada(null)}
            className="btn-primary w-full"
          >
            Nueva venta
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-160px)]">
      {/* Panel izquierdo: buscador */}
      <div className="flex flex-col gap-4">
        <div className="pos-search flex items-center gap-3">
          <Search size={20} className="text-[var(--text-muted)]" />
          <input
            ref={searchRef}
            placeholder="Buscar prenda por código o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none text-[var(--text-primary)] font-body text-lg outline-none placeholder:text-[var(--text-muted)]"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
          {search.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] p-8">
              <Search size={32} className="mb-3 opacity-30" />
              <p className="font-heading uppercase tracking-wider font-bold">Escribí para buscar prendas disponibles</p>
              <p className="text-sm mt-1">{disponibles.length} prendas disponibles en stock</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[var(--text-muted)] p-8 font-heading uppercase tracking-wider font-bold">
              No hay prendas disponibles que coincidan
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)] p-2">
              {searchResults.map((p) => (
                <div
                  key={p.id}
                  onClick={() => agregarAlCarrito(p)}
                  className="product-result-item group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="product-code">{p.codigo}</span>
                      {p.categoria && (
                        <span className="font-heading uppercase font-bold text-[10px] tracking-wider text-[var(--text-secondary)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded">
                          {p.categoria}
                        </span>
                      )}
                    </div>
                    <p className="text-[var(--text-primary)] font-medium mt-0.5">{p.descripcion}</p>
                    {p.proveedores && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{p.proveedores.nombre}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="product-price">{formatCurrency(p.precio_venta)}</p>
                    <p className="font-heading uppercase tracking-wider font-bold text-[10px] text-[var(--accent-primary)] mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      + Agregar
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Panel derecho: carrito */}
      <div className="flex flex-col rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center gap-2">
          <ShoppingCart size={18} className="text-[var(--text-muted)]" />
          <h3 className="font-heading uppercase tracking-widest font-bold text-[var(--text-primary)]">Carrito</h3>
          {carrito.length > 0 && (
            <span className="ml-auto font-heading uppercase tracking-widest text-[10px] font-bold bg-[var(--accent-primary)] text-white px-2 py-0.5 rounded-full">
              {carrito.length} prenda{carrito.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {carrito.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] p-8">
              <ShoppingCart size={32} className="mb-3 opacity-30" />
              <p className="font-heading uppercase tracking-wider font-bold">El carrito está vacío</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {carrito.map((p) => (
                <div key={p.id} className="flex items-start justify-between px-5 py-3 hover:bg-[var(--bg-elevated)] transition-colors gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-[12px] uppercase tracking-wider text-[var(--accent-primary-light)] font-bold">{p.codigo}</p>
                    <p className="text-[var(--text-primary)] text-sm truncate">{p.descripcion}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex flex-col gap-1 items-end">
                      <div className="flex items-center gap-1">
                        <span className="font-heading text-[9px] uppercase tracking-widest text-[var(--text-muted)] font-bold">Venta</span>
                        <input
                          type="number"
                          min="0"
                          value={p.precio_venta_momento}
                          onChange={(e) => actualizarPrecio(p.id, 'precio_venta_momento', parseFloat(e.target.value) || 0)}
                          className="w-24 text-right font-display text-base tracking-wide text-[var(--text-primary)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-2 py-0.5 focus:outline-none focus:border-[var(--accent-primary)]"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-heading text-[9px] uppercase tracking-widest text-[var(--text-muted)] font-bold">Prov.</span>
                        <input
                          type="number"
                          min="0"
                          value={p.precio_proveedor_momento}
                          onChange={(e) => actualizarPrecio(p.id, 'precio_proveedor_momento', parseFloat(e.target.value) || 0)}
                          className="w-24 text-right font-display text-base tracking-wide text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-2 py-0.5 focus:outline-none focus:border-[var(--accent-primary)]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => actualizarPrecio(p.id, 'precio_proveedor_momento', Math.round(p.precio_venta_momento * 0.7))}
                        className="btn-ghost text-xs py-1.5 w-full"
                      >
                        70% prov / 30% swap
                        <span className="ml-1.5 text-[var(--accent-primary-light)]">
                          → {formatCurrency(Math.round(p.precio_venta_momento * 0.7))}
                        </span>
                      </button>
                    </div>
                    <button
                      onClick={() => quitarDelCarrito(p.id)}
                      className="text-[var(--text-muted)] hover:text-[var(--color-danger)] transition-colors mt-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {carrito.length > 0 && (
          <div className="border-t border-[var(--border-subtle)] p-5 space-y-4 bg-[var(--bg-surface)] rounded-b-xl">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span className="font-heading uppercase tracking-widest text-[11px] font-bold">Corresponde a proveedores</span>
                <span className="font-bold">{formatCurrency(totalProveedor)}</span>
              </div>
              <div className="h-px bg-[var(--border-subtle)] my-2" />
              <div className="flex justify-between items-end">
                <span className="cart-total-label mb-2">Total</span>
                <span className="cart-total">{formatCurrency(totalVenta)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label>Método de pago</label>
              <div className="grid grid-cols-2 gap-2">
                {(['efectivo', 'transferencia', 'tarjeta', 'mixto'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMetodoPago(m)}
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      padding: '10px 6px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      border: metodoPago === m
                        ? '2px solid var(--accent-primary)'
                        : '1px solid var(--border-default)',
                      background: metodoPago === m
                        ? 'rgba(124, 58, 237, 0.15)'
                        : 'transparent',
                      color: metodoPago === m
                        ? 'var(--text-primary)'
                        : 'var(--text-secondary)',
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {metodoPago === 'mixto' && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] w-28 shrink-0">Efectivo</span>
                    <input
                      type="number"
                      min="0"
                      value={montoEfectivo}
                      onChange={(e) => setMontoEfectivo(parseFloat(e.target.value) || 0)}
                      className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded px-2 py-1.5 text-right font-display text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] w-28 shrink-0">Transferencia</span>
                    <input
                      type="number"
                      min="0"
                      value={montoTransferencia}
                      onChange={(e) => setMontoTransferencia(parseFloat(e.target.value) || 0)}
                      className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded px-2 py-1.5 text-right font-display text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                  </div>
                  <p className={`font-heading text-[10px] uppercase tracking-widest font-bold text-right ${Math.abs(montoEfectivo + montoTransferencia - totalVenta) < 0.01 ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}`}>
                    Resta: {formatCurrency(totalVenta - montoEfectivo - montoTransferencia)}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleConfirmar}
              disabled={loading}
              className="btn-confirm-sale mt-2"
            >
              {loading ? 'Procesando...' : 'Confirmar venta'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

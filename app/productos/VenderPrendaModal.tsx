'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PreciosMomentoFields } from '@/components/venta/PreciosMomentoFields'
import { MetodoPagoSelector, mixtoInvalido, type MetodoPago } from '@/components/venta/MetodoPagoSelector'
import { confirmarVenta } from '@/app/ventas/actions'
import { formatCurrency } from '@/lib/format'
import type { ProductoConProveedor } from '@/types/database'

interface Props {
  open: boolean
  producto: ProductoConProveedor | null
  onClose: () => void
  onVendido: (producto: ProductoConProveedor) => void
}

/**
 * Registra la venta de una prenda desde el listado de stock.
 * Pide los mismos datos que el POS y usa la misma server action (confirmarVenta),
 * así la venta impacta igual en dashboard, cierre de caja y pagos a proveedores.
 */
export function VenderPrendaModal({ open, producto, onClose, onVendido }: Props) {
  if (!producto) return null
  // key: cada prenda arranca con su propio estado inicial, sin efectos de reset
  return (
    <VenderPrendaForm
      key={producto.id}
      open={open}
      producto={producto}
      onClose={onClose}
      onVendido={onVendido}
    />
  )
}

function VenderPrendaForm({ open, producto, onClose, onVendido }: Props & { producto: ProductoConProveedor }) {
  const [precioVenta, setPrecioVenta] = useState(producto.precio_venta)
  const [precioProveedor, setPrecioProveedor] = useState(producto.precio_proveedor)
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo')
  const [montoEfectivo, setMontoEfectivo] = useState(0)
  const [montoTransferencia, setMontoTransferencia] = useState(0)
  const [loading, setLoading] = useState(false)

  const ganancia = precioVenta - precioProveedor

  async function handleConfirmar() {
    if (precioVenta <= 0) {
      toast.error('El precio de venta debe ser mayor a 0')
      return
    }
    if (mixtoInvalido(metodoPago, montoEfectivo, montoTransferencia, precioVenta)) {
      toast.error('Los montos no suman el total de la venta')
      return
    }

    setLoading(true)
    try {
      await confirmarVenta({
        productos: [{
          id: producto.id,
          precio_venta: precioVenta,
          precio_proveedor: precioProveedor,
          proveedor_id: producto.proveedor_id,
        }],
        metodo_pago: metodoPago,
        total_venta: precioVenta,
        ganancia_negocio: precioVenta - precioProveedor,
        total_proveedores: precioProveedor,
        monto_efectivo: metodoPago === 'mixto' ? montoEfectivo : null,
        monto_transferencia: metodoPago === 'mixto' ? montoTransferencia : null,
      })
      onVendido({ ...producto, estado: 'vendido' })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al confirmar la venta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[var(--bg-elevated)] border-[var(--border-strong)] text-[var(--text-primary)] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl tracking-wide uppercase text-[var(--text-primary)]">
            Marcar como vendido
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-heading text-[12px] uppercase tracking-wider text-[var(--accent-primary-light)] font-bold">{producto.codigo}</span>
                {producto.talle && (
                  <span className="font-heading uppercase font-bold text-[10px] tracking-wider text-[var(--text-secondary)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded">
                    {producto.talle}
                  </span>
                )}
              </div>
              <p className="text-[var(--text-primary)] text-sm mt-0.5 truncate">{producto.descripcion}</p>
              {producto.proveedores && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{producto.proveedores.nombre}</p>
              )}
            </div>
            <PreciosMomentoFields
              className="shrink-0"
              precioVenta={precioVenta}
              precioProveedor={precioProveedor}
              onPrecioVentaChange={setPrecioVenta}
              onPrecioProveedorChange={setPrecioProveedor}
            />
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span className="font-heading uppercase tracking-widest text-[11px] font-bold">Corresponde a proveedor</span>
              <span className="font-bold">{formatCurrency(precioProveedor)}</span>
            </div>
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span className="font-heading uppercase tracking-widest text-[11px] font-bold">Ganancia Swapstyle</span>
              <span className="font-bold">{formatCurrency(ganancia)}</span>
            </div>
            <div className="h-px bg-[var(--border-subtle)] my-2" />
            <div className="flex justify-between items-end">
              <span className="cart-total-label mb-2">Total</span>
              <span className="cart-total">{formatCurrency(precioVenta)}</span>
            </div>
          </div>

          <MetodoPagoSelector
            metodoPago={metodoPago}
            onMetodoPagoChange={setMetodoPago}
            total={precioVenta}
            montoEfectivo={montoEfectivo}
            montoTransferencia={montoTransferencia}
            onMontoEfectivoChange={setMontoEfectivo}
            onMontoTransferenciaChange={setMontoTransferencia}
          />

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
            <button type="button" onClick={handleConfirmar} disabled={loading} className="btn-primary flex-1">
              {loading ? 'Procesando...' : 'Confirmar venta'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

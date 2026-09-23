'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, EyeOff, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/format'
import {
  contextoEliminacion,
  ocultarPrenda,
  eliminarPrendaDisponible,
  eliminarPrendaVendida,
  type ContextoEliminacion,
} from './actions'
import type { ProductoConProveedor } from '@/types/database'

export type ModoEliminacion = 'oculto' | 'borrado'

interface Props {
  open: boolean
  producto: ProductoConProveedor | null
  onClose: () => void
  onEliminado: (producto: ProductoConProveedor, modo: ModoEliminacion) => void
}

const MENSAJE_PAGADO = 'Ya se le pagó al proveedor; solo se puede quitar del listado'

/** "15/03" — día y mes de la venta, para el aviso de cierre de caja. */
function diaMes(fechaISO: string): string {
  return new Date(fechaISO).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

function esDeHoy(fechaISO: string): boolean {
  const f = new Date(fechaISO)
  const hoy = new Date()
  return (
    f.getFullYear() === hoy.getFullYear() &&
    f.getMonth() === hoy.getMonth() &&
    f.getDate() === hoy.getDate()
  )
}

export function EliminarPrendaDialog({ open, producto, onClose, onEliminado }: Props) {
  if (!producto) return null
  // key: al cambiar de prenda se remonta con estado inicial limpio
  return (
    <EliminarPrendaContenido
      key={producto.id}
      open={open}
      producto={producto}
      onClose={onClose}
      onEliminado={onEliminado}
    />
  )
}

function EliminarPrendaContenido({ open, producto, onClose, onEliminado }: Props & { producto: ProductoConProveedor }) {
  const [contexto, setContexto] = useState<ContextoEliminacion | null>(null)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [opcion, setOpcion] = useState<ModoEliminacion>('oculto')
  const [montoEfectivo, setMontoEfectivo] = useState(0)
  const [montoTransferencia, setMontoTransferencia] = useState(0)
  const [procesando, setProcesando] = useState(false)

  const productoId = producto.id

  useEffect(() => {
    let cancelado = false

    contextoEliminacion(productoId)
      .then((ctx) => {
        if (cancelado) return
        setContexto(ctx)
        // Reparto proporcional como punto de partida; el usuario lo ajusta.
        if (ctx.venta && ctx.venta.metodo_pago === 'mixto' && ctx.venta.productos_restantes > 0) {
          const anterior = ctx.venta.total_venta
          const efectivo = anterior > 0
            ? Math.round((ctx.venta.monto_efectivo ?? 0) * ctx.venta.nuevo_total / anterior)
            : 0
          setMontoEfectivo(efectivo)
          setMontoTransferencia(ctx.venta.nuevo_total - efectivo)
        }
      })
      .catch((err: unknown) => {
        if (!cancelado) setErrorCarga(err instanceof Error ? err.message : 'Error al leer la prenda')
      })
      .finally(() => {
        if (!cancelado) setCargando(false)
      })

    return () => { cancelado = true }
  }, [productoId])

  const esVendido = contexto?.estado === 'vendido'
  const venta = contexto?.venta ?? null
  const bloqueadoPorPago = contexto?.tiene_pago_pagado ?? false
  const pideMontos = Boolean(
    venta && venta.metodo_pago === 'mixto' && venta.productos_restantes > 0,
  )
  const montosCuadran = !pideMontos ||
    Math.abs(montoEfectivo + montoTransferencia - (venta?.nuevo_total ?? 0)) < 0.01

  async function handleConfirmar() {
    if (!contexto) return
    setProcesando(true)
    try {
      if (contexto.estado === 'disponible') {
        await eliminarPrendaDisponible(producto.id)
        onEliminado(producto, 'borrado')
      } else if (opcion === 'oculto') {
        await ocultarPrenda(producto.id)
        onEliminado(producto, 'oculto')
      } else {
        await eliminarPrendaVendida({
          productoId: producto.id,
          monto_efectivo: pideMontos ? montoEfectivo : null,
          monto_transferencia: pideMontos ? montoTransferencia : null,
        })
        onEliminado(producto, 'borrado')
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar la prenda')
    } finally {
      setProcesando(false)
    }
  }

  const confirmarDeshabilitado =
    esVendido && opcion === 'borrado' && (bloqueadoPorPago || !montosCuadran)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[var(--bg-elevated)] border-[var(--border-strong)] text-[var(--text-primary)] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl tracking-wide uppercase text-[var(--text-primary)]">
            Eliminar prenda
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3">
            <div className="flex items-center gap-2">
              <span className="font-heading text-[12px] uppercase tracking-wider text-[var(--accent-primary-light)] font-bold">{producto.codigo}</span>
              {producto.talle && (
                <span className="font-heading uppercase font-bold text-[10px] tracking-wider text-[var(--text-secondary)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded">
                  {producto.talle}
                </span>
              )}
            </div>
            <p className="text-[var(--text-primary)] text-sm mt-0.5">{producto.descripcion}</p>
          </div>

          {cargando && (
            <p className="text-[var(--text-muted)] text-sm py-4 text-center">Cargando…</p>
          )}

          {errorCarga && (
            <>
              <p className="text-[var(--color-danger)] text-sm">{errorCarga}</p>
              <button type="button" onClick={onClose} className="btn-ghost w-full">Cerrar</button>
            </>
          )}

          {!cargando && !errorCarga && contexto && (
            <>
              {!esVendido ? (
                <p className="text-[var(--text-secondary)] text-sm">
                  Esta prenda está disponible y se va a borrar definitivamente. No se puede deshacer.
                </p>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setOpcion('oculto')}
                    className="w-full text-left rounded-lg p-3 transition-colors"
                    style={{
                      border: opcion === 'oculto' ? '2px solid var(--accent-primary)' : '1px solid var(--border-default)',
                      background: opcion === 'oculto' ? 'rgba(124, 58, 237, 0.12)' : 'transparent',
                    }}
                  >
                    <span className="flex items-center gap-2 font-heading text-[11px] uppercase tracking-widest font-bold text-[var(--text-primary)]">
                      <EyeOff size={14} />
                      Quitar del listado
                    </span>
                    <span className="block text-xs text-[var(--text-muted)] mt-1">
                      Desaparece del stock. La venta, el pago al proveedor y el cierre de caja quedan intactos.
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={bloqueadoPorPago}
                    onClick={() => setOpcion('borrado')}
                    className="w-full text-left rounded-lg p-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      border: opcion === 'borrado' ? '2px solid var(--color-danger)' : '1px solid var(--border-default)',
                      background: opcion === 'borrado' ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
                    }}
                  >
                    <span className="flex items-center gap-2 font-heading text-[11px] uppercase tracking-widest font-bold text-[var(--text-primary)]">
                      <Trash2 size={14} />
                      Borrar definitivamente
                    </span>
                    <span className="block text-xs text-[var(--text-muted)] mt-1">
                      {bloqueadoPorPago
                        ? MENSAJE_PAGADO
                        : venta && venta.productos_restantes === 0
                          ? 'Borra la prenda, la venta completa y el pago al proveedor.'
                          : venta
                            ? 'Borra la prenda y el pago al proveedor, y recalcula la venta.'
                            : 'Borra la prenda. No tiene una venta registrada asociada.'}
                    </span>
                  </button>
                </div>
              )}

              {esVendido && opcion === 'borrado' && !bloqueadoPorPago && (
                <div className="space-y-3">
                  {venta && !esDeHoy(venta.fecha) && (
                    <div className="flex gap-2 rounded-lg border border-[var(--color-warning)] bg-[rgba(245,158,11,0.10)] p-3">
                      <AlertTriangle size={16} className="text-[var(--color-warning)] shrink-0 mt-0.5" />
                      <p className="text-xs text-[var(--text-secondary)]">
                        Esta venta es del {diaMes(venta.fecha)}. Borrarla va a cambiar el cierre de caja de ese día.
                      </p>
                    </div>
                  )}

                  {pideMontos && venta && (
                    <div className="space-y-2 rounded-lg border border-[var(--border-subtle)] p-3">
                      <div className="flex justify-between items-baseline">
                        <span className="font-heading text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)]">Nuevo total</span>
                        <span className="font-display text-lg tracking-wide text-[var(--text-primary)]">{formatCurrency(venta.nuevo_total)}</span>
                      </div>
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
                      <p className={`font-heading text-[10px] uppercase tracking-widest font-bold text-right ${montosCuadran ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}`}>
                        Resta: {formatCurrency(venta.nuevo_total - montoEfectivo - montoTransferencia)}
                      </p>
                    </div>
                  )}

                  <p className="text-sm font-bold text-[var(--color-danger)]">
                    Esto elimina la venta y el pago al proveedor. No se puede deshacer.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
                <button
                  type="button"
                  onClick={handleConfirmar}
                  disabled={procesando || confirmarDeshabilitado}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {procesando
                    ? 'Eliminando…'
                    : esVendido && opcion === 'oculto'
                      ? 'Quitar del listado'
                      : 'Borrar definitivamente'}
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { formatCurrency } from '@/lib/format'

export type MetodoPago = 'efectivo' | 'transferencia' | 'tarjeta' | 'mixto'

export const METODOS_PAGO: MetodoPago[] = ['efectivo', 'transferencia', 'tarjeta', 'mixto']

/** true si el método es mixto y los montos no suman el total de la venta */
export function mixtoInvalido(
  metodoPago: MetodoPago,
  montoEfectivo: number,
  montoTransferencia: number,
  total: number,
) {
  if (metodoPago !== 'mixto') return false
  return Math.abs(montoEfectivo + montoTransferencia - total) > 0.01
}

interface Props {
  metodoPago: MetodoPago
  onMetodoPagoChange: (metodo: MetodoPago) => void
  total: number
  montoEfectivo: number
  montoTransferencia: number
  onMontoEfectivoChange: (valor: number) => void
  onMontoTransferenciaChange: (valor: number) => void
}

/**
 * Selector de método de pago (incluye mixto con efectivo + transferencia).
 * Usado por el carrito del POS y por el modal "Vendido" del listado de productos.
 */
export function MetodoPagoSelector({
  metodoPago,
  onMetodoPagoChange,
  total,
  montoEfectivo,
  montoTransferencia,
  onMontoEfectivoChange,
  onMontoTransferenciaChange,
}: Props) {
  return (
    <div className="space-y-2">
      <label>Método de pago</label>
      <div className="grid grid-cols-2 gap-2">
        {METODOS_PAGO.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onMetodoPagoChange(m)}
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
              onChange={(e) => onMontoEfectivoChange(parseFloat(e.target.value) || 0)}
              className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded px-2 py-1.5 text-right font-display text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-heading text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] w-28 shrink-0">Transferencia</span>
            <input
              type="number"
              min="0"
              value={montoTransferencia}
              onChange={(e) => onMontoTransferenciaChange(parseFloat(e.target.value) || 0)}
              className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded px-2 py-1.5 text-right font-display text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </div>
          <p className={`font-heading text-[10px] uppercase tracking-widest font-bold text-right ${Math.abs(montoEfectivo + montoTransferencia - total) < 0.01 ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}`}>
            Resta: {formatCurrency(total - montoEfectivo - montoTransferencia)}
          </p>
        </div>
      )}
    </div>
  )
}

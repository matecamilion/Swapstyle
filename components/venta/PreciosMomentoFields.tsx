'use client'

import { formatCurrency } from '@/lib/format'

export const PORCENTAJE_PROVEEDOR = 0.7

interface Props {
  precioVenta: number
  precioProveedor: number
  onPrecioVentaChange: (valor: number) => void
  onPrecioProveedorChange: (valor: number) => void
  className?: string
}

/**
 * Inputs de precio de venta / precio proveedor del momento + atajo 70/30.
 * Usado por el carrito del POS y por el modal "Vendido" del listado de productos.
 */
export function PreciosMomentoFields({
  precioVenta,
  precioProveedor,
  onPrecioVentaChange,
  onPrecioProveedorChange,
  className,
}: Props) {
  return (
    <div className={`flex flex-col gap-1 items-end ${className ?? ''}`}>
      <div className="flex items-center gap-1">
        <span className="font-heading text-[9px] uppercase tracking-widest text-[var(--text-muted)] font-bold">Venta</span>
        <input
          type="number"
          min="0"
          value={precioVenta}
          onChange={(e) => onPrecioVentaChange(parseFloat(e.target.value) || 0)}
          className="w-24 text-right font-display text-base tracking-wide text-[var(--text-primary)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-2 py-0.5 focus:outline-none focus:border-[var(--accent-primary)]"
        />
      </div>
      <div className="flex items-center gap-1">
        <span className="font-heading text-[9px] uppercase tracking-widest text-[var(--text-muted)] font-bold">Prov.</span>
        <input
          type="number"
          min="0"
          value={precioProveedor}
          onChange={(e) => onPrecioProveedorChange(parseFloat(e.target.value) || 0)}
          className="w-24 text-right font-display text-base tracking-wide text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-2 py-0.5 focus:outline-none focus:border-[var(--accent-primary)]"
        />
      </div>
      <button
        type="button"
        onClick={() => onPrecioProveedorChange(Math.round(precioVenta * PORCENTAJE_PROVEEDOR))}
        className="btn-ghost text-xs py-1.5 w-full"
      >
        70% prov / 30% swap
        <span className="ml-1.5 text-[var(--accent-primary-light)]">
          → {formatCurrency(Math.round(precioVenta * PORCENTAJE_PROVEEDOR))}
        </span>
      </button>
    </div>
  )
}

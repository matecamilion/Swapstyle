'use client'

import { Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const PRESET_LETRAS = ['S', 'M', 'L', 'XL']
export const PRESET_NUMEROS = ['38', '40', '42', '44', '46']

export type FilaTalle = { talle: string; cantidad: string }

/** Unidades totales que representan las filas (una prenda por unidad). */
export function contarUnidades(talles: FilaTalle[]): number {
  return talles.reduce((sum, t) => sum + Math.max(parseInt(t.cantidad, 10) || 0, 0), 0)
}

interface Props {
  titulo: string
  talles: FilaTalle[]
  onChange: (talles: FilaTalle[]) => void
  error?: string
  /** Texto al pie; recibe la cantidad de unidades que se van a crear. */
  pie: (unidades: number) => string
}

/**
 * Filas [talle | cantidad] con accesos rápidos.
 * Compartido por "Nueva prenda" y por la sección "Agregar más talles"
 * del modal de edición.
 */
export function TallesEditor({ titulo, talles, onChange, error, pie }: Props) {
  const unidades = contarUnidades(talles)

  function agregarPreset(preset: string[]) {
    const yaCargados = new Set(talles.map((t) => t.talle.trim().toUpperCase()))
    const nuevos = preset
      .filter((t) => !yaCargados.has(t.toUpperCase()))
      .map((t) => ({ talle: t, cantidad: '1' }))
    onChange([...talles, ...nuevos])
  }

  function actualizarFila(index: number, campo: keyof FilaTalle, valor: string) {
    onChange(talles.map((t, i) => (i === index ? { ...t, [campo]: valor } : t)))
  }

  return (
    <div className="space-y-2 rounded-lg border border-[var(--border-subtle)] p-3">
      <div className="flex items-center justify-between">
        <Label>{titulo}</Label>
        <span className="text-[10px] font-heading uppercase tracking-wide text-[var(--text-muted)]">Opcional</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => agregarPreset(PRESET_LETRAS)} className="btn-ghost text-xs px-2.5 py-1">
          {PRESET_LETRAS.join(' ')}
        </button>
        <button type="button" onClick={() => agregarPreset(PRESET_NUMEROS)} className="btn-ghost text-xs px-2.5 py-1">
          {PRESET_NUMEROS.join(' ')}
        </button>
      </div>

      {talles.length > 0 && (
        <div className="space-y-2">
          {talles.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={t.talle}
                onChange={(e) => actualizarFila(i, 'talle', e.target.value)}
                placeholder="Talle"
                className="flex-1"
              />
              <Input
                type="number"
                min="1"
                step="1"
                value={t.cantidad}
                onChange={(e) => actualizarFila(i, 'cantidad', e.target.value)}
                className="w-20 text-right"
              />
              <button
                type="button"
                onClick={() => onChange(talles.filter((_, j) => j !== i))}
                aria-label={`Quitar talle ${t.talle || i + 1}`}
                className="text-[var(--text-muted)] hover:text-[var(--color-danger)] transition-colors p-1"
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => onChange([...talles, { talle: '', cantidad: '1' }])}
        className="btn-ghost text-xs w-full py-1.5 flex items-center justify-center"
      >
        <Plus size={13} className="mr-1.5" />
        Agregar talle
      </button>

      {error && <p className="text-[var(--color-danger)] text-xs">{error}</p>}

      <p className="text-[10px] font-heading uppercase tracking-wide text-[var(--text-muted)]">
        {pie(unidades)}
      </p>
    </div>
  )
}

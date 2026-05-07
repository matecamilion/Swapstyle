'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ProductoConProveedor, Proveedor } from '@/types/database'
import { formatCurrency } from '@/lib/format'

const CATEGORIAS = ['Remeras', 'Pantalones', 'Zapatillas', 'Accesorios', 'Sueter', 'Buzos', 'Camperas', 'Otro']
const PORCENTAJE_PROVEEDOR = 0.7

interface Props {
  open: boolean
  producto: ProductoConProveedor | null
  proveedores: Pick<Proveedor, 'id' | 'nombre'>[]
  existingCodigos: string[]
  onClose: () => void
  onSaved: (p: ProductoConProveedor) => void
}

function nextCodigo(existingCodigos: string[]): string {
  const nums = existingCodigos
    .map((c) => { const m = c.match(/^SW-(\d+)$/); return m ? parseInt(m[1], 10) : 0 })
    .filter((n) => n > 0)
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
  if (next > 999999) throw new Error('Se alcanzó el límite máximo de códigos SW-999999')
  return `SW-${String(next).padStart(6, '0')}`
}

export function ProductoModal({ open, producto, proveedores, existingCodigos, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    codigo: '',
    descripcion: '',
    categoria: '',
    proveedor_id: '',
    precio_venta: '',
    precio_proveedor: '',
  })
  const [proveedorSearch, setProveedorSearch] = useState('')
  const [proveedorOpen, setProveedorOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const proveedorRef = useRef<HTMLDivElement>(null)

  const proveedorSeleccionado = proveedores.find((p) => p.id === form.proveedor_id)
  const proveedoresFiltrados = proveedores.filter((p) =>
    p.nombre.toLowerCase().includes(proveedorSearch.toLowerCase())
  )

  useEffect(() => {
    if (producto) {
      setForm({
        codigo: producto.codigo,
        descripcion: producto.descripcion,
        categoria: producto.categoria ?? '',
        proveedor_id: producto.proveedor_id ?? '',
        precio_venta: String(producto.precio_venta),
        precio_proveedor: String(producto.precio_proveedor),
      })
      setProveedorSearch(producto.proveedores?.nombre ?? '')
    } else {
      setForm({
        codigo: nextCodigo(existingCodigos),
        descripcion: '',
        categoria: '',
        proveedor_id: '',
        precio_venta: '',
        precio_proveedor: '',
      })
      setProveedorSearch('')
    }
    setErrors({})
  }, [producto, open, existingCodigos])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (proveedorRef.current && !proveedorRef.current.contains(e.target as Node)) {
        setProveedorOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function aplicar7030() {
    const pv = parseFloat(form.precio_venta)
    if (!isNaN(pv) && pv > 0) {
      setForm((f) => ({ ...f, precio_proveedor: String(Math.round(pv * PORCENTAJE_PROVEEDOR)) }))
    }
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.descripcion.trim()) e.descripcion = 'La descripción es requerida'
    const pv = parseFloat(form.precio_venta)
    const pp = parseFloat(form.precio_proveedor)
    if (!form.precio_venta || isNaN(pv) || pv <= 0) e.precio_venta = 'Precio de venta inválido'
    if (!form.precio_proveedor || isNaN(pp) || pp <= 0) e.precio_proveedor = 'Precio de proveedor inválido'
    if (!isNaN(pv) && !isNaN(pp) && pp >= pv) e.precio_proveedor = 'El precio del proveedor debe ser menor al precio de venta'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    const payload = {
      codigo: form.codigo.trim().toUpperCase(),
      descripcion: form.descripcion.trim(),
      categoria: form.categoria || null,
      proveedor_id: form.proveedor_id || null,
      precio_venta: parseFloat(form.precio_venta),
      precio_proveedor: parseFloat(form.precio_proveedor),
    }

    try {
      if (producto) {
        const { data, error } = await supabase.from('productos').update(payload).eq('id', producto.id).select('*, proveedores(id, nombre)').single()
        if (error) throw error
        onSaved(data as ProductoConProveedor)
      } else {
        const { data, error } = await supabase.from('productos').insert({ ...payload, estado: 'disponible' }).select('*, proveedores(id, nombre)').single()
        if (error) throw error
        onSaved(data as ProductoConProveedor)
      }
    } catch (err: unknown) {
      toast.error(`No se pudo guardar: ${err instanceof Error ? err.message : 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  const pvNum = parseFloat(form.precio_venta)
  const ppNum = parseFloat(form.precio_proveedor)
  const porcentajeReal = !isNaN(pvNum) && pvNum > 0 && !isNaN(ppNum) && ppNum > 0
    ? Math.round((ppNum / pvNum) * 100)
    : null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[var(--bg-elevated)] border-[var(--border-strong)] text-[var(--text-primary)] max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl tracking-wide uppercase text-[var(--text-primary)]">
            {producto ? 'Editar prenda' : 'Nueva prenda'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Código (siempre readonly) + Categoría */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                value={form.codigo}
                readOnly
                tabIndex={-1}
                className="font-mono text-[var(--accent-primary-light)] font-bold opacity-70 cursor-default"
              />
              <p className="text-[var(--text-muted)] text-[10px] font-heading uppercase tracking-wide">Generado automáticamente</p>
            </div>
            <div className="space-y-1">
              <Label>Categoría</Label>
              <div className="w-full">
                <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v ?? '' })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccioná..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-1">
            <Label htmlFor="descripcion">Descripción *</Label>
            <Input
              id="descripcion"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />
            {errors.descripcion && <p className="text-[var(--color-danger)] text-xs">{errors.descripcion}</p>}
          </div>

          {/* Proveedor autocomplete */}
          <div className="space-y-1">
            <Label>Proveedor</Label>
            <div className="relative" ref={proveedorRef}>
              <input
                type="text"
                placeholder="Escribí para buscar proveedor..."
                value={proveedorSearch}
                onChange={(e) => {
                  setProveedorSearch(e.target.value)
                  setProveedorOpen(true)
                  if (!e.target.value) setForm((f) => ({ ...f, proveedor_id: '' }))
                }}
                onFocus={() => setProveedorOpen(true)}
                className="w-full"
                autoComplete="off"
              />
              {form.proveedor_id && proveedorSeleccionado && (
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-heading text-[11px] uppercase tracking-wide font-bold text-[var(--accent-primary-light)]">
                    ✓ {proveedorSeleccionado.nombre}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setForm((f) => ({ ...f, proveedor_id: '' })); setProveedorSearch('') }}
                    className="text-[var(--text-muted)] text-[10px] hover:text-[var(--color-danger)] transition-colors"
                  >
                    Quitar
                  </button>
                </div>
              )}
              {proveedorOpen && proveedorSearch.length > 0 && !form.proveedor_id && (
                <div
                  className="absolute z-50 mt-1 w-full rounded-lg border border-[var(--border-default)] overflow-y-auto max-h-48"
                  style={{ background: 'var(--bg-elevated)' }}
                >
                  {proveedoresFiltrados.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-[var(--text-muted)]">Sin resultados</div>
                  ) : (
                    proveedoresFiltrados.map((pv) => (
                      <button
                        key={pv.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[rgba(124,58,237,0.12)] transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setForm((f) => ({ ...f, proveedor_id: pv.id }))
                          setProveedorSearch(pv.nombre)
                          setProveedorOpen(false)
                        }}
                      >
                        {pv.nombre}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Precios + 70/30 */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="precio_venta">Precio de venta *</Label>
                <Input
                  id="precio_venta"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.precio_venta}
                  onChange={(e) => setForm({ ...form, precio_venta: e.target.value })}
                />
                {errors.precio_venta && <p className="text-[var(--color-danger)] text-xs">{errors.precio_venta}</p>}
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="precio_proveedor">Precio proveedor *</Label>
                  {porcentajeReal !== null && (
                    <span className="text-[10px] font-heading font-bold uppercase tracking-wide text-[var(--text-muted)]">
                      {porcentajeReal}%
                    </span>
                  )}
                </div>
                <Input
                  id="precio_proveedor"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.precio_proveedor}
                  onChange={(e) => setForm({ ...form, precio_proveedor: e.target.value })}
                />
                {errors.precio_proveedor && <p className="text-[var(--color-danger)] text-xs">{errors.precio_proveedor}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={aplicar7030}
              disabled={!form.precio_venta || isNaN(parseFloat(form.precio_venta))}
              className="btn-ghost text-xs w-full py-1.5"
            >
              Aplicar 70% proveedor / 30% Swapstyle
              {form.precio_venta && !isNaN(pvNum) && pvNum > 0 && (
                <span className="ml-2 text-[var(--accent-primary-light)]">
                  → {formatCurrency(Math.round(pvNum * PORCENTAJE_PROVEEDOR))}
                </span>
              )}
            </button>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

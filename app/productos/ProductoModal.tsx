'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { crearPrendas } from './actions'
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
const PRESET_LETRAS = ['S', 'M', 'L', 'XL']
const PRESET_NUMEROS = ['38', '40', '42', '44', '46']

type FilaTalle = { talle: string; cantidad: string }

interface Props {
  open: boolean
  producto: ProductoConProveedor | null
  proveedores: Pick<Proveedor, 'id' | 'nombre'>[]
  existingCodigos: string[]
  onClose: () => void
  onSaved: (productos: ProductoConProveedor[]) => void
}

function nextNumero(existingCodigos: string[]): number {
  const nums = existingCodigos
    .map((c) => { const m = c.match(/^SW-(\d+)$/); return m ? parseInt(m[1], 10) : 0 })
    .filter((n) => n > 0)
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
  if (next > 999999) throw new Error('Se alcanzó el límite máximo de códigos SW-999999')
  return next
}

function formatCodigo(n: number): string {
  return `SW-${String(n).padStart(6, '0')}`
}

/** Vista previa del código (o del rango). El correlativo final lo asigna el servidor. */
function previewCodigos(existingCodigos: string[], cantidad: number): string {
  const desde = nextNumero(existingCodigos)
  if (cantidad <= 1) return formatCodigo(desde)
  return `${formatCodigo(desde)} → ${formatCodigo(desde + cantidad - 1)}`
}

export function ProductoModal({ open, producto, proveedores, existingCodigos, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    descripcion: '',
    categoria: '',
    talle: '',
    proveedor_id: '',
    precio_venta: '',
    precio_proveedor: '',
  })
  const [talles, setTalles] = useState<FilaTalle[]>([])
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
        descripcion: producto.descripcion,
        categoria: producto.categoria ?? '',
        talle: producto.talle ?? '',
        proveedor_id: producto.proveedor_id ?? '',
        precio_venta: String(producto.precio_venta),
        precio_proveedor: String(producto.precio_proveedor),
      })
      setProveedorSearch(producto.proveedores?.nombre ?? '')
    } else {
      setForm({
        descripcion: '',
        categoria: '',
        talle: '',
        proveedor_id: '',
        precio_venta: '',
        precio_proveedor: '',
      })
      setProveedorSearch('')
    }
    setTalles([])
    setErrors({})
  }, [producto, open])

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

  function agregarFila(talle = '') {
    setTalles((prev) => [...prev, { talle, cantidad: '1' }])
  }

  function agregarPreset(preset: string[]) {
    setTalles((prev) => {
      const yaCargados = new Set(prev.map((t) => t.talle.trim().toUpperCase()))
      const nuevos = preset
        .filter((t) => !yaCargados.has(t.toUpperCase()))
        .map((t) => ({ talle: t, cantidad: '1' }))
      return [...prev, ...nuevos]
    })
  }

  function actualizarFila(index: number, campo: keyof FilaTalle, valor: string) {
    setTalles((prev) => prev.map((t, i) => (i === index ? { ...t, [campo]: valor } : t)))
  }

  function quitarFila(index: number) {
    setTalles((prev) => prev.filter((_, i) => i !== index))
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.descripcion.trim()) e.descripcion = 'La descripción es requerida'
    const pv = parseFloat(form.precio_venta)
    const pp = parseFloat(form.precio_proveedor)
    if (!form.precio_venta || isNaN(pv) || pv <= 0) e.precio_venta = 'Precio de venta inválido'
    if (!form.precio_proveedor || isNaN(pp) || pp <= 0) e.precio_proveedor = 'Precio de proveedor inválido'
    if (!isNaN(pv) && !isNaN(pp) && pp >= pv) e.precio_proveedor = 'El precio del proveedor debe ser menor al precio de venta'
    if (!producto) {
      if (talles.some((t) => !t.talle.trim())) e.talles = 'Completá el talle o quitá la fila'
      else if (talles.some((t) => !(parseInt(t.cantidad, 10) >= 1))) e.talles = 'La cantidad debe ser al menos 1'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    const payload = {
      descripcion: form.descripcion.trim(),
      categoria: form.categoria || null,
      proveedor_id: form.proveedor_id || null,
      precio_venta: parseFloat(form.precio_venta),
      precio_proveedor: parseFloat(form.precio_proveedor),
    }

    try {
      if (producto) {
        const { data, error } = await supabase
          .from('productos')
          .update({ ...payload, talle: form.talle.trim() || null })
          .eq('id', producto.id)
          .select('*, proveedores(id, nombre)')
          .single()
        if (error) throw error
        onSaved([data as ProductoConProveedor])
      } else {
        // Códigos correlativos + insert atómico del lote: todo del lado del servidor
        const creados = await crearPrendas({
          ...payload,
          talles: talles.map((t) => ({ talle: t.talle, cantidad: parseInt(t.cantidad, 10) })),
        })
        onSaved(creados)
      }
    } catch (err: unknown) {
      toast.error(`No se pudo guardar: ${err instanceof Error ? err.message : 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  const totalUnidades = talles.length === 0
    ? 1
    : talles.reduce((sum, t) => sum + Math.max(parseInt(t.cantidad, 10) || 0, 0), 0)

  const pvNum = parseFloat(form.precio_venta)
  const ppNum = parseFloat(form.precio_proveedor)
  const porcentajeReal = !isNaN(pvNum) && pvNum > 0 && !isNaN(ppNum) && ppNum > 0
    ? Math.round((ppNum / pvNum) * 100)
    : null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[var(--bg-elevated)] border-[var(--border-strong)] text-[var(--text-primary)] max-w-lg max-h-[90vh] overflow-y-auto">
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
                value={producto ? producto.codigo : previewCodigos(existingCodigos, totalUnidades)}
                readOnly
                tabIndex={-1}
                className="font-mono text-[var(--accent-primary-light)] font-bold opacity-70 cursor-default"
              />
              <p className="text-[var(--text-muted)] text-[10px] font-heading uppercase tracking-wide">
                {producto
                  ? 'Generado automáticamente'
                  : totalUnidades > 1
                    ? `Rango para ${totalUnidades} prendas`
                    : 'Generado automáticamente'}
              </p>
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

          {/* Talles */}
          {producto ? (
            <div className="space-y-1">
              <Label htmlFor="talle">Talle</Label>
              <Input
                id="talle"
                value={form.talle}
                onChange={(e) => setForm({ ...form, talle: e.target.value })}
                placeholder="Sin talle"
              />
            </div>
          ) : (
            <div className="space-y-2 rounded-lg border border-[var(--border-subtle)] p-3">
              <div className="flex items-center justify-between">
                <Label>Talles</Label>
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
                        onClick={() => quitarFila(i)}
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
                onClick={() => agregarFila()}
                className="btn-ghost text-xs w-full py-1.5 flex items-center justify-center"
              >
                <Plus size={13} className="mr-1.5" />
                Agregar talle
              </button>

              {errors.talles && <p className="text-[var(--color-danger)] text-xs">{errors.talles}</p>}

              <p className="text-[10px] font-heading uppercase tracking-wide text-[var(--text-muted)]">
                {talles.length === 0
                  ? 'Sin talles: se crea 1 prenda sin talle'
                  : `Se crearán ${totalUnidades} prenda${totalUnidades !== 1 ? 's' : ''}, una por unidad`}
              </p>
            </div>
          )}

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
              {loading
                ? 'Guardando...'
                : producto
                  ? 'Guardar'
                  : `Guardar ${totalUnidades} prenda${totalUnidades !== 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

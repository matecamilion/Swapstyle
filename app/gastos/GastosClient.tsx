'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Gasto } from '@/types/database'

const CATEGORIAS = ['Alquiler', 'Servicios', 'Insumos', 'Marketing', 'Sueldos', 'Mantenimiento', 'Otros']

interface Props {
  gastos: Gasto[]
}

const formVacio = () => ({
  descripcion: '',
  monto: '',
  fecha: new Date().toISOString().split('T')[0],
  categoria: '',
})

export function GastosClient({ gastos: initialGastos }: Props) {
  const router = useRouter()
  const [gastos, setGastos] = useState(initialGastos)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Gasto | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Gasto | null>(null)
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [form, setForm] = useState(formVacio())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const categorias = [...new Set(gastos.map((g) => g.categoria).filter(Boolean))] as string[]

  const filtrados = gastos.filter((g) => {
    const matchCat = filtroCategoria === 'todas' || g.categoria === filtroCategoria
    const matchDesde = !fechaDesde || g.fecha >= fechaDesde
    const matchHasta = !fechaHasta || g.fecha <= fechaHasta
    return matchCat && matchDesde && matchHasta
  })

  const total = filtrados.reduce((sum, g) => sum + g.monto, 0)

  function abrirNuevo() {
    setEditando(null)
    setForm(formVacio())
    setErrors({})
    setModalOpen(true)
  }

  function abrirEditar(g: Gasto) {
    setEditando(g)
    setForm({
      descripcion: g.descripcion,
      monto: String(g.monto),
      fecha: g.fecha,
      categoria: g.categoria ?? '',
    })
    setErrors({})
    setModalOpen(true)
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.descripcion.trim()) e.descripcion = 'La descripción es requerida'
    const monto = parseFloat(form.monto)
    if (!form.monto || isNaN(monto) || monto <= 0) e.monto = 'El monto debe ser mayor a 0'
    if (!form.fecha) e.fecha = 'La fecha es requerida'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    const payload = {
      descripcion: form.descripcion.trim(),
      monto: parseFloat(form.monto),
      fecha: form.fecha,
      categoria: form.categoria || null,
    }

    if (editando) {
      const { data, error } = await supabase.from('gastos').update(payload).eq('id', editando.id).select().single()
      if (error) {
        toast.error(`Error al actualizar: ${error.message}`)
      } else {
        setGastos((prev) => prev.map((g) => g.id === editando.id ? data as Gasto : g))
        setModalOpen(false)
        router.refresh()
        toast.success('Gasto actualizado')
      }
    } else {
      const { data, error } = await supabase.from('gastos').insert(payload).select().single()
      if (error) {
        toast.error(`Error al guardar: ${error.message}`)
      } else {
        setGastos((prev) => [data as Gasto, ...prev])
        setModalOpen(false)
        setForm(formVacio())
        router.refresh()
        toast.success('Gasto registrado')
      }
    }
    setLoading(false)
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    const { error } = await supabase.from('gastos').delete().eq('id', confirmDelete.id)
    if (error) {
      toast.error(`Error al eliminar: ${error.message}`)
    } else {
      setGastos((prev) => prev.filter((g) => g.id !== confirmDelete.id))
      router.refresh()
      toast.success('Gasto eliminado')
    }
    setDeleting(false)
    setConfirmDelete(null)
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="font-heading text-[11px] uppercase tracking-widest font-bold text-[var(--text-muted)]">Desde</span>
          <Input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="w-36"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-heading text-[11px] uppercase tracking-widest font-bold text-[var(--text-muted)]">Hasta</span>
          <Input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="w-36"
          />
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
        <button onClick={abrirNuevo} className="btn-primary ml-auto flex items-center">
          <Plus size={16} className="mr-2" />
          Nuevo gasto
        </button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="font-heading uppercase tracking-widest text-[11px] font-bold text-[var(--text-muted)]">
          {filtrados.length} gasto{filtrados.length !== 1 ? 's' : ''}
        </p>
        <div className="text-sm text-[var(--text-muted)] font-bold">
          Total:{' '}
          <span className="text-[var(--color-danger)] font-display text-2xl tracking-wide align-middle">{formatCurrency(total)}</span>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--border-subtle)] hover:bg-transparent">
              <TableHead>Fecha</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="hidden sm:table-cell">Categoría</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Acc.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-[var(--text-muted)] py-12">
                  No hay gastos registrados
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="text-[var(--text-secondary)]">{formatDate(g.fecha)}</TableCell>
                  <TableCell className="text-[var(--text-primary)]">{g.descripcion}</TableCell>
                  <TableCell className="text-[var(--text-secondary)] hidden sm:table-cell">{g.categoria ?? '—'}</TableCell>
                  <TableCell className="text-right text-[var(--text-primary)] font-bold">{formatCurrency(g.monto)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => abrirEditar(g)}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(g)}
                        className="text-[var(--text-muted)] hover:text-[var(--color-danger)] transition-colors p-1"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal crear / editar */}
      <Dialog open={modalOpen} onOpenChange={(v) => !v && setModalOpen(false)}>
        <DialogContent className="bg-[var(--bg-elevated)] border-[var(--border-strong)] text-[var(--text-primary)] max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl tracking-wide uppercase text-[var(--text-primary)]">
              {editando ? 'Editar gasto' : 'Nuevo gasto'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label htmlFor="descripcion">Descripción *</Label>
              <Textarea
                id="descripcion"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                className="resize-none"
                rows={2}
              />
              {errors.descripcion && <p className="text-[var(--color-danger)] text-xs">{errors.descripcion}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="monto">Monto *</Label>
                <Input
                  id="monto"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.monto}
                  onChange={(e) => setForm({ ...form, monto: e.target.value })}
                />
                {errors.monto && <p className="text-[var(--color-danger)] text-xs">{errors.monto}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="fecha">Fecha *</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                />
                {errors.fecha && <p className="text-[var(--color-danger)] text-xs">{errors.fecha}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Categoría</Label>
              <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v ?? '' })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin categoría" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost flex-1">Cancelar</button>
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? 'Guardando...' : editando ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal confirmar eliminación */}
      <Dialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <DialogContent className="bg-[var(--bg-elevated)] border-[var(--border-strong)] text-[var(--text-primary)] max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wide uppercase text-[var(--color-danger)]">
              Eliminar gasto
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <p className="text-[var(--text-secondary)]">
              ¿Confirmás que querés eliminar el gasto <strong className="text-[var(--text-primary)]">"{confirmDelete?.descripcion}"</strong> por <strong className="text-[var(--color-danger)]">{formatCurrency(confirmDelete?.monto ?? 0)}</strong>?
            </p>
            <p className="text-[var(--text-muted)] text-xs font-heading uppercase tracking-wide">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost flex-1">Cancelar</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 font-heading text-[13px] font-bold uppercase tracking-wide px-5 py-2.5 rounded-md border-none cursor-pointer transition-all"
                style={{ background: 'var(--color-danger)', color: 'white' }}
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

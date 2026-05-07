'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Proveedor } from '@/types/database'

interface Props {
  open: boolean
  proveedor: Proveedor | null
  onClose: () => void
  onSaved: (p: Proveedor) => void
}

export function ProveedorModal({ open, proveedor, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    email: '',
    observaciones: '',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (proveedor) {
      setForm({
        nombre: proveedor.nombre,
        telefono: proveedor.telefono ?? '',
        email: proveedor.email ?? '',
        observaciones: proveedor.observaciones ?? '',
      })
    } else {
      setForm({ nombre: '', telefono: '', email: '', observaciones: '' })
    }
    setErrors({})
  }, [proveedor, open])

  function validate() {
    const e: Record<string, string> = {}
    if (!form.nombre.trim()) e.nombre = 'El nombre es requerido'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Email inválido'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    const payload = {
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim() || null,
      email: form.email.trim() || null,
      observaciones: form.observaciones.trim() || null,
    }

    try {
      if (proveedor) {
        const { data, error } = await supabase
          .from('proveedores')
          .update(payload)
          .eq('id', proveedor.id)
          .select()
          .single()
        if (error) throw error
        onSaved(data as Proveedor)
      } else {
        const { data, error } = await supabase
          .from('proveedores')
          .insert(payload)
          .select()
          .single()
        if (error) throw error
        onSaved(data as Proveedor)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      toast.error(`No se pudo guardar: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[var(--bg-elevated)] border-[var(--border-strong)] text-[var(--text-primary)] max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl tracking-wide uppercase text-[var(--text-primary)]">{proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
            {errors.nombre && <p className="text-[var(--color-danger)] text-xs">{errors.nombre}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            {errors.email && <p className="text-[var(--color-danger)] text-xs">{errors.email}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              className="resize-none"
              rows={3}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost flex-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

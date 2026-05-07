'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Search, Pencil, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ProveedorModal } from './ProveedorModal'
import type { Proveedor } from '@/types/database'

type ProveedorConConteo = Proveedor & { prendas_activas: number }

interface Props {
  proveedores: ProveedorConConteo[]
}

export function ProveedoresClient({ proveedores: initialProveedores }: Props) {
  const router = useRouter()
  const [proveedores, setProveedores] = useState(initialProveedores)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Proveedor | null>(null)

  const filtrados = proveedores.filter((p) => {
    const q = search.toLowerCase()
    return (
      p.nombre.toLowerCase().includes(q) ||
      (p.telefono?.toLowerCase().includes(q) ?? false) ||
      (p.email?.toLowerCase().includes(q) ?? false)
    )
  })

  function handleSaved(proveedor: Proveedor) {
    setProveedores((prev) => {
      const existe = prev.find((p) => p.id === proveedor.id)
      if (existe) return prev.map((p) => p.id === proveedor.id ? { ...p, ...proveedor } : p)
      return [...prev, { ...proveedor, prendas_activas: 0 }]
    })
    setModalOpen(false)
    setEditando(null)
    router.refresh()
    toast.success(editando ? 'Proveedor actualizado' : 'Proveedor creado')
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
          <Input
            placeholder="Buscar por nombre, teléfono o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <button
          onClick={() => { setEditando(null); setModalOpen(true) }}
          className="btn-primary flex items-center"
        >
          <Plus size={16} className="mr-2" />
          Nuevo proveedor
        </button>
      </div>

      <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--border-subtle)] hover:bg-transparent">
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="text-center">Prendas activas</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-[var(--text-muted)] py-12">
                  No hay proveedores registrados
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-[var(--text-primary)]">{p.nombre}</TableCell>
                  <TableCell className="text-[var(--text-secondary)] hidden sm:table-cell">{p.telefono ?? '—'}</TableCell>
                  <TableCell className="text-[var(--text-secondary)] hidden md:table-cell">{p.email ?? '—'}</TableCell>
                  <TableCell className="text-center text-[var(--text-secondary)]">{p.prendas_activas}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/proveedores/${p.id}`}
                        className="text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors p-1"
                        title="Ver detalle"
                      >
                        <ExternalLink size={15} />
                      </Link>
                      <button
                        onClick={() => { setEditando(p); setModalOpen(true) }}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProveedorModal
        open={modalOpen}
        proveedor={editando}
        onClose={() => { setModalOpen(false); setEditando(null) }}
        onSaved={handleSaved}
      />
    </>
  )
}

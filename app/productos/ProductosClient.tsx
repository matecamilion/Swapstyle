'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Search, Pencil } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProductoModal } from './ProductoModal'
import { formatCurrency } from '@/lib/format'
import type { ProductoConProveedor, Proveedor } from '@/types/database'

interface Props {
  productos: ProductoConProveedor[]
  proveedores: Pick<Proveedor, 'id' | 'nombre'>[]
}

export function ProductosClient({ productos: initialProductos, proveedores }: Props) {
  const router = useRouter()
  const [productos, setProductos] = useState(initialProductos)
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'disponible' | 'vendido'>('todos')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<ProductoConProveedor | null>(null)

  const categorias = [...new Set(productos.map((p) => p.categoria).filter(Boolean))] as string[]

  const filtrados = productos.filter((p) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      p.codigo.toLowerCase().includes(q) ||
      p.descripcion.toLowerCase().includes(q) ||
      (p.proveedores?.nombre?.toLowerCase().includes(q) ?? false) ||
      (p.categoria?.toLowerCase().includes(q) ?? false)
    const matchEstado = filtroEstado === 'todos' || p.estado === filtroEstado
    const matchCategoria = filtroCategoria === 'todos' || p.categoria === filtroCategoria
    return matchSearch && matchEstado && matchCategoria
  })

  function handleSaved(producto: ProductoConProveedor) {
    setProductos((prev) => {
      const existe = prev.find((p) => p.id === producto.id)
      if (existe) return prev.map((p) => (p.id === producto.id ? producto : p))
      return [producto, ...prev]
    })
    setModalOpen(false)
    setEditando(null)
    router.refresh()
    toast.success(editando ? 'Prenda actualizada' : 'Prenda creada')
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
          <Input
            placeholder="Buscar por código, descripción, proveedor o categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="w-36">
          <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado((v ?? 'todos') as typeof filtroEstado)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="disponible">Disponible</SelectItem>
              <SelectItem value="vendido">Vendido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {categorias.length > 0 && (
          <div className="w-44">
            <Select value={filtroCategoria} onValueChange={(v) => setFiltroCategoria(v ?? 'todos')}>
              <SelectTrigger>
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las categorías</SelectItem>
                {categorias.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <button
          onClick={() => { setEditando(null); setModalOpen(true) }}
          className="btn-primary ml-auto flex items-center"
        >
          <Plus size={16} className="mr-2" />
          Nueva prenda
        </button>
      </div>

      <p className="font-heading uppercase tracking-widest text-[11px] font-bold text-[var(--text-muted)] mb-3">
        {filtrados.length} prenda{filtrados.length !== 1 ? 's' : ''}
      </p>

      <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--border-subtle)] hover:bg-transparent">
              <TableHead>Código</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="hidden sm:table-cell">Categoría</TableHead>
              <TableHead className="hidden md:table-cell">Proveedor</TableHead>
              <TableHead className="text-right">P. Venta</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-right">Acc.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-[var(--text-muted)] py-12">
                  No hay prendas que coincidan
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-heading text-[12px] uppercase tracking-wider text-[var(--accent-primary-light)] font-bold">{p.codigo}</TableCell>
                  <TableCell className="text-[var(--text-primary)] max-w-[180px] truncate">{p.descripcion}</TableCell>
                  <TableCell className="text-[var(--text-secondary)] hidden sm:table-cell">{p.categoria ?? '—'}</TableCell>
                  <TableCell className="text-[var(--text-secondary)] hidden md:table-cell">{p.proveedores?.nombre ?? '—'}</TableCell>
                  <TableCell className="text-right text-[var(--text-primary)] font-bold">{formatCurrency(p.precio_venta)}</TableCell>
                  <TableCell className="text-center">
                    <span className={p.estado === 'disponible' ? 'badge-disponible inline-block' : 'badge-vendido inline-block'}>
                      {p.estado}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {p.estado === 'disponible' && (
                      <button
                        onClick={() => { setEditando(p); setModalOpen(true) }}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProductoModal
        open={modalOpen}
        producto={editando}
        proveedores={proveedores}
        existingCodigos={productos.map((p) => p.codigo)}
        onClose={() => { setModalOpen(false); setEditando(null) }}
        onSaved={handleSaved}
      />
    </>
  )
}

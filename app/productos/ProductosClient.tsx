'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Search, Pencil, ShoppingBag, Trash2 } from 'lucide-react'
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
import { VenderPrendaModal } from './VenderPrendaModal'
import { EliminarPrendaDialog, type ModoEliminacion } from './EliminarPrendaDialog'
import { formatCurrency } from '@/lib/format'
import type { ProductoConProveedor, Proveedor } from '@/types/database'

interface Props {
  productos: ProductoConProveedor[]
  proveedores: Pick<Proveedor, 'id' | 'nombre'>[]
  /** Todos los códigos, incluidos los de prendas ocultas */
  todosLosCodigos: string[]
}

export function ProductosClient({ productos: initialProductos, proveedores, todosLosCodigos }: Props) {
  const router = useRouter()
  const [productos, setProductos] = useState(initialProductos)
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'disponible' | 'vendido'>('todos')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos')
  const [filtroTalle, setFiltroTalle] = useState<string>('todos')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<ProductoConProveedor | null>(null)
  const [vendiendo, setVendiendo] = useState<ProductoConProveedor | null>(null)
  const [eliminando, setEliminando] = useState<ProductoConProveedor | null>(null)

  const categorias = [...new Set(productos.map((p) => p.categoria).filter(Boolean))] as string[]
  const talles = [...new Set(productos.map((p) => p.talle).filter(Boolean))] as string[]

  const filtrados = productos.filter((p) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      p.codigo.toLowerCase().includes(q) ||
      p.descripcion.toLowerCase().includes(q) ||
      (p.proveedores?.nombre?.toLowerCase().includes(q) ?? false) ||
      (p.categoria?.toLowerCase().includes(q) ?? false) ||
      (p.talle?.toLowerCase().includes(q) ?? false)
    const matchEstado = filtroEstado === 'todos' || p.estado === filtroEstado
    const matchCategoria = filtroCategoria === 'todos' || p.categoria === filtroCategoria
    const matchTalle = filtroTalle === 'todos' || p.talle === filtroTalle
    return matchSearch && matchEstado && matchCategoria && matchTalle
  })

  function handleSaved(guardados: ProductoConProveedor[]) {
    setProductos((prev) => {
      let next = prev
      for (const producto of guardados) {
        const existe = next.find((p) => p.id === producto.id)
        next = existe
          ? next.map((p) => (p.id === producto.id ? producto : p))
          : [producto, ...next]
      }
      return next
    })
    const editado = editando !== null
    // En edición el primer elemento es la prenda editada; el resto son nuevas.
    const creadas = editado ? guardados.length - 1 : guardados.length
    setModalOpen(false)
    setEditando(null)
    router.refresh()
    toast.success(
      editado && creadas === 0
        ? 'Prenda actualizada'
        : editado
          ? `Prenda actualizada y ${creadas} prenda${creadas !== 1 ? 's' : ''} creada${creadas !== 1 ? 's' : ''}`
          : `${creadas} prenda${creadas !== 1 ? 's' : ''} creada${creadas !== 1 ? 's' : ''}`,
    )
  }

  function handleEliminado(producto: ProductoConProveedor, modo: ModoEliminacion) {
    setProductos((prev) => prev.filter((p) => p.id !== producto.id))
    setEliminando(null)
    setModalOpen(false)
    setEditando(null)
    router.refresh()
    toast.success(
      modo === 'oculto'
        ? `${producto.codigo} quitada del listado`
        : `${producto.codigo} eliminada definitivamente`,
    )
  }

  function handleVendido(producto: ProductoConProveedor) {
    setProductos((prev) => prev.map((p) => (p.id === producto.id ? producto : p)))
    setVendiendo(null)
    router.refresh()
    toast.success(`${producto.codigo} marcada como vendida`)
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
          <Input
            placeholder="Buscar por código, descripción, talle, proveedor o categoría..."
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

        {talles.length > 0 && (
          <div className="w-32">
            <Select value={filtroTalle} onValueChange={(v) => setFiltroTalle(v ?? 'todos')}>
              <SelectTrigger>
                <SelectValue placeholder="Talle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los talles</SelectItem>
                {talles.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
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
              <TableHead>Talle</TableHead>
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
                <TableCell colSpan={8} className="text-center text-[var(--text-muted)] py-12">
                  No hay prendas que coincidan
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-heading text-[12px] uppercase tracking-wider text-[var(--accent-primary-light)] font-bold">{p.codigo}</TableCell>
                  <TableCell className="text-[var(--text-primary)] max-w-[180px] truncate">{p.descripcion}</TableCell>
                  <TableCell className="text-[var(--text-secondary)]">{p.talle ?? '—'}</TableCell>
                  <TableCell className="text-[var(--text-secondary)] hidden sm:table-cell">{p.categoria ?? '—'}</TableCell>
                  <TableCell className="text-[var(--text-secondary)] hidden md:table-cell">{p.proveedores?.nombre ?? '—'}</TableCell>
                  <TableCell className="text-right text-[var(--text-primary)] font-bold">{formatCurrency(p.precio_venta)}</TableCell>
                  <TableCell className="text-center">
                    <span className={p.estado === 'disponible' ? 'badge-disponible inline-block' : 'badge-vendido inline-block'}>
                      {p.estado}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {p.estado === 'disponible' && (
                        <>
                          <button
                            onClick={() => setVendiendo(p)}
                            title="Marcar como vendido"
                            className="btn-ghost text-[10px] font-heading uppercase tracking-wider font-bold px-2 py-1 flex items-center"
                          >
                            <ShoppingBag size={13} className="mr-1" />
                            Vendido
                          </button>
                          <button
                            onClick={() => { setEditando(p); setModalOpen(true) }}
                            title="Editar prenda"
                            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
                          >
                            <Pencil size={15} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setEliminando(p)}
                        title="Eliminar prenda"
                        className="text-[var(--text-muted)] hover:text-[var(--color-danger)] transition-colors p-1"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
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
        existingCodigos={[...todosLosCodigos, ...productos.map((p) => p.codigo)]}
        onClose={() => { setModalOpen(false); setEditando(null) }}
        onSaved={handleSaved}
        onEliminar={(p) => setEliminando(p)}
      />

      <VenderPrendaModal
        open={vendiendo !== null}
        producto={vendiendo}
        onClose={() => setVendiendo(null)}
        onVendido={handleVendido}
      />

      <EliminarPrendaDialog
        open={eliminando !== null}
        producto={eliminando}
        onClose={() => setEliminando(null)}
        onEliminado={handleEliminado}
      />
    </>
  )
}

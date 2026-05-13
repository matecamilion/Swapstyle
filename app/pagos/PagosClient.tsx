'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Check, Search, Download } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/format'
import { exportToExcel, fmtDateExcel } from '@/lib/exportExcel'
import type { PagoConDetalles, Proveedor } from '@/types/database'

interface Props {
  pagos: PagoConDetalles[]
}

export function PagosClient({ pagos: initialPagos }: Props) {
  const router = useRouter()
  const [pagos, setPagos] = useState(initialPagos)
  const [search, setSearch] = useState('')
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState('pendientes')

  async function marcarPagado(id: string) {
    setMarkingIds((prev) => new Set(prev).add(id))
    const { error } = await supabase
      .from('pagos_proveedores')
      .update({ estado: 'pagado', fecha_pago: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      toast.error(`Error al marcar como pagado: ${error.message}`)
    } else {
      setPagos((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, estado: 'pagado', fecha_pago: new Date().toISOString() } : p
        )
      )
      toast.success('Pago registrado')
      router.refresh()
    }
    setMarkingIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  async function marcarTodosPagados(proveedorId: string) {
    const pendientes = pagos.filter(
      (p) => p.proveedor_id === proveedorId && p.estado === 'pendiente'
    )
    if (pendientes.length === 0) return

    const ids = pendientes.map((p) => p.id)
    ids.forEach((id) => setMarkingIds((prev) => new Set(prev).add(id)))

    const { error } = await supabase
      .from('pagos_proveedores')
      .update({ estado: 'pagado', fecha_pago: new Date().toISOString() })
      .in('id', ids)

    if (error) {
      toast.error(`Error: ${error.message}`)
    } else {
      const ahora = new Date().toISOString()
      setPagos((prev) =>
        prev.map((p) =>
          ids.includes(p.id) ? { ...p, estado: 'pagado', fecha_pago: ahora } : p
        )
      )
      toast.success(`${pendientes.length} pago${pendientes.length !== 1 ? 's' : ''} registrado${pendientes.length !== 1 ? 's' : ''}`)
      router.refresh()
    }

    ids.forEach((id) => setMarkingIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    }))
  }

  function filtrar(lista: PagoConDetalles[]) {
    const q = search.toLowerCase()
    return lista.filter((p) =>
      !q ||
      p.proveedores?.nombre.toLowerCase().includes(q) ||
      p.productos?.codigo.toLowerCase().includes(q) ||
      p.productos?.descripcion.toLowerCase().includes(q)
    )
  }

  const pendientes = filtrar(pagos.filter((p) => p.estado === 'pendiente'))
  const pagados = filtrar(pagos.filter((p) => p.estado === 'pagado'))
  const todos = filtrar(pagos)

  // Agrupar pendientes por proveedor
  const pendientesPorProveedor = pendientes.reduce<Record<string, { nombre: string; pagos: PagoConDetalles[]; total: number }>>((acc, p) => {
    const id = p.proveedor_id
    if (!acc[id]) {
      acc[id] = {
        nombre: p.proveedores?.nombre ?? 'Sin proveedor',
        pagos: [],
        total: 0,
      }
    }
    acc[id].pagos.push(p)
    acc[id].total += p.monto
    return acc
  }, {})

  const totalPendiente = pendientes.reduce((sum, p) => sum + p.monto, 0)

  async function exportPagos() {
    const listaExport = activeTab === 'pendientes' ? pendientes : activeTab === 'pagados' ? pagados : todos
    if (listaExport.length === 0) return

    const rows = listaExport.map((p) => ({
      'Proveedor': p.proveedores?.nombre ?? '—',
      'Código Producto': p.productos?.codigo ?? '—',
      'Producto': p.productos?.descripcion ?? '—',
      'Monto': p.monto,
      'Fecha Venta': fmtDateExcel(p.fecha_venta),
      'Estado': p.estado === 'pendiente' ? 'Pendiente' : 'Pagado',
      'Fecha Pago': p.fecha_pago ? fmtDateExcel(p.fecha_pago) : '—',
    }))

    const hoyStr = new Date().toISOString().split('T')[0]
    const hoyExport = fmtDateExcel(new Date().toISOString())
    await exportToExcel(rows, `pagos_proveedores_${hoyStr}`, {
      title: 'PAGOS A PROVEEDORES',
      subtitle: `Exportado el ${hoyExport}`,
      sheetName: 'Pagos',
      moneyColumns: ['Monto'],
      statusColumn: 'Estado',
    })
  }

  function PagoRow({ pago, showAction }: { pago: PagoConDetalles; showAction: boolean }) {
    return (
      <TableRow>
        <TableCell className="text-[var(--text-primary)] font-medium">{pago.proveedores?.nombre ?? '—'}</TableCell>
        <TableCell>
          <div>
            <p className="font-heading font-bold text-[12px] tracking-wider uppercase text-[var(--accent-primary-light)]">{pago.productos?.codigo}</p>
            <p className="text-[var(--text-secondary)] text-sm">{pago.productos?.descripcion}</p>
          </div>
        </TableCell>
        <TableCell className="text-[var(--text-primary)] font-bold">{formatCurrency(pago.monto)}</TableCell>
        <TableCell className="text-[var(--text-secondary)]">{formatDate(pago.fecha_venta)}</TableCell>
        <TableCell>
          <span
            className={
              pago.estado === 'pendiente'
                ? 'badge-pendiente inline-block'
                : 'badge-pagado inline-block'
            }
          >
            {pago.estado}
          </span>
        </TableCell>
        <TableCell className="text-right">
          {showAction && pago.estado === 'pendiente' && (
            <button
              disabled={markingIds.has(pago.id)}
              onClick={() => marcarPagado(pago.id)}
              className="btn-ghost text-xs p-1 px-3"
            >
              <Check size={13} className="mr-1 inline-block" />
              {markingIds.has(pago.id) ? 'Guardando...' : 'Marcar pagado'}
            </button>
          )}
          {pago.estado === 'pagado' && pago.fecha_pago && (
            <span className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wide">{formatDate(pago.fecha_pago)}</span>
          )}
        </TableCell>
      </TableRow>
    )
  }

  function TableConPagos({ lista, showAction }: { lista: PagoConDetalles[]; showAction: boolean }) {
    return (
      <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--border-subtle)] hover:bg-transparent">
              <TableHead>Proveedor</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Fecha venta</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-[var(--text-muted)] py-12">
                  No hay registros
                </TableCell>
              </TableRow>
            ) : (
              lista.map((p) => <PagoRow key={p.id} pago={p} showAction={showAction} />)
            )}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="relative max-w-md flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
          <Input
            placeholder="Buscar por proveedor, código o producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <button onClick={exportPagos} className="btn-ghost text-xs p-2 px-4 inline-flex items-center gap-2 flex-shrink-0">
          <Download size={14} />
          Exportar Excel
        </button>
      </div>

      <Tabs defaultValue="pendientes" onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="pendientes" onClick={() => setActiveTab('pendientes')}>
              Pendientes ({pendientes.length})
            </TabsTrigger>
            <TabsTrigger value="pagados">
              Pagados ({pagados.length})
            </TabsTrigger>
            <TabsTrigger value="todos">
              Todos ({todos.length})
            </TabsTrigger>
          </TabsList>
          {pendientes.length > 0 && (
            <div className="text-sm text-[var(--text-muted)] font-bold">
              Total pendiente:{' '}
              <span className="text-[var(--color-warning)] font-display text-2xl tracking-wide align-middle">{formatCurrency(totalPendiente)}</span>
            </div>
          )}
        </div>

        <TabsContent value="pendientes" className="space-y-6">
          {Object.entries(pendientesPorProveedor).length === 0 ? (
            <div className="rounded-xl border border-[var(--border-subtle)] py-12 text-center text-[var(--text-muted)]">
              No hay pagos pendientes
            </div>
          ) : (
            Object.entries(pendientesPorProveedor).map(([provId, grupo]) => (
              <div key={provId} className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
                  <div>
                    <span className="font-semibold text-[var(--text-primary)] uppercase tracking-wide">{grupo.nombre}</span>
                    <span className="text-[var(--text-secondary)] text-sm ml-3 font-medium">
                      {grupo.pagos.length} prenda{grupo.pagos.length !== 1 ? 's' : ''} —{' '}
                      <span className="text-[var(--color-warning)] font-bold">{formatCurrency(grupo.total)}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => marcarTodosPagados(provId)}
                    className="btn-ghost text-xs p-1 px-3"
                  >
                    <Check size={13} className="mr-1 inline-block" />
                    Marcar todos como pagados
                  </button>
                </div>
                <Table>
                  <TableBody>
                    {grupo.pagos.map((p) => <PagoRow key={p.id} pago={p} showAction />)}
                  </TableBody>
                </Table>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="pagados">
          <TableConPagos lista={pagados} showAction={false} />
        </TabsContent>

        <TabsContent value="todos">
          <TableConPagos lista={todos} showAction />
        </TabsContent>
      </Tabs>
    </>
  )
}

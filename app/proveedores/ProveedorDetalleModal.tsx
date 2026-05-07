'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Proveedor, Producto } from '@/types/database'
import { formatCurrency } from '@/lib/format'

interface Props {
  proveedorId: string
  onClose: () => void
}

export function ProveedorDetalleModal({ proveedorId, onClose }: Props) {
  const [proveedor, setProveedor] = useState<Proveedor | null>(null)
  const [productos, setProductos] = useState<Producto[]>([])
  const [pendiente, setPendiente] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: prov }, { data: prods }, { data: pagos }] = await Promise.all([
        supabase.from('proveedores').select('*').eq('id', proveedorId).single(),
        supabase.from('productos').select('*').eq('proveedor_id', proveedorId).order('created_at', { ascending: false }),
        supabase.from('pagos_proveedores').select('monto').eq('proveedor_id', proveedorId).eq('estado', 'pendiente'),
      ])
      setProveedor(prov as Proveedor | null)
      setProductos((prods ?? []) as Producto[])
      setPendiente(((pagos ?? []) as { monto: number }[]).reduce((sum, p) => sum + p.monto, 0))
      setLoading(false)
    }
    load()
  }, [proveedorId])

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[var(--bg-elevated)] border-[var(--border-strong)] text-[var(--text-primary)] max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl tracking-wide uppercase text-[var(--text-primary)]">
            {loading ? 'Cargando...' : proveedor?.nombre}
          </DialogTitle>
        </DialogHeader>
        {!loading && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="metric-card">
                <p className="metric-label mb-2">Prendas en sistema</p>
                <p className="font-display text-4xl tracking-wide text-[var(--text-primary)]">{productos.length}</p>
              </div>
              <div className="metric-card !border-[var(--color-warning)]/30 !bg-[var(--color-warning)]/10">
                <p className="metric-label text-[var(--color-warning)] mb-2">Monto pendiente de pago</p>
                <p className="font-display text-4xl tracking-wide text-[var(--color-warning)]">{formatCurrency(pendiente)}</p>
              </div>
            </div>

            <div>
              <h3 className="font-heading text-lg tracking-widest uppercase text-[var(--text-primary)] mb-4">Prendas</h3>
              <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[var(--border-subtle)] hover:bg-transparent">
                      <TableHead>Código</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Precio venta</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-[var(--text-muted)] py-6">
                          Sin prendas registradas
                        </TableCell>
                      </TableRow>
                    ) : (
                      productos.map((prod) => (
                        <TableRow key={prod.id}>
                          <TableCell className="font-heading text-[12px] uppercase tracking-wider text-[var(--accent-primary-light)] font-bold">{prod.codigo}</TableCell>
                          <TableCell className="text-[var(--text-primary)]">{prod.descripcion}</TableCell>
                          <TableCell className="text-[var(--text-secondary)]">{formatCurrency(prod.precio_venta)}</TableCell>
                          <TableCell>
                            <span
                              className={
                                prod.estado === 'disponible'
                                  ? 'badge-disponible inline-block'
                                  : 'badge-vendido inline-block'
                              }
                            >
                              {prod.estado}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

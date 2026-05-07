import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/format'
import Link from 'next/link'
import { ArrowLeft, Phone, Mail, Package, CheckCircle, Clock } from 'lucide-react'
import { ProveedorDetalleClient } from './ProveedorDetalleClient'

export const dynamic = 'force-dynamic'

export default async function ProveedorDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [
    { data: proveedorData, error },
    { data: productosData },
    { data: pagosData },
  ] = await Promise.all([
    supabase.from('proveedores').select('*').eq('id', id).single(),
    supabase.from('productos').select('id, codigo, descripcion, categoria, estado, precio_venta, precio_proveedor').eq('proveedor_id', id).order('created_at', { ascending: false }),
    supabase.from('pagos_proveedores').select('id, monto, estado, fecha_venta, fecha_pago, productos(codigo, descripcion)').eq('proveedor_id', id).order('fecha_venta', { ascending: false }),
  ])

  if (error || !proveedorData) notFound()

  const proveedor = proveedorData as { id: string; nombre: string; telefono: string | null; email: string | null; observaciones: string | null }
  const productos = (productosData ?? []) as { id: string; codigo: string; descripcion: string; categoria: string | null; estado: string; precio_venta: number; precio_proveedor: number }[]
  const pagos = (pagosData ?? []) as unknown as { id: string; monto: number; estado: string; fecha_venta: string; fecha_pago: string | null; productos: { codigo: string; descripcion: string } | null }[]

  const totalCargadas = productos.length
  const totalDisponibles = productos.filter((p) => p.estado === 'disponible').length
  const totalVendidas = productos.filter((p) => p.estado === 'vendido').length
  const pendiente = pagos.filter((p) => p.estado === 'pendiente').reduce((s, p) => s + p.monto, 0)
  const totalVendidoMonto = pagos.reduce((s, p) => s + p.monto, 0)

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <Link
          href="/proveedores"
          className="inline-flex items-center gap-2 font-heading text-[11px] font-bold tracking-widest uppercase text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          Volver a proveedores
        </Link>
        <h1 className="page-title">{proveedor.nombre}</h1>
        <p className="page-subtitle">Detalle del proveedor</p>
      </div>

      {/* Info del proveedor */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {proveedor.telefono && (
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-[var(--text-muted)]" />
              <div>
                <p className="font-heading text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)]">Teléfono</p>
                <p className="text-[var(--text-primary)]">{proveedor.telefono}</p>
              </div>
            </div>
          )}
          {proveedor.email && (
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-[var(--text-muted)]" />
              <div>
                <p className="font-heading text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)]">Email</p>
                <p className="text-[var(--text-primary)]">{proveedor.email}</p>
              </div>
            </div>
          )}
          {proveedor.observaciones && (
            <div className="sm:col-span-2">
              <p className="font-heading text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-1">Observaciones</p>
              <p className="text-[var(--text-secondary)] text-sm">{proveedor.observaciones}</p>
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="metric-card">
          <p className="metric-label mb-2">Total cargadas</p>
          <p className="font-display text-4xl tracking-wide text-[var(--text-primary)]">{totalCargadas}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label mb-2">Disponibles</p>
          <p className="font-display text-4xl tracking-wide text-[var(--color-success)]">{totalDisponibles}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label mb-2">Vendidas</p>
          <p className="font-display text-4xl tracking-wide text-[var(--text-secondary)]">{totalVendidas}</p>
        </div>
        <div className="metric-card" style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
          <p className="metric-label mb-2" style={{ color: 'var(--color-warning)' }}>Pendiente pago</p>
          <p className="font-display text-3xl tracking-wide text-[var(--color-warning)]">{formatCurrency(pendiente)}</p>
        </div>
      </div>

      {/* Tabla de prendas con filtros (client component) */}
      <ProveedorDetalleClient productos={productos} pagos={pagos} />
    </div>
  )
}

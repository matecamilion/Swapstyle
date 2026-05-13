'use client'

import { Download } from 'lucide-react'
import { exportToExcel, fmtDateExcel } from '@/lib/exportExcel'

type VentaProductoExport = {
  precio_venta_momento: number
  precio_proveedor_momento: number
  productos: {
    codigo: string
    descripcion: string
    proveedores: { nombre: string } | null
  } | null
}

interface Props {
  codigoCorto: string
  fecha: string
  metodoPago: string
  totalVenta: number
  gananciaNegocio: number
  totalProveedores: number
  items: VentaProductoExport[]
}

export function ExportVentaButton({
  codigoCorto,
  fecha,
  metodoPago,
  totalVenta,
  gananciaNegocio,
  totalProveedores,
  items,
}: Props) {
  async function handleExport() {
    const moneyColumns = ['Precio Venta', 'Comisión Local', 'Monto Proveedor']

    const rows: Record<string, string | number | null | undefined>[] = items.map((vp) => ({
      'Código Venta': `#${codigoCorto}`,
      'Fecha': fmtDateExcel(fecha),
      'Proveedor': vp.productos?.proveedores?.nombre ?? '—',
      'Producto': vp.productos?.descripcion ?? '—',
      'Precio Venta': vp.precio_venta_momento,
      'Comisión Local': vp.precio_venta_momento - vp.precio_proveedor_momento,
      'Monto Proveedor': vp.precio_proveedor_momento,
      'Método de Pago': metodoPago.charAt(0).toUpperCase() + metodoPago.slice(1),
    }))

    // Add a summary row
    rows.push({
      'Código Venta': '',
      'Fecha': '',
      'Proveedor': '',
      'Producto': 'TOTALES',
      'Precio Venta': totalVenta,
      'Comisión Local': gananciaNegocio,
      'Monto Proveedor': totalProveedores,
      'Método de Pago': '',
    })

    const fechaFile = fmtDateExcel(fecha).replace(/\//g, '-')
    const hoyExport = fmtDateExcel(new Date().toISOString())
    await exportToExcel(rows, `venta_${codigoCorto}_${fechaFile}`, {
      title: 'DETALLE DE VENTA',
      subtitle: `Venta #${codigoCorto} — ${fmtDateExcel(fecha)} — Exportado el ${hoyExport}`,
      sheetName: 'Detalle Venta',
      moneyColumns,
      totalRows: [rows.length - 1],
    })
  }

  return (
    <button onClick={handleExport} className="btn-ghost text-xs p-2 px-4 inline-flex items-center gap-2">
      <Download size={14} />
      Exportar Excel
    </button>
  )
}

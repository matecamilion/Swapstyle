export type Proveedor = {
  id: string
  nombre: string
  telefono: string | null
  email: string | null
  observaciones: string | null
  created_at: string
}

export type Producto = {
  id: string
  codigo: string
  descripcion: string
  categoria: string | null
  estado: 'disponible' | 'vendido'
  precio_proveedor: number
  precio_venta: number
  proveedor_id: string | null
  created_at: string
}

export type ProductoConProveedor = Producto & {
  proveedores: Pick<Proveedor, 'id' | 'nombre'> | null
}

export type Venta = {
  id: string
  fecha: string
  metodo_pago: 'efectivo' | 'transferencia' | 'tarjeta'
  total_venta: number
  ganancia_negocio: number
  total_proveedores: number
  created_at: string
}

export type VentaProducto = {
  id: string
  venta_id: string
  producto_id: string
  precio_venta_momento: number
  precio_proveedor_momento: number
}

export type PagoProveedor = {
  id: string
  producto_id: string
  proveedor_id: string
  venta_id: string
  monto: number
  estado: 'pendiente' | 'pagado'
  fecha_venta: string
  fecha_pago: string | null
  created_at: string
}

export type PagoConDetalles = PagoProveedor & {
  proveedores: Pick<Proveedor, 'id' | 'nombre'> | null
  productos: Pick<Producto, 'id' | 'codigo' | 'descripcion'> | null
}

export type Gasto = {
  id: string
  descripcion: string
  monto: number
  fecha: string
  categoria: string | null
  created_at: string
}

-- PROVEEDORES
create table proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  email text,
  observaciones text,
  created_at timestamptz default now()
);

-- PRODUCTOS (prendas)
create table productos (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  descripcion text not null,
  categoria text,
  estado text not null default 'disponible' check (estado in ('disponible', 'vendido')),
  precio_proveedor numeric(10,2) not null,
  precio_venta numeric(10,2) not null,
  proveedor_id uuid references proveedores(id) on delete restrict,
  created_at timestamptz default now()
);

-- VENTAS
create table ventas (
  id uuid primary key default gen_random_uuid(),
  fecha timestamptz default now(),
  metodo_pago text not null check (metodo_pago in ('efectivo', 'transferencia', 'tarjeta')),
  total_venta numeric(10,2) not null,
  ganancia_negocio numeric(10,2) not null,
  total_proveedores numeric(10,2) not null,
  created_at timestamptz default now()
);

-- TABLA PIVOTE VENTA <-> PRODUCTOS
create table venta_productos (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid references ventas(id) on delete cascade,
  producto_id uuid references productos(id) on delete restrict,
  precio_venta_momento numeric(10,2) not null,
  precio_proveedor_momento numeric(10,2) not null
);

-- PAGOS A PROVEEDORES
create table pagos_proveedores (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid references productos(id) on delete restrict,
  proveedor_id uuid references proveedores(id) on delete restrict,
  venta_id uuid references ventas(id) on delete restrict,
  monto numeric(10,2) not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagado')),
  fecha_venta timestamptz not null,
  fecha_pago timestamptz,
  created_at timestamptz default now()
);

-- GASTOS
create table gastos (
  id uuid primary key default gen_random_uuid(),
  descripcion text not null,
  monto numeric(10,2) not null,
  fecha date not null default current_date,
  categoria text,
  created_at timestamptz default now()
);

-- Row Level Security (opcional, habilitar si se usa auth)
-- alter table proveedores enable row level security;
-- alter table productos enable row level security;
-- alter table ventas enable row level security;
-- alter table venta_productos enable row level security;
-- alter table pagos_proveedores enable row level security;
-- alter table gastos enable row level security;

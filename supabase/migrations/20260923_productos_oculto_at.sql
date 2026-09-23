-- 1) Ocultar prendas del listado sin borrarlas.
--    Ninguna otra vista filtra por esta columna: ventas, dashboard, pagos,
--    cierre de caja y detalle de proveedor siguen contando estas prendas.
alter table productos add column if not exists oculto_at timestamptz;

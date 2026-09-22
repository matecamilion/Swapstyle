-- Talle por prenda. Solo para prendas nuevas: las existentes quedan en NULL.
alter table productos add column if not exists talle text;

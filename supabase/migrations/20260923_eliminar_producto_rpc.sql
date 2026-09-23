-- 2) Borrado definitivo de prendas, en una sola transacción.
--    Ambas funciones son SECURITY INVOKER (el default): se llaman con la
--    service role key desde el servidor, que ya tiene privilegios sobre las
--    tablas, así que no hace falta definer. search_path fijo igual, por las dudas.

-- 2.a) Prenda DISPONIBLE: borrado directo, pero solo si no quedó enganchada
--      a ninguna venta ni pago. Las condiciones viajan dentro del DELETE para
--      que no exista ventana entre la verificación y el borrado.
create or replace function eliminar_producto_disponible(p_producto_id uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_estado text;
  v_borradas int;
begin
  select estado into v_estado from productos where id = p_producto_id for update;
  if not found then
    raise exception 'La prenda no existe';
  end if;
  if v_estado <> 'disponible' then
    raise exception 'Esta prenda ya fue vendida; usá el flujo de prendas vendidas';
  end if;

  delete from productos p
   where p.id = p_producto_id
     and p.estado = 'disponible'
     and not exists (select 1 from venta_productos vp where vp.producto_id = p.id)
     and not exists (select 1 from pagos_proveedores pp where pp.producto_id = p.id);

  get diagnostics v_borradas = row_count;
  if v_borradas = 0 then
    raise exception 'La prenda tiene ventas o pagos asociados y no se puede borrar';
  end if;
end;
$$;

-- 2.b) Prenda VENDIDA: pagos_proveedores -> venta_productos -> venta -> producto.
--      p_monto_efectivo / p_monto_transferencia solo se usan si la venta es
--      mixta y le quedan otros productos. Si no se pasan, se reparte
--      proporcionalmente para que la suma siga cuadrando con total_venta.
create or replace function eliminar_producto_vendido(
  p_producto_id uuid,
  p_monto_efectivo numeric default null,
  p_monto_transferencia numeric default null
)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_estado           text;
  v_venta_id         uuid;
  v_pagados          int;
  v_restantes        int;
  v_metodo           text;
  v_total_anterior   numeric;
  v_total            numeric;
  v_total_proveedores numeric;
  v_efectivo         numeric;
  v_transferencia    numeric;
begin
  select estado into v_estado from productos where id = p_producto_id for update;
  if not found then
    raise exception 'La prenda no existe';
  end if;
  if v_estado <> 'vendido' then
    raise exception 'Esta operación es solo para prendas vendidas';
  end if;

  -- Si al proveedor ya se le pagó, no se toca: solo se puede ocultar.
  select count(*) into v_pagados
    from pagos_proveedores
   where producto_id = p_producto_id and estado = 'pagado';
  if v_pagados > 0 then
    raise exception 'Ya se le pagó al proveedor; solo se puede quitar del listado';
  end if;

  -- Puede no haber venta: hay prendas marcadas como vendidas antes del POS.
  select vp.venta_id into v_venta_id
    from venta_productos vp
   where vp.producto_id = p_producto_id
   limit 1;

  if v_venta_id is not null then
    perform 1 from ventas where id = v_venta_id for update;
  end if;

  delete from pagos_proveedores where producto_id = p_producto_id;
  delete from venta_productos  where producto_id = p_producto_id;

  if v_venta_id is not null then
    select count(*) into v_restantes from venta_productos where venta_id = v_venta_id;

    if v_restantes = 0 then
      -- Era la única prenda de la venta: se va la venta entera.
      delete from pagos_proveedores where venta_id = v_venta_id;
      delete from ventas where id = v_venta_id;
    else
      select coalesce(sum(precio_venta_momento), 0),
             coalesce(sum(precio_proveedor_momento), 0)
        into v_total, v_total_proveedores
        from venta_productos
       where venta_id = v_venta_id;

      select metodo_pago, total_venta, monto_efectivo, monto_transferencia
        into v_metodo, v_total_anterior, v_efectivo, v_transferencia
        from ventas
       where id = v_venta_id;

      if v_metodo = 'mixto' then
        if p_monto_efectivo is not null and p_monto_transferencia is not null then
          if p_monto_efectivo < 0 or p_monto_transferencia < 0 then
            raise exception 'Los montos no pueden ser negativos';
          end if;
          if abs((p_monto_efectivo + p_monto_transferencia) - v_total) > 0.01 then
            raise exception 'Los montos no suman el nuevo total de la venta (%)', v_total;
          end if;
          v_efectivo      := p_monto_efectivo;
          v_transferencia := p_monto_transferencia;
        else
          -- Fallback proporcional (p. ej. si alguien llama al RPC sin montos).
          if coalesce(v_total_anterior, 0) > 0 then
            v_efectivo := round(coalesce(v_efectivo, 0) * v_total / v_total_anterior, 2);
          else
            v_efectivo := 0;
          end if;
          v_transferencia := v_total - v_efectivo;
        end if;
      end if;

      update ventas
         set total_venta         = v_total,
             total_proveedores   = v_total_proveedores,
             ganancia_negocio    = v_total - v_total_proveedores,
             monto_efectivo      = v_efectivo,
             monto_transferencia = v_transferencia
       where id = v_venta_id;
    end if;
  end if;

  delete from productos where id = p_producto_id;
end;
$$;

-- Solo alcanzable con la service role key desde el servidor. Nunca anon.
revoke all on function eliminar_producto_disponible(uuid) from public, anon, authenticated;
revoke all on function eliminar_producto_vendido(uuid, numeric, numeric) from public, anon, authenticated;
grant execute on function eliminar_producto_disponible(uuid) to service_role;
grant execute on function eliminar_producto_vendido(uuid, numeric, numeric) to service_role;

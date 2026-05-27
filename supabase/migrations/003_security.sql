-- ============================================================
-- Seguridad: RLS hardening + atomic slot check
-- ============================================================

-- 1. Restringir anon_insert_reservas: solo estados válidos para inserción pública
drop policy if exists "anon_insert_reservas" on reservas;
do $$ begin
  create policy "anon_insert_reservas" on reservas
    for insert to anon
    with check (estado in ('confirmada', 'pendiente_aprobacion'));
exception when duplicate_object then null; end $$;

-- 2. Ocultar admin_email de la lectura pública de configuracion
drop policy if exists "anon_read_configuracion" on configuracion;
do $$ begin
  create policy "anon_read_configuracion" on configuracion
    for select to anon
    using (clave != 'admin_email');
exception when duplicate_object then null; end $$;

-- 3. RPC atómica para crear reserva (evita TOCTOU en tope_por_franja)
--    Usa pg_advisory_xact_lock para serializar inserciones en el mismo slot.
create or replace function crear_reserva_pub(
  p_id              uuid,
  p_cancel_token    text,
  p_nombre          text,
  p_apellido        text,
  p_telefono        text,
  p_email           text,
  p_fecha           date,
  p_hora            time,
  p_personas        integer,
  p_estado          text,
  p_notas_cliente   text,
  p_idioma          text,
  p_tope_activo     boolean,
  p_tope_personas   integer
) returns json language plpgsql security definer as $$
declare
  v_ocupadas integer := 0;
begin
  -- Adquirir lock exclusivo por slot (fecha+hora) para serializar inserciones concurrentes
  perform pg_advisory_xact_lock(hashtext(p_fecha::text || p_hora::text));

  -- Verificar tope si aplica (solo para reservas confirmadas, no pendientes)
  if p_tope_activo and p_estado = 'confirmada' then
    select coalesce(sum(personas), 0)
      into v_ocupadas
      from reservas
     where fecha = p_fecha
       and hora  = p_hora
       and estado in ('confirmada', 'llegado');

    if v_ocupadas + p_personas > p_tope_personas then
      return json_build_object('success', false, 'error', 'franja_bloqueada');
    end if;
  end if;

  insert into reservas (
    id, cancel_token, nombre, apellido, telefono, email,
    fecha, hora, personas, estado, notas_cliente, idioma
  ) values (
    p_id, p_cancel_token, p_nombre, p_apellido, p_telefono, p_email,
    p_fecha, p_hora, p_personas, p_estado, p_notas_cliente, p_idioma
  );

  return json_build_object('success', true);
exception
  when others then
    return json_build_object('success', false, 'error', sqlerrm);
end;
$$;

-- Permitir que anon llame a la RPC
grant execute on function crear_reserva_pub to anon;

-- 4. Cleanup automático de rate_limits (si no se hizo en 002)
--    Esta función puede ser invocada por un cron job de Vercel
create or replace function cleanup_rate_limits() returns void language sql security definer as $$
  delete from rate_limits where created_at < now() - interval '2 hours';
$$;

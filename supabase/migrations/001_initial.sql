-- ============================================================
-- Corte de Manga — reservas app — migración inicial
-- ============================================================

-- Tabla principal de reservas
create table if not exists reservas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  apellido text not null,
  telefono text not null,
  email text not null,
  fecha date not null,
  hora time not null,
  personas integer not null check (personas between 1 and 50),
  estado text not null default 'confirmada'
    check (estado in ('confirmada','llegado','no_show','cancelada','pendiente_aprobacion','rechazada')),
  notas_cliente text,
  notas_internas text,
  idioma text not null default 'es' check (idioma in ('es','ca','en')),
  cancel_token text unique not null default gen_random_uuid()::text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reservas_fecha on reservas(fecha);
create index if not exists idx_reservas_estado on reservas(estado);
create index if not exists idx_reservas_cancel_token on reservas(cancel_token);

-- Franjas bloqueadas
create table if not exists franjas_bloqueadas (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  hora time not null,
  motivo text,
  created_at timestamptz not null default now(),
  unique(fecha, hora)
);

-- Días cerrados
create table if not exists dias_cerrados (
  id uuid primary key default gen_random_uuid(),
  fecha date unique not null,
  motivo text,
  created_at timestamptz not null default now()
);

-- Configuración clave/valor
create table if not exists configuracion (
  clave text primary key,
  valor jsonb not null,
  updated_at timestamptz not null default now()
);

insert into configuracion (clave, valor) values
  ('tope_por_franja_activo', 'false'::jsonb),
  ('tope_por_franja_personas', '30'::jsonb),
  ('limite_grupo_online', '7'::jsonb),
  ('antelacion_maxima_dias', '90'::jsonb),
  ('admin_email', '"reservas@cortedemanga.es"'::jsonb)
on conflict (clave) do nothing;

-- Trigger para updated_at en reservas
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger reservas_updated_at
  before update on reservas
  for each row execute function update_updated_at();

-- RPC pública para cancelar por token (sin login)
create or replace function cancelar_reserva(p_token text)
returns json language plpgsql security definer as $$
declare
  v_reserva reservas;
begin
  select * into v_reserva from reservas where cancel_token = p_token;

  if not found then
    return json_build_object('success', false, 'error', 'token_not_found');
  end if;

  if v_reserva.estado = 'cancelada' then
    return json_build_object('success', false, 'error', 'already_cancelled');
  end if;

  if v_reserva.estado in ('no_show', 'rechazada') then
    return json_build_object('success', false, 'error', 'cannot_cancel');
  end if;

  update reservas set estado = 'cancelada' where cancel_token = p_token;

  return json_build_object(
    'success', true,
    'reserva_id', v_reserva.id,
    'nombre', v_reserva.nombre,
    'apellido', v_reserva.apellido,
    'email', v_reserva.email,
    'fecha', v_reserva.fecha,
    'hora', v_reserva.hora,
    'personas', v_reserva.personas,
    'idioma', v_reserva.idioma
  );
end;
$$;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table reservas enable row level security;
alter table franjas_bloqueadas enable row level security;
alter table dias_cerrados enable row level security;
alter table configuracion enable row level security;

-- Anon puede insertar reservas (formulario público)
create policy "anon_insert_reservas" on reservas
  for insert to anon with check (true);

-- Anon puede leer franjas bloqueadas y días cerrados (para el formulario)
create policy "anon_read_franjas" on franjas_bloqueadas
  for select to anon using (true);

create policy "anon_read_dias_cerrados" on dias_cerrados
  for select to anon using (true);

create policy "anon_read_configuracion" on configuracion
  for select to anon using (true);

-- Service role tiene acceso total (panel admin usa service_role)
create policy "service_role_all_reservas" on reservas
  for all to service_role using (true) with check (true);

create policy "service_role_all_franjas" on franjas_bloqueadas
  for all to service_role using (true) with check (true);

create policy "service_role_all_dias" on dias_cerrados
  for all to service_role using (true) with check (true);

create policy "service_role_all_config" on configuracion
  for all to service_role using (true) with check (true);

-- ============================================================
-- Habilitar Realtime (ejecutar desde Supabase dashboard si este SQL no es suficiente)
-- ============================================================
-- alter publication supabase_realtime add table reservas;

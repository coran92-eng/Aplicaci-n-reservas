-- Rate limits table (replaces in-memory Map)
create table if not exists rate_limits (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  action text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_rate_limits_lookup on rate_limits(identifier, action, created_at);

-- Auto-cleanup: delete entries older than 2 hours
create or replace function cleanup_rate_limits() returns void language sql as $$
  delete from rate_limits where created_at < now() - interval '2 hours';
$$;

-- RLS: solo service_role puede leer/escribir
alter table rate_limits enable row level security;
create policy "service_role_all_rate_limits" on rate_limits
  for all to service_role using (true) with check (true);

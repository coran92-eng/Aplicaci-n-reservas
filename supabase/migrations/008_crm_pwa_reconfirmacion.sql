-- Migration 008: CRM (tags/notas clientes), re-confirmación, push subscriptions

-- 1. CRM: añadir tags y notas a clientes
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS tags      TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notas     TEXT,
  ADD COLUMN IF NOT EXISTS visitas   INT     NOT NULL DEFAULT 0;

-- Mantener visitas sincronizado con el número real de reservas del cliente
CREATE INDEX IF NOT EXISTS clientes_email_lower_idx ON clientes(lower(email));

-- 2. Re-confirmación 1-click en reservas
ALTER TABLE reservas
  ADD COLUMN IF NOT EXISTS reconfirmado          BOOLEAN   DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reconfirmacion_token  UUID      DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS recordatorio_enviado  BOOLEAN   DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS reservas_reconfirmacion_token_idx
  ON reservas(reconfirmacion_token)
  WHERE reconfirmacion_token IS NOT NULL;

-- 3. Push subscriptions para PWA
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint   TEXT        UNIQUE NOT NULL,
  p256dh     TEXT        NOT NULL,
  auth       TEXT        NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON push_subscriptions
  USING (FALSE);

-- 4. Trigger para mantener clientes.visitas actualizado
CREATE OR REPLACE FUNCTION _sync_cliente_visitas()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.cliente_id IS NOT NULL THEN
    UPDATE clientes
      SET visitas = (
        SELECT COUNT(*) FROM reservas
        WHERE cliente_id = NEW.cliente_id
          AND estado IN ('confirmada', 'llegado', 'no_show')
      )
    WHERE id = NEW.cliente_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservas_sync_visitas ON reservas;
CREATE TRIGGER reservas_sync_visitas
  AFTER INSERT OR UPDATE OF estado ON reservas
  FOR EACH ROW EXECUTE FUNCTION _sync_cliente_visitas();

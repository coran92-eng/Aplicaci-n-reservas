-- Fase 5: índices, realtime, audit_log, tabla clientes

-- 1. Índice compuesto para acelerar la query de tope por franja
CREATE INDEX IF NOT EXISTS reservas_disponibilidad_idx
  ON reservas(fecha, hora)
  WHERE estado IN ('confirmada', 'llegado');

-- 2. Habilitar Realtime en la tabla reservas
ALTER PUBLICATION supabase_realtime ADD TABLE reservas;

-- 3. Tabla de auditoría
CREATE TABLE IF NOT EXISTS audit_log (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla      text        NOT NULL,
  registro_id uuid       NOT NULL,
  accion     text        NOT NULL,
  antes      jsonb,
  despues    jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_log_registro_idx ON audit_log(tabla, registro_id);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log(created_at);

-- Trigger que registra cualquier UPDATE en reservas
CREATE OR REPLACE FUNCTION _log_reserva_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO audit_log(tabla, registro_id, accion, antes, despues)
  VALUES ('reservas', NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservas_audit_trigger ON reservas;
CREATE TRIGGER reservas_audit_trigger
  AFTER UPDATE ON reservas
  FOR EACH ROW EXECUTE FUNCTION _log_reserva_update();

-- 4. Tabla clientes normalizada
CREATE TABLE IF NOT EXISTS clientes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text        UNIQUE NOT NULL,
  nombre     text,
  apellido   text,
  telefono   text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clientes_email_idx ON clientes(email);

-- FK desde reservas
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES clientes(id);
CREATE INDEX IF NOT EXISTS reservas_cliente_id_idx ON reservas(cliente_id);

-- RLS: solo service_role puede leer/escribir clientes
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clientes_service_only" ON clientes
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- RLS: audit_log solo service_role
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_service_only" ON audit_log
  USING (auth.role() = 'service_role');

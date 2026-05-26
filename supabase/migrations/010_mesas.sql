CREATE TABLE IF NOT EXISTS mesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  capacidad INT NOT NULL DEFAULT 4,
  pos_x FLOAT NOT NULL DEFAULT 10,  -- % del ancho del canvas (0-100)
  pos_y FLOAT NOT NULL DEFAULT 10,  -- % del alto del canvas (0-100)
  forma TEXT NOT NULL DEFAULT 'rect' CHECK (forma IN ('rect', 'round')),
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reservas ADD COLUMN IF NOT EXISTS mesa_id UUID REFERENCES mesas(id) ON DELETE SET NULL;

ALTER TABLE mesas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_mesas" ON mesas FOR SELECT TO anon USING (activa = TRUE);
CREATE POLICY "service_role_all_mesas" ON mesas FOR ALL USING (auth.role() = 'service_role');

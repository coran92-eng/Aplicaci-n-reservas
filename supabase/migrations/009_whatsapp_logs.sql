CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_id UUID NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
  template TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  message_id TEXT,
  error TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_reserva ON whatsapp_logs(reserva_id);
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_wa" ON whatsapp_logs USING (auth.role() = 'service_role');

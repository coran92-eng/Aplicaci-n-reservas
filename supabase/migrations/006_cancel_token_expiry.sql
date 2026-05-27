-- Migration 006: cancel_token expiration
-- Adds cancel_token_expires_at so tokens from past reservations can't be reused.

ALTER TABLE reservas
  ADD COLUMN IF NOT EXISTS cancel_token_expires_at TIMESTAMPTZ;

-- Backfill existing rows: token expires 7 days after reservation date
UPDATE reservas
  SET cancel_token_expires_at = (fecha::DATE + INTERVAL '7 days')::TIMESTAMPTZ
  WHERE cancel_token_expires_at IS NULL;

-- Update cancelar_reserva RPC to check token expiry
CREATE OR REPLACE FUNCTION cancelar_reserva(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reserva reservas%ROWTYPE;
BEGIN
  SELECT * INTO v_reserva FROM reservas WHERE cancel_token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_reserva.cancel_token_expires_at IS NOT NULL
     AND v_reserva.cancel_token_expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'token_expired');
  END IF;

  IF v_reserva.estado = 'cancelada' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_cancelled');
  END IF;

  IF v_reserva.estado IN ('llegado', 'no_show', 'rechazada') THEN
    RETURN jsonb_build_object('success', false, 'error', 'cannot_cancel');
  END IF;

  UPDATE reservas SET estado = 'cancelada' WHERE id = v_reserva.id;

  RETURN jsonb_build_object(
    'success', true,
    'nombre',   v_reserva.nombre,
    'apellido', v_reserva.apellido,
    'email',    v_reserva.email,
    'fecha',    v_reserva.fecha,
    'hora',     v_reserva.hora,
    'personas', v_reserva.personas,
    'idioma',   v_reserva.idioma
  );
END;
$$;

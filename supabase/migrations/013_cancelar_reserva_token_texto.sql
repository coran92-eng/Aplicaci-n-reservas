-- Migración 013: la cancelación desde el enlace del email fallaba siempre.
--
-- cancel_token es TEXT desde la migración 001, pero la 006 redefinió cancelar_reserva(p_token UUID)
-- y comparaba «cancel_token = p_token» (text = uuid). Postgres no tiene ese operador: cada llamada
-- daba «operator does not exist: text = uuid», PostgREST respondía 404 y el cliente veía
-- «S'ha produït un error. Si us plau, truca'ns.». La última cancelación registrada es del 20/06/2026.
--
-- Arreglo: se compara como texto (usa el índice único de cancel_token) y se fija el search_path,
-- como pide Supabase para las funciones SECURITY DEFINER. La firma no cambia (p_token uuid),
-- así que la app y los permisos (anon, authenticated, service_role) siguen igual.
-- Ejecutada en producción el 27/11/2026.

CREATE OR REPLACE FUNCTION public.cancelar_reserva(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reserva reservas%ROWTYPE;
BEGIN
  SELECT * INTO v_reserva FROM reservas WHERE cancel_token = p_token::text;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_reserva.cancel_token_expires_at IS NOT NULL
     AND v_reserva.cancel_token_expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'token_expired');
  END IF;

  IF v_reserva.estado = 'cancelada'::estado_reserva THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_cancelled');
  END IF;

  IF v_reserva.estado IN ('llegado'::estado_reserva, 'no_show'::estado_reserva, 'rechazada'::estado_reserva) THEN
    RETURN jsonb_build_object('success', false, 'error', 'cannot_cancel');
  END IF;

  UPDATE reservas SET estado = 'cancelada'::estado_reserva WHERE id = v_reserva.id;

  RETURN jsonb_build_object(
    'success',  true,
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

-- Migration 007: Convert estado column to a proper ENUM type.
-- Replaces the text + CHECK constraint with an enum for type safety and indexing.

DO $$ BEGIN
  CREATE TYPE estado_reserva AS ENUM (
    'pendiente_aprobacion',
    'confirmada',
    'llegado',
    'no_show',
    'cancelada',
    'rechazada'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Drop the old CHECK constraint before altering the type
ALTER TABLE reservas DROP CONSTRAINT IF EXISTS reservas_estado_check;

ALTER TABLE reservas
  ALTER COLUMN estado TYPE estado_reserva
  USING estado::estado_reserva;

-- Restore a default value
ALTER TABLE reservas
  ALTER COLUMN estado SET DEFAULT 'confirmada'::estado_reserva;

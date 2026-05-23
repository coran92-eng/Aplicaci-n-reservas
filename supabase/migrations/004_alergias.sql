-- Fase 4: añadir columna alergias a la tabla reservas
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS alergias TEXT[] DEFAULT '{}' NOT NULL;

COMMENT ON COLUMN reservas.alergias IS 'Alergias/dietas declaradas: vegano, celiaco, lactosa, frutos_secos';

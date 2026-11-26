-- De dónde llega cada reserva (web: portada, carta, grupos, Navidad; ficha de Google; Instagram…).
-- Lo rellena la app con el ?src= del enlace. Sin cookies: solo se guarda en la propia reserva.
-- Mientras esta columna no exista, la app sigue reservando igual y simplemente no guarda el origen.
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS origen TEXT
  CHECK (origen IS NULL OR origen ~ '^[a-z0-9-]{2,32}$');

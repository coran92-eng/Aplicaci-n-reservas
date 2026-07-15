-- Grupos de hasta 11 personas reservan directamente (confirmación automática).
-- A partir de 12 la solicitud pasa a aprobación manual.
UPDATE configuracion
SET valor = '11'::jsonb
WHERE clave = 'limite_grupo_online';

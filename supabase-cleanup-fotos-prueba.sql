-- ========================================================================
-- Rentto — Limpieza de fotos de prueba
-- ========================================================================
-- 3 opciones según qué tan agresivo querés ser. Elegí una y CORRELA.
-- Tip: hacé backup primero (Supabase tiene "Database Backups" si tu plan
-- lo incluye, o exportá las tablas con un SELECT antes).
-- ========================================================================


-- ────────────────────────────────────────────────────────────────────────
-- OPCIÓN A — Solo vaciar el array `fotos` de TODAS las propiedades
-- (conserva propiedades, vinculaciones, pagos, contratos. Solo quita fotos)
-- ────────────────────────────────────────────────────────────────────────
-- UPDATE public.propiedades SET fotos = '{}';


-- ────────────────────────────────────────────────────────────────────────
-- OPCIÓN B — Vaciar fotos de propiedades específicas por nombre
-- (más quirúrgico: solo las que sabés que son de prueba)
-- ────────────────────────────────────────────────────────────────────────
-- UPDATE public.propiedades
--   SET fotos = '{}'
--   WHERE nombre IN ('rosarito', 'la luna', 'casa 72 agricultura');


-- ────────────────────────────────────────────────────────────────────────
-- OPCIÓN C — Borrar propiedades de prueba COMPLETAS
-- (también borra vinculaciones y pagos asociados por CASCADE.
-- Cuidado: si tenés data que querés conservar, NO uses esta opción)
-- ────────────────────────────────────────────────────────────────────────
-- DELETE FROM public.propiedades
--   WHERE nombre IN ('rosarito', 'la luna', 'casa 72 agricultura');


-- ────────────────────────────────────────────────────────────────────────
-- Verificación: ver qué propiedades existen y cuántas fotos tienen
-- ────────────────────────────────────────────────────────────────────────
SELECT
  id,
  nombre,
  direccion,
  COALESCE(array_length(fotos, 1), 0) AS num_fotos
FROM public.propiedades
ORDER BY created_at DESC;


-- ========================================================================
-- Nota sobre archivos físicos en Storage
-- ========================================================================
-- Las URLs en `fotos` apuntan a archivos en Supabase Storage (probablemente
-- bucket "propiedades" o similar). Las URLs que limpiás acá quedan
-- "huérfanas" — los archivos siguen en Storage pero ya no son referenciados.
--
-- Para limpiar físicamente los archivos del bucket:
-- 1. Supabase Dashboard → Storage → bucket "propiedades"
-- 2. Seleccioná las carpetas/archivos viejos → Delete
--
-- Los archivos huérfanos no rompen nada, pero ocupan espacio del plan.
-- ========================================================================

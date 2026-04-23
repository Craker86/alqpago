-- ========================================================================
-- Rentto — Row Level Security policies
-- ========================================================================
-- Correr este archivo completo en el SQL editor de Supabase.
-- Es idempotente: usa DROP IF EXISTS + CREATE para que puedas ejecutarlo
-- varias veces sin romper nada.
--
-- Estructura:
--   1. Habilitar RLS en todas las tablas
--   2. perfiles  — auth-wide SELECT, owner-only write
--   3. propiedades — marketplace SELECT abierto, owner-only write
--   4. pagos — scoped al inquilino o al propietario de la propiedad
--   5. vinculaciones — scoped a ambas partes
--   6. tasa_bcv — lectura pública (autenticados)
-- ========================================================================


-- ======================================================================
-- 1. Habilitar RLS
-- ======================================================================

ALTER TABLE perfiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE propiedades      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE vinculaciones    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasa_bcv         ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_historial  ENABLE ROW LEVEL SECURITY;


-- ======================================================================
-- 2. perfiles
--
-- Cualquier usuario autenticado puede LEER cualquier perfil (nombre,
-- teléfono, rol) porque la app muestra "a quién le pagás" y "de quién
-- cobrás". Los perfiles NO deberían incluir datos hiper-sensibles
-- (cédula, ingresos) — si llegan a estar, crear un split perfiles_public
-- + perfiles_sensitive.
--
-- Solo el dueño del perfil puede crear/actualizar su fila.
-- ======================================================================

DROP POLICY IF EXISTS perfiles_select_all_auth ON perfiles;
CREATE POLICY perfiles_select_all_auth ON perfiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS perfiles_insert_own ON perfiles;
CREATE POLICY perfiles_insert_own ON perfiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS perfiles_update_own ON perfiles;
CREATE POLICY perfiles_update_own ON perfiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- ======================================================================
-- 3. propiedades
--
-- SELECT: abierto a autenticados (marketplace).
-- INSERT/UPDATE/DELETE: solo el propietario (user_id = auth.uid()).
-- ======================================================================

DROP POLICY IF EXISTS propiedades_select_all_auth ON propiedades;
CREATE POLICY propiedades_select_all_auth ON propiedades
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS propiedades_insert_own ON propiedades;
CREATE POLICY propiedades_insert_own ON propiedades
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS propiedades_update_own ON propiedades;
CREATE POLICY propiedades_update_own ON propiedades
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS propiedades_delete_own ON propiedades;
CREATE POLICY propiedades_delete_own ON propiedades
  FOR DELETE
  USING (user_id = auth.uid());


-- ======================================================================
-- 4. pagos
--
-- SELECT: el inquilino ve los suyos; el propietario ve los recibidos
-- en sus propiedades.
-- INSERT: solo el inquilino (user_id = auth.uid()) puede crear.
-- UPDATE: solo el propietario de la propiedad puede confirmar/rechazar.
-- ======================================================================

DROP POLICY IF EXISTS pagos_select_inquilino_o_propietario ON pagos;
CREATE POLICY pagos_select_inquilino_o_propietario ON pagos
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR propiedad_id IN (
      SELECT id FROM propiedades WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS pagos_insert_inquilino ON pagos;
CREATE POLICY pagos_insert_inquilino ON pagos
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS pagos_update_propietario ON pagos;
CREATE POLICY pagos_update_propietario ON pagos
  FOR UPDATE
  USING (
    propiedad_id IN (
      SELECT id FROM propiedades WHERE user_id = auth.uid()
    )
  );


-- ======================================================================
-- 5. vinculaciones
--
-- SELECT: las dos partes (inquilino y propietario de la propiedad).
-- INSERT: solo el inquilino puede pedir vincularse (inquilino_id = auth.uid()).
-- UPDATE: ambas partes (inquilino cancela, propietario aprueba/rechaza).
-- DELETE: solo el inquilino puede borrar su propia vinculación.
-- ======================================================================

DROP POLICY IF EXISTS vinculaciones_select_parte ON vinculaciones;
CREATE POLICY vinculaciones_select_parte ON vinculaciones
  FOR SELECT
  USING (
    inquilino_id = auth.uid()
    OR propiedad_id IN (
      SELECT id FROM propiedades WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS vinculaciones_insert_inquilino ON vinculaciones;
CREATE POLICY vinculaciones_insert_inquilino ON vinculaciones
  FOR INSERT
  WITH CHECK (inquilino_id = auth.uid());

DROP POLICY IF EXISTS vinculaciones_update_parte ON vinculaciones;
CREATE POLICY vinculaciones_update_parte ON vinculaciones
  FOR UPDATE
  USING (
    inquilino_id = auth.uid()
    OR propiedad_id IN (
      SELECT id FROM propiedades WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS vinculaciones_delete_inquilino ON vinculaciones;
CREATE POLICY vinculaciones_delete_inquilino ON vinculaciones
  FOR DELETE
  USING (inquilino_id = auth.uid());


-- ======================================================================
-- 6. tasa_bcv
--
-- Lectura pública para autenticados.
-- Las escrituras deberían hacerse solo con service_role key (cron/admin).
-- ======================================================================

DROP POLICY IF EXISTS tasa_bcv_select_all_auth ON tasa_bcv;
CREATE POLICY tasa_bcv_select_all_auth ON tasa_bcv
  FOR SELECT
  USING (auth.role() = 'authenticated');


-- ======================================================================
-- 7. score_historial
--
-- Ledger de eventos de score. Cada fila referencia un pago (pago_id).
-- SELECT: solo el inquilino dueño del pago ve su propio historial.
--   (El propietario ve el score ACTUAL del inquilino vía scoring.js,
--   pero no necesita ver el log de cambios individuales.)
-- INSERT/UPDATE/DELETE: solo service_role — los eventos los debe escribir
-- un trigger o una función del backend, no el cliente.
-- ======================================================================

DROP POLICY IF EXISTS score_historial_select_own ON score_historial;
CREATE POLICY score_historial_select_own ON score_historial
  FOR SELECT
  USING (
    pago_id IN (
      SELECT id FROM pagos WHERE user_id = auth.uid()
    )
  );


-- ======================================================================
-- Storage: bucket "comprobantes"
-- ======================================================================
--
-- Las policies de Storage no se manejan acá — se configuran desde la UI
-- de Supabase (Storage → comprobantes → Policies). Política recomendada:
--
--   - Autenticados pueden INSERT archivos donde `bucket_id = 'comprobantes'`
--   - Autenticados pueden SELECT archivos del bucket
--     (el bucket puede dejarse "private" con policy de SELECT abierta
--     a autenticados, o hacerse público para que cualquier link funcione
--     sin exponer el listado completo).
--
-- Para MVP, dejar el bucket como "public" es lo más simple mientras no
-- haya comprobantes sensibles. Revisar cuando lancemos piloto.

-- ========================================================================
-- Rentto — Score audit trigger
-- ========================================================================
-- Crea un trigger que registra eventos en `score_historial` cada vez que
-- un pago cambia de estado a 'confirmado' o 'rechazado'.
--
-- Idempotente: usa CREATE OR REPLACE + DROP IF EXISTS.
--
-- Estructura:
--   1. Función log_score_event() — escribe la fila en score_historial
--   2. Trigger pagos_score_trigger — dispara la función al cambiar estado
--   3. Backfill opcional — registra eventos para pagos confirmados que ya
--      existían antes del trigger
-- ========================================================================


-- ======================================================================
-- 1. Función que registra el evento de score
-- ======================================================================
-- SECURITY DEFINER: corre con permisos del owner, así puede insertar en
-- score_historial sin que el cliente necesite policy de INSERT.
--
-- Reglas:
--   - estado pasa a 'confirmado'  → +7 pts ("Pago confirmado a tiempo")
--   - estado pasa a 'rechazado'   → −10 pts ("Pago rechazado")
--   - cualquier otra transición   → no genera evento
-- ======================================================================

CREATE OR REPLACE FUNCTION public.log_score_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_puntos INTEGER := 0;
  v_motivo TEXT := '';
  v_score_total INTEGER := 0;
BEGIN
  -- Solo actuar en transiciones relevantes (no en cada UPDATE)
  IF NEW.estado = 'confirmado' AND (TG_OP = 'INSERT' OR OLD.estado IS DISTINCT FROM 'confirmado') THEN
    v_puntos := 7;
    v_motivo := 'Pago confirmado a tiempo';
  ELSIF NEW.estado = 'rechazado' AND (TG_OP = 'INSERT' OR OLD.estado IS DISTINCT FROM 'rechazado') THEN
    v_puntos := -10;
    v_motivo := 'Pago rechazado';
  ELSE
    -- Sin evento de score para esta transición
    RETURN NEW;
  END IF;

  -- Calcular el nuevo total acumulado para este inquilino
  SELECT COALESCE(SUM(sh.puntos), 0) + v_puntos
    INTO v_score_total
    FROM public.score_historial sh
    JOIN public.pagos p ON sh.pago_id = p.id
    WHERE p.user_id = NEW.user_id;

  INSERT INTO public.score_historial (pago_id, puntos, motivo, score_total)
  VALUES (NEW.id, v_puntos, v_motivo, v_score_total);

  RETURN NEW;
END;
$$;


-- ======================================================================
-- 2. Trigger en pagos
-- ======================================================================
-- Dispara la función AFTER INSERT (nuevo pago) y AFTER UPDATE OF estado.
-- No necesitamos disparar en otros UPDATEs (ej. al añadir comprobante).
-- ======================================================================

DROP TRIGGER IF EXISTS pagos_score_trigger ON public.pagos;
CREATE TRIGGER pagos_score_trigger
  AFTER INSERT OR UPDATE OF estado ON public.pagos
  FOR EACH ROW
  EXECUTE FUNCTION public.log_score_event();


-- ======================================================================
-- 3. Backfill — registrar eventos para pagos que ya están confirmados
-- ======================================================================
-- Solo corre si score_historial está vacío. Crea una fila por cada pago
-- confirmado/rechazado existente, con score_total acumulado por orden
-- cronológico.
--
-- Si quieres re-correr el backfill (ej. si hubo pagos viejos sin tracking),
-- antes ejecuta: TRUNCATE public.score_historial;
-- ======================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.score_historial LIMIT 1) THEN
    INSERT INTO public.score_historial (pago_id, puntos, motivo, score_total, created_at)
    SELECT
      p.id,
      CASE p.estado
        WHEN 'confirmado' THEN 7
        WHEN 'rechazado' THEN -10
      END AS puntos,
      CASE p.estado
        WHEN 'confirmado' THEN 'Pago confirmado a tiempo'
        WHEN 'rechazado' THEN 'Pago rechazado'
      END AS motivo,
      SUM(CASE p.estado WHEN 'confirmado' THEN 7 WHEN 'rechazado' THEN -10 END)
        OVER (PARTITION BY p.user_id ORDER BY p.fecha_pago, p.id) AS score_total,
      COALESCE(p.fecha_pago::timestamptz, NOW()) AS created_at
    FROM public.pagos p
    WHERE p.estado IN ('confirmado', 'rechazado')
    ORDER BY p.fecha_pago, p.id;

    RAISE NOTICE 'Backfill ejecutado: % filas insertadas',
      (SELECT COUNT(*) FROM public.score_historial);
  ELSE
    RAISE NOTICE 'score_historial ya tiene datos, backfill omitido';
  END IF;
END $$;


-- ======================================================================
-- Verificación
-- ======================================================================
-- Después de correr, prueba con:
--   SELECT * FROM public.score_historial ORDER BY created_at DESC LIMIT 10;
-- Debería mostrar las filas de los pagos confirmados/rechazados existentes.

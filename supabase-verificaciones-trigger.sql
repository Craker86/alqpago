-- ========================================================================
-- Rentto — Trigger de notificaciones para verificaciones
-- ========================================================================
-- Cuando un admin cambia el estado de una verificación, crear notificación
-- inbox automáticamente al usuario dueño de la verificación.
--
-- Tipos:
--   verificacion_aprobada       → "Tu identidad fue verificada"
--   verificacion_rechazada      → "Verificación rechazada" (con nota)
--   verificacion_requiere_reenvio → "Reenvía tus documentos" (con nota)
--
-- Respeta notif_prefs.{tipo}.in_app del usuario (igual que los otros
-- triggers).
--
-- Idempotente. Self-contained: si `user_quiere_notif` y la columna
-- `notif_prefs` no existen aún, las crea con defaults seguros.
-- ========================================================================


-- 0. Dependencias (defensivas — si supabase-notif-prefs.sql no se corrió aún)
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS notif_prefs JSONB DEFAULT NULL;

CREATE OR REPLACE FUNCTION public.user_quiere_notif(
  p_user_id uuid,
  p_evento text,
  p_canal text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefs jsonb;
BEGIN
  SELECT notif_prefs INTO v_prefs FROM public.perfiles WHERE id = p_user_id;
  IF v_prefs IS NULL THEN RETURN TRUE; END IF;
  RETURN COALESCE((v_prefs->p_evento->>p_canal)::boolean, TRUE);
END;
$$;


CREATE OR REPLACE FUNCTION public.notif_verificacion_cambio_estado()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tipo  text;
  v_titulo text;
  v_cuerpo text;
  v_link  text;
BEGIN
  -- Solo actuar si el estado cambió
  IF NEW.estado IS NOT DISTINCT FROM OLD.estado THEN
    RETURN NEW;
  END IF;

  IF NEW.estado = 'aprobada' THEN
    v_tipo   := 'verificacion_aprobada';
    v_titulo := 'Tu identidad fue verificada';
    v_cuerpo := 'Ya puedes vincularte a propiedades en cualquier modo.';
    v_link   := '/perfil/verificar';
  ELSIF NEW.estado = 'rechazada' THEN
    v_tipo   := 'verificacion_rechazada';
    v_titulo := 'Verificación rechazada';
    v_cuerpo := COALESCE(NEW.nota_revisor,
                'Por favor revisa tus documentos y vuelve a enviarlos.');
    v_link   := '/perfil/verificar';
  ELSIF NEW.estado = 'requiere_reenvio' THEN
    v_tipo   := 'verificacion_requiere_reenvio';
    v_titulo := 'Necesitamos que reenvíes tus documentos';
    v_cuerpo := COALESCE(NEW.nota_revisor,
                'Algunos documentos no se ven con claridad. Por favor reenvíalos.');
    v_link   := '/perfil/verificar';
  ELSE
    RETURN NEW;
  END IF;

  -- Respeta preferencias in_app
  IF NOT public.user_quiere_notif(NEW.user_id, v_tipo, 'in_app') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notificaciones (user_id, tipo, titulo, cuerpo, link)
  VALUES (NEW.user_id, v_tipo, v_titulo, v_cuerpo, v_link);

  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS notif_verif_estado ON public.verificaciones;
CREATE TRIGGER notif_verif_estado
  AFTER UPDATE OF estado ON public.verificaciones
  FOR EACH ROW EXECUTE FUNCTION public.notif_verificacion_cambio_estado();


-- ========================================================================
-- Verificación
-- ========================================================================
-- 1) Aprueba una verificación pendiente como admin desde el panel
-- 2) SELECT * FROM public.notificaciones
--      WHERE tipo LIKE 'verificacion_%'
--      ORDER BY created_at DESC LIMIT 5;

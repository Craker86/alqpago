-- ========================================================================
-- Rentto — Mensajería interna inquilino ↔ propietario
-- ========================================================================
-- Modelo:
--   - Una `conversaciones` por par (propiedad, inquilino).
--   - Pre-vinculación: `vinculacion_id` queda null. El inquilino abre el
--     hilo desde el detalle del marketplace (rate limited a 5/día).
--   - Post-vinculación: cuando se efectiviza la vinculación, un trigger
--     setea `vinculacion_id` en la conversación correspondiente.
--   - `mensajes` no se borran (audit trail para disputas). Soft-archive
--     queda diferido para v2.
--
-- Idempotente. Correr después de supabase-rls.sql + supabase-notif-prefs.sql.
-- ========================================================================


-- 1. Tabla `conversaciones` ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propiedad_id UUID NOT NULL REFERENCES public.propiedades(id) ON DELETE CASCADE,
  propietario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inquilino_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vinculacion_id UUID REFERENCES public.vinculaciones(id) ON DELETE SET NULL,
  ultimo_mensaje_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Un solo hilo por par (propiedad, inquilino). Si la vinculación termina
  -- y se renueva, mantenemos la historia continua. Archivado va en v2.
  CONSTRAINT conv_par_unico UNIQUE (propiedad_id, inquilino_id),
  -- El propietario no puede ser también el inquilino del mismo hilo.
  CONSTRAINT conv_partes_distintas CHECK (propietario_id <> inquilino_id)
);

CREATE INDEX IF NOT EXISTS conv_propietario_idx
  ON public.conversaciones(propietario_id, ultimo_mensaje_at DESC);
CREATE INDEX IF NOT EXISTS conv_inquilino_idx
  ON public.conversaciones(inquilino_id, ultimo_mensaje_at DESC);


-- 2. Tabla `mensajes` ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mensajes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversacion_id UUID NOT NULL REFERENCES public.conversaciones(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contenido TEXT NOT NULL CHECK (length(trim(contenido)) BETWEEN 1 AND 2000),
  leido_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS msg_conv_creado_idx
  ON public.mensajes(conversacion_id, created_at);
CREATE INDEX IF NOT EXISTS msg_no_leidos_idx
  ON public.mensajes(conversacion_id, autor_id)
  WHERE leido_at IS NULL;


-- 3. Trigger: actualizar `ultimo_mensaje_at` al insertar mensaje ---------
CREATE OR REPLACE FUNCTION public.tocar_conversacion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversaciones
    SET ultimo_mensaje_at = NEW.created_at
    WHERE id = NEW.conversacion_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS msg_tocar_conv ON public.mensajes;
CREATE TRIGGER msg_tocar_conv
  AFTER INSERT ON public.mensajes
  FOR EACH ROW EXECUTE FUNCTION public.tocar_conversacion();


-- 4. Trigger: setear `vinculacion_id` cuando se efectiviza una vinculación
-- Cuando una vinculación pasa a `activo`, buscamos la conversación
-- correspondiente (mismo par propiedad + inquilino) y le pegamos el FK.
CREATE OR REPLACE FUNCTION public.vincular_conversacion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.estado = 'activo' AND (OLD IS NULL OR OLD.estado IS DISTINCT FROM 'activo') THEN
    UPDATE public.conversaciones
      SET vinculacion_id = NEW.id
      WHERE propiedad_id = NEW.propiedad_id
        AND inquilino_id = NEW.inquilino_id
        AND vinculacion_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vinc_a_conv ON public.vinculaciones;
CREATE TRIGGER vinc_a_conv
  AFTER INSERT OR UPDATE OF estado ON public.vinculaciones
  FOR EACH ROW EXECUTE FUNCTION public.vincular_conversacion();


-- 5. Trigger: notificación inbox al recibir un mensaje --------------------
-- Inserta una notificación en `notificaciones` para el OTRO usuario del hilo,
-- respetando `notif_prefs.mensaje_recibido.in_app`. El email se envía desde
-- el cliente (igual que el resto de eventos), respetando `.email`.
CREATE OR REPLACE FUNCTION public.notificar_mensaje()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  destinatario_id UUID;
  conv RECORD;
  v_autor_nombre TEXT;
  prefs_in_app BOOLEAN;
  preview TEXT;
BEGIN
  SELECT * INTO conv FROM public.conversaciones WHERE id = NEW.conversacion_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  destinatario_id := CASE
    WHEN NEW.autor_id = conv.propietario_id THEN conv.inquilino_id
    ELSE conv.propietario_id
  END;

  -- Respetar preferencias del destinatario. Default true si la pref no existe.
  SELECT COALESCE(
    (notif_prefs -> 'mensaje_recibido' ->> 'in_app')::boolean,
    TRUE
  ) INTO prefs_in_app
  FROM public.perfiles WHERE id = destinatario_id;

  IF NOT prefs_in_app THEN RETURN NEW; END IF;

  SELECT nombre INTO v_autor_nombre FROM public.perfiles WHERE id = NEW.autor_id;
  preview := left(NEW.contenido, 140);

  INSERT INTO public.notificaciones (user_id, tipo, titulo, cuerpo, link)
  VALUES (
    destinatario_id,
    'mensaje_recibido',
    'Mensaje nuevo de ' || COALESCE(v_autor_nombre, 'alguien'),
    preview,
    '/mensajes/' || NEW.conversacion_id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS msg_notificar ON public.mensajes;
CREATE TRIGGER msg_notificar
  AFTER INSERT ON public.mensajes
  FOR EACH ROW EXECUTE FUNCTION public.notificar_mensaje();


-- 6. Rate limit: máximo N conversaciones nuevas por inquilino por día -----
-- Se aplica solo a CREACIONES (no a mensajes dentro de un hilo existente).
-- Default: 10 hilos nuevos por 24h. Ajustable cambiando la constante.
CREATE OR REPLACE FUNCTION public.rate_limit_conversaciones()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  limite CONSTANT INT := 10;
  ventana CONSTANT INTERVAL := INTERVAL '24 hours';
  nuevas INT;
BEGIN
  SELECT COUNT(*) INTO nuevas
  FROM public.conversaciones
  WHERE inquilino_id = NEW.inquilino_id
    AND created_at > NOW() - ventana;

  IF nuevas >= limite THEN
    RAISE EXCEPTION 'Demasiadas consultas. Esperá un día antes de iniciar más conversaciones.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS conv_rate_limit ON public.conversaciones;
CREATE TRIGGER conv_rate_limit
  BEFORE INSERT ON public.conversaciones
  FOR EACH ROW EXECUTE FUNCTION public.rate_limit_conversaciones();


-- 7. RLS — conversaciones --------------------------------------------------
ALTER TABLE public.conversaciones ENABLE ROW LEVEL SECURITY;

-- SELECT: cualquiera de las dos partes (o admin)
DROP POLICY IF EXISTS "conv_select_partes" ON public.conversaciones;
CREATE POLICY "conv_select_partes"
  ON public.conversaciones FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (propietario_id, inquilino_id)
    OR EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE id = auth.uid() AND es_admin = TRUE
    )
  );

-- INSERT: solo el inquilino crea (el propietario no inicia conversaciones).
-- El propietario_id debe ser efectivamente el dueño de la propiedad.
DROP POLICY IF EXISTS "conv_insert_inquilino" ON public.conversaciones;
CREATE POLICY "conv_insert_inquilino"
  ON public.conversaciones FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = inquilino_id
    AND auth.uid() <> propietario_id
    AND EXISTS (
      SELECT 1 FROM public.propiedades
      WHERE id = propiedad_id AND user_id = propietario_id
    )
  );

-- UPDATE / DELETE: no permitidos a clientes (los triggers SECURITY DEFINER
-- son los únicos que modifican `ultimo_mensaje_at` y `vinculacion_id`).


-- 8. RLS — mensajes --------------------------------------------------------
ALTER TABLE public.mensajes ENABLE ROW LEVEL SECURITY;

-- SELECT: si soy parte de la conversación (o admin)
DROP POLICY IF EXISTS "msg_select_partes" ON public.mensajes;
CREATE POLICY "msg_select_partes"
  ON public.mensajes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversaciones c
      WHERE c.id = conversacion_id
        AND auth.uid() IN (c.propietario_id, c.inquilino_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE id = auth.uid() AND es_admin = TRUE
    )
  );

-- INSERT: solo puedo escribir si soy una de las partes Y soy yo el autor
DROP POLICY IF EXISTS "msg_insert_partes" ON public.mensajes;
CREATE POLICY "msg_insert_partes"
  ON public.mensajes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = autor_id
    AND EXISTS (
      SELECT 1 FROM public.conversaciones c
      WHERE c.id = conversacion_id
        AND auth.uid() IN (c.propietario_id, c.inquilino_id)
    )
  );

-- UPDATE: solo el destinatario (no el autor). El trigger `msg_solo_leido_at`
-- de abajo refuerza que únicamente `leido_at` pueda cambiar — las policies
-- no pueden restringir columnas directamente.
DROP POLICY IF EXISTS "msg_update_destinatario_leido" ON public.mensajes;
CREATE POLICY "msg_update_destinatario_leido"
  ON public.mensajes FOR UPDATE
  TO authenticated
  USING (
    auth.uid() <> autor_id
    AND EXISTS (
      SELECT 1 FROM public.conversaciones c
      WHERE c.id = conversacion_id
        AND auth.uid() IN (c.propietario_id, c.inquilino_id)
    )
  )
  WITH CHECK (
    auth.uid() <> autor_id
    AND EXISTS (
      SELECT 1 FROM public.conversaciones c
      WHERE c.id = conversacion_id
        AND auth.uid() IN (c.propietario_id, c.inquilino_id)
    )
  );

-- Refuerzo: trigger BEFORE UPDATE que rechaza modificar cualquier campo
-- distinto de `leido_at`. Las RLS policies no pueden filtrar por columna.
CREATE OR REPLACE FUNCTION public.mensajes_solo_leido_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.conversacion_id IS DISTINCT FROM OLD.conversacion_id
     OR NEW.autor_id IS DISTINCT FROM OLD.autor_id
     OR NEW.contenido IS DISTINCT FROM OLD.contenido
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Solo `leido_at` se puede modificar en mensajes.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS msg_solo_leido_at ON public.mensajes;
CREATE TRIGGER msg_solo_leido_at
  BEFORE UPDATE ON public.mensajes
  FOR EACH ROW EXECUTE FUNCTION public.mensajes_solo_leido_at();

-- DELETE: no permitido (audit trail).


-- 9. Publicación Realtime --------------------------------------------------
-- Para que el hook `useConversacion` reciba INSERTs en vivo, hay que
-- agregar la tabla a la publicación `supabase_realtime`.
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensajes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversaciones;


-- 10. Verificación ---------------------------------------------------------
-- SELECT relname, relrowsecurity FROM pg_class
--   WHERE relname IN ('conversaciones', 'mensajes');
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

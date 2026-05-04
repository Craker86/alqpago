-- ========================================================================
-- Rentto — Verificación de identidad (KYC)
-- ========================================================================
-- Tabla `verificaciones` + columna `perfiles.es_admin` + bucket privado
-- de Storage + policies RLS.
--
-- Caso de uso: prevenir fraudes en VE pidiendo cédula + selfie + documentos
-- adicionales según rol antes de permitir vinculaciones de modos altos.
--
-- Documentos por rol:
--   Inquilino:    cédula (frente/dorso) + selfie + ref. laboral (foto)
--                 + ref. personal (nombre + tel, no foto)
--   Propietario:  cédula (frente/dorso) + selfie + comprobante domicilio
--                 + documento de propiedad
--
-- Estados: pendiente → aprobada / rechazada / requiere_reenvio
--
-- Idempotente. Se puede correr múltiples veces sin romper nada.
-- ========================================================================


-- 1. Columna es_admin en perfiles
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS es_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Marca al admin único (única acción no idempotente — solo afecta filas con ese email)
UPDATE public.perfiles
  SET es_admin = TRUE
  WHERE email = 'jesusalcala86@gmail.com';


-- 2. Tabla verificaciones
CREATE TABLE IF NOT EXISTS public.verificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rol TEXT NOT NULL CHECK (rol IN ('inquilino', 'propietario')),
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'aprobada', 'rechazada', 'requiere_reenvio')),

  -- Identidad (todos los roles)
  cedula_numero TEXT,                  -- "V-12345678" normalizado
  cedula_frente_path TEXT,             -- ruta dentro del bucket "verificaciones"
  cedula_dorso_path TEXT,
  selfie_path TEXT,

  -- Específicos del propietario
  comprobante_domicilio_path TEXT,
  documento_propiedad_path TEXT,

  -- Específicos del inquilino
  referencia_laboral_path TEXT,
  referencia_personal_nombre TEXT,
  referencia_personal_telefono TEXT,

  -- Consentimiento + revisión
  consentimiento BOOLEAN NOT NULL DEFAULT FALSE,
  nota_revisor TEXT,                   -- motivo de rechazo / nota del admin
  revisada_por UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT verif_uniq_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS verif_estado_idx ON public.verificaciones(estado);
CREATE INDEX IF NOT EXISTS verif_user_idx   ON public.verificaciones(user_id);


-- 3. Trigger de updated_at
CREATE OR REPLACE FUNCTION public.touch_verificaciones_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS verif_updated_at ON public.verificaciones;
CREATE TRIGGER verif_updated_at
  BEFORE UPDATE ON public.verificaciones
  FOR EACH ROW EXECUTE FUNCTION public.touch_verificaciones_updated_at();


-- 4. RLS para verificaciones
ALTER TABLE public.verificaciones ENABLE ROW LEVEL SECURITY;

-- Lectura: el usuario ve la suya; los admins ven todas
DROP POLICY IF EXISTS "verif_select_own_or_admin" ON public.verificaciones;
CREATE POLICY "verif_select_own_or_admin"
  ON public.verificaciones FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE id = auth.uid() AND es_admin = TRUE
    )
  );

-- Insert: solo el propio usuario inserta su verificación
DROP POLICY IF EXISTS "verif_insert_own" ON public.verificaciones;
CREATE POLICY "verif_insert_own"
  ON public.verificaciones FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Update: el dueño puede editar mientras esté pendiente o requiere_reenvio
DROP POLICY IF EXISTS "verif_update_own_pending" ON public.verificaciones;
CREATE POLICY "verif_update_own_pending"
  ON public.verificaciones FOR UPDATE
  USING (
    user_id = auth.uid()
    AND estado IN ('pendiente', 'requiere_reenvio')
  );

-- Update: los admins pueden editar cualquiera (cambiar estado, agregar nota)
DROP POLICY IF EXISTS "verif_update_admin" ON public.verificaciones;
CREATE POLICY "verif_update_admin"
  ON public.verificaciones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE id = auth.uid() AND es_admin = TRUE
    )
  );


-- 5. Storage bucket privado
INSERT INTO storage.buckets (id, name, public)
  VALUES ('verificaciones', 'verificaciones', FALSE)
  ON CONFLICT (id) DO NOTHING;

-- 6. Storage policies
-- Convención de paths: {user_id}/{tipo}/{timestamp}.{ext}
-- foldername(name)[1] = user_id

-- Insert: el usuario sube a su propio prefix
DROP POLICY IF EXISTS "verif_storage_insert_own" ON storage.objects;
CREATE POLICY "verif_storage_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verificaciones'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- Select: el dueño ve los suyos; los admins ven todos
DROP POLICY IF EXISTS "verif_storage_select_own_or_admin" ON storage.objects;
CREATE POLICY "verif_storage_select_own_or_admin"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verificaciones'
    AND (
      auth.uid()::TEXT = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.perfiles
        WHERE id = auth.uid() AND es_admin = TRUE
      )
    )
  );

-- Update: el dueño actualiza los suyos (raro, pero por si re-suben)
DROP POLICY IF EXISTS "verif_storage_update_own" ON storage.objects;
CREATE POLICY "verif_storage_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'verificaciones'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- Delete: el dueño borra los suyos (útil al re-subir y limpiar viejos)
DROP POLICY IF EXISTS "verif_storage_delete_own" ON storage.objects;
CREATE POLICY "verif_storage_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'verificaciones'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );


-- ========================================================================
-- Verificación rápida (correr después)
-- ========================================================================
-- SELECT id, rol, estado, cedula_numero FROM public.verificaciones;
-- SELECT id, email, es_admin FROM public.perfiles WHERE es_admin = TRUE;
-- SELECT id, name, public FROM storage.buckets WHERE id = 'verificaciones';

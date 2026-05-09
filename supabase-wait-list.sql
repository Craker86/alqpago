-- ========================================================================
-- Rentto — Wait list de pre-registro
-- ========================================================================
-- Tabla pública de captura de interesados. Cualquiera puede insertarse
-- (form en la landing); solo admins pueden ver / actualizar / borrar.
--
-- Idempotente.
-- ========================================================================


-- 1. Tabla
CREATE TABLE IF NOT EXISTS public.wait_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  nombre TEXT,
  rol TEXT CHECK (rol IN ('inquilino', 'propietario', 'ambos')),
  ciudad TEXT DEFAULT 'Caracas',
  origen TEXT DEFAULT 'landing',  -- landing | whatsapp | otro
  notas_admin TEXT,
  contactado BOOLEAN NOT NULL DEFAULT FALSE,
  contactado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wait_list_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS wait_list_created_idx ON public.wait_list(created_at DESC);
CREATE INDEX IF NOT EXISTS wait_list_contactado_idx ON public.wait_list(contactado);


-- 2. RLS
ALTER TABLE public.wait_list ENABLE ROW LEVEL SECURITY;

-- Cualquiera (anon o autenticado) puede insertarse en la lista
DROP POLICY IF EXISTS "wait_list_insert_publico" ON public.wait_list;
CREATE POLICY "wait_list_insert_publico"
  ON public.wait_list FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Solo admins pueden VER la lista
DROP POLICY IF EXISTS "wait_list_select_admin" ON public.wait_list;
CREATE POLICY "wait_list_select_admin"
  ON public.wait_list FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE id = auth.uid() AND es_admin = TRUE
    )
  );

-- Solo admins actualizan (marcar contactado, agregar notas)
DROP POLICY IF EXISTS "wait_list_update_admin" ON public.wait_list;
CREATE POLICY "wait_list_update_admin"
  ON public.wait_list FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE id = auth.uid() AND es_admin = TRUE
    )
  );

-- Solo admins borran
DROP POLICY IF EXISTS "wait_list_delete_admin" ON public.wait_list;
CREATE POLICY "wait_list_delete_admin"
  ON public.wait_list FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE id = auth.uid() AND es_admin = TRUE
    )
  );


-- 3. Verificación
-- INSERT INTO public.wait_list (email, nombre, rol, origen)
--   VALUES ('test@example.com', 'Test User', 'inquilino', 'landing');
-- SELECT * FROM public.wait_list ORDER BY created_at DESC LIMIT 10;

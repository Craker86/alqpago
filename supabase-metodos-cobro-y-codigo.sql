-- ========================================================================
-- Rentto — Métodos de cobro del propietario + Código único por pago
-- ========================================================================
-- Dos cambios complementarios para reducir fricción del flujo de pago:
--
-- 1. `metodos_cobro`: cada propietario configura UNA VEZ sus datos de
--    cobro (pago móvil, Zelle, transferencia, Binance). El inquilino
--    los ve en /pagar y los copia al portapapeles. No más tipear datos
--    sueltos enviados por WhatsApp.
--
-- 2. `pagos.codigo_rentto`: cada pago tiene un código único corto
--    (ej. "R-A4B7K9"). El inquilino lo pega en el concepto de la
--    transferencia bancaria; el propietario filtra por código en
--    /cobros para emparejar en 1 segundo.
--
-- Idempotente. Correr después de supabase-rls.sql.
-- ========================================================================


-- ========================================================================
-- PARTE 1 — Métodos de cobro
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.metodos_cobro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('pago_movil', 'zelle', 'transferencia', 'binance', 'efectivo')),

  -- Datos específicos por tipo (no todos aplican a todos los métodos)
  telefono TEXT,        -- pago_movil
  cedula TEXT,          -- pago_movil, transferencia
  banco TEXT,           -- pago_movil, transferencia
  email TEXT,           -- zelle
  cuenta TEXT,          -- transferencia (número de cuenta)
  wallet_id TEXT,       -- binance (Pay ID o wallet)
  nota TEXT,            -- texto libre que se muestra al inquilino (ej. "preferible antes del 5")

  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Un solo registro por (propietario, tipo) — si el dueño quiere cambiar
  -- sus datos hace UPDATE, no nuevo INSERT.
  CONSTRAINT metodos_cobro_user_tipo_unico UNIQUE (user_id, tipo)
);

CREATE INDEX IF NOT EXISTS metodos_cobro_user_idx
  ON public.metodos_cobro(user_id, activo) WHERE activo = TRUE;


-- Trigger: tocar updated_at en cada UPDATE
CREATE OR REPLACE FUNCTION public.tocar_metodo_cobro()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS metodos_cobro_touch ON public.metodos_cobro;
CREATE TRIGGER metodos_cobro_touch
  BEFORE UPDATE ON public.metodos_cobro
  FOR EACH ROW EXECUTE FUNCTION public.tocar_metodo_cobro();


-- RLS — metodos_cobro
ALTER TABLE public.metodos_cobro ENABLE ROW LEVEL SECURITY;

-- SELECT:
--   1. El dueño (gestiona sus propios métodos)
--   2. Inquilinos vinculados a una propiedad del dueño (necesitan verlos para pagar)
DROP POLICY IF EXISTS "metodos_select_dueno_o_inquilino" ON public.metodos_cobro;
CREATE POLICY "metodos_select_dueno_o_inquilino"
  ON public.metodos_cobro FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.vinculaciones v
      JOIN public.propiedades p ON p.id = v.propiedad_id
      WHERE v.inquilino_id = auth.uid()
        AND v.estado = 'activo'
        AND p.user_id = metodos_cobro.user_id
    )
  );

-- INSERT / UPDATE / DELETE: solo el dueño
DROP POLICY IF EXISTS "metodos_insert_dueno" ON public.metodos_cobro;
CREATE POLICY "metodos_insert_dueno"
  ON public.metodos_cobro FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "metodos_update_dueno" ON public.metodos_cobro;
CREATE POLICY "metodos_update_dueno"
  ON public.metodos_cobro FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "metodos_delete_dueno" ON public.metodos_cobro;
CREATE POLICY "metodos_delete_dueno"
  ON public.metodos_cobro FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- ========================================================================
-- PARTE 2 — Código único por pago
-- ========================================================================

-- Agregar columna `codigo_rentto` a `pagos` si no existe.
-- Formato: "R-XXXXXX" donde XXXXXX son 6 chars del alfabeto seguro.
ALTER TABLE public.pagos
  ADD COLUMN IF NOT EXISTS codigo_rentto TEXT;

-- Unique parcial: solo donde codigo_rentto no es null (rows viejas quedan
-- sin código, no las migramos).
CREATE UNIQUE INDEX IF NOT EXISTS pagos_codigo_rentto_unico
  ON public.pagos (codigo_rentto)
  WHERE codigo_rentto IS NOT NULL;

CREATE INDEX IF NOT EXISTS pagos_codigo_rentto_idx
  ON public.pagos (codigo_rentto)
  WHERE codigo_rentto IS NOT NULL;


-- Función: generar un código único.
-- Alfabeto sin caracteres confundibles (sin 0/O, sin 1/I, sin L).
-- 28 chars × 6 posiciones = 481M combinaciones. Probabilidad de colisión
-- después de 100k pagos: ~1%. Si choca, hacemos retry hasta 10 veces.
CREATE OR REPLACE FUNCTION public.generar_codigo_pago()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alfabeto CONSTANT TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';  -- 31 chars seguros
  largo CONSTANT INT := 6;
  intentos_max CONSTANT INT := 10;
  candidato TEXT;
  existe BOOLEAN;
  i INT;
BEGIN
  FOR i IN 1..intentos_max LOOP
    candidato := 'R-';
    FOR j IN 1..largo LOOP
      candidato := candidato || substr(alfabeto, (random() * length(alfabeto))::int + 1, 1);
    END LOOP;

    SELECT EXISTS(SELECT 1 FROM public.pagos WHERE codigo_rentto = candidato)
      INTO existe;

    IF NOT existe THEN
      RETURN candidato;
    END IF;
  END LOOP;

  -- 10 colisiones seguidas es prácticamente imposible. Si llega acá, algo
  -- raro está pasando (random roto, tabla absurdamente grande). Subimos a
  -- 8 chars para emergencia.
  candidato := 'R-';
  FOR j IN 1..8 LOOP
    candidato := candidato || substr(alfabeto, (random() * length(alfabeto))::int + 1, 1);
  END LOOP;
  RETURN candidato;
END;
$$;


-- Trigger: si el INSERT no trae codigo_rentto, generarlo automáticamente.
-- El cliente puede pasar uno propio (cuando lo pre-genera para mostrárselo
-- al inquilino antes de la transferencia) y este trigger no lo pisa.
CREATE OR REPLACE FUNCTION public.asignar_codigo_pago()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.codigo_rentto IS NULL OR length(trim(NEW.codigo_rentto)) = 0 THEN
    NEW.codigo_rentto := public.generar_codigo_pago();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pagos_codigo_auto ON public.pagos;
CREATE TRIGGER pagos_codigo_auto
  BEFORE INSERT ON public.pagos
  FOR EACH ROW EXECUTE FUNCTION public.asignar_codigo_pago();


-- ========================================================================
-- Verificación
-- ========================================================================
-- Después de correr, probá:
--
-- 1. SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'metodos_cobro';
-- 2. SELECT public.generar_codigo_pago();   -- debe devolver "R-XXXXXX"
-- 3. Crear un pago de prueba sin codigo_rentto → debe asignarse automático
-- 4. Crear un método de cobro como propietario y verificar que un inquilino
--    vinculado puede leerlo (RLS).

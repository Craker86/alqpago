import { createClient } from "@supabase/supabase-js";

// ============================================================================
// CRON: limpieza de imágenes de verificaciones >90 días post-aprobación
// ============================================================================
// Vercel Cron lo invoca diariamente con header Authorization: Bearer ${CRON_SECRET}.
// Usa service_role para bypassear RLS y borrar archivos del bucket privado.
//
// Política:
//   - Solo procesa verificaciones con estado IN ('aprobada', 'rechazada')
//     y reviewed_at < (NOW - 90 días)
//   - Borra los archivos físicos del Storage
//   - Limpia los paths en la fila (deja NULL) PERO mantiene metadatos:
//     user_id, rol, estado, cedula_numero, reviewed_at, revisada_por
//   - Escribe nota_revisor con "Imágenes purgadas el YYYY-MM-DD por retención"
//   - Idempotente: si ya está purgada (todos los paths son NULL), la salta
// ============================================================================

const PATH_COLUMNS = [
  "cedula_frente_path",
  "cedula_dorso_path",
  "selfie_path",
  "comprobante_domicilio_path",
  "documento_propiedad_path",
  "referencia_laboral_path",
];

const RETENCION_DIAS = 90;

export async function GET(request) {
  // 1. Verificar que el llamado viene de Vercel Cron (o de quien tiene CRON_SECRET)
  const authHeader = request.headers.get("authorization") || "";
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expectedToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Validar configuración
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return Response.json(
      { error: "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en env" },
      { status: 500 }
    );
  }

  // Cliente con permisos elevados (bypassa RLS)
  const supa = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 3. Buscar verificaciones candidatas a limpieza
  const corte = new Date(Date.now() - RETENCION_DIAS * 24 * 60 * 60 * 1000).toISOString();
  const { data: candidatas, error: queryErr } = await supa
    .from("verificaciones")
    .select("id, user_id, reviewed_at, " + PATH_COLUMNS.join(", "))
    .in("estado", ["aprobada", "rechazada"])
    .lt("reviewed_at", corte);

  if (queryErr) {
    return Response.json({ error: queryErr.message }, { status: 500 });
  }

  let procesadas = 0;
  let archivosBorrados = 0;
  const errores = [];

  for (const v of candidatas || []) {
    // Recolectar paths que aún no fueron borrados (por idempotencia)
    const paths = PATH_COLUMNS.map((c) => v[c]).filter(Boolean);
    if (paths.length === 0) continue; // ya purgada

    // Borrar de Storage
    const { error: stoErr } = await supa.storage
      .from("verificaciones")
      .remove(paths);
    if (stoErr) {
      errores.push({ id: v.id, error: "storage: " + stoErr.message });
      continue;
    }
    archivosBorrados += paths.length;

    // Limpiar paths en la fila
    const update = {};
    PATH_COLUMNS.forEach((c) => { update[c] = null; });
    update.nota_revisor = `Imágenes purgadas automáticamente el ${new Date().toISOString().slice(0, 10)} (retención de ${RETENCION_DIAS} días).`;

    const { error: updErr } = await supa
      .from("verificaciones")
      .update(update)
      .eq("id", v.id);
    if (updErr) {
      errores.push({ id: v.id, error: "db: " + updErr.message });
      continue;
    }
    procesadas++;
  }

  return Response.json({
    ok: true,
    corte,
    candidatas: (candidatas || []).length,
    procesadas,
    archivos_borrados: archivosBorrados,
    errores,
  });
}

import { createClient } from "@supabase/supabase-js";

// ============================================================================
// CRON: actualización de la tasa BCV (USD/Bs)
// ============================================================================
// Vercel Cron lo invoca cada 4 horas con header Authorization: Bearer ${CRON_SECRET}.
//
// Estrategia:
//   1. Intenta scraping directo de bcv.org.ve (regex sobre el HTML público)
//   2. Si falla (SSL, cambio de estructura, timeout), fallback a
//      pydolarvenezuela-api.vercel.app (proxy gratuito y mantenido)
//   3. Inserta nueva fila en `tasa_bcv` con la tasa obtenida
//
// El BCV solo publica tasa de lunes a viernes; en fines de semana mantiene
// la del último día hábil. No deduplicamos: cada corrida deja un snapshot
// con su timestamp para que el frontend pueda mostrar "actualizada hace X".
// ============================================================================

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BCV_URL = "https://www.bcv.org.ve/";
const PYDOLAR_URL = "https://pydolarvenezuela-api.vercel.app/api/v1/dollar?monitor=bcv";
const TIMEOUT_MS = 8000;

export async function GET(request) {
  // 1. Auth
  const auth = request.headers.get("authorization") || "";
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return Response.json(
      { error: "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  let tasa = null;
  let fuente = null;
  const errores = [];

  // 2. Intento BCV directo
  try {
    const res = await fetch(BCV_URL, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // BCV a veces tiene certificados con problemas; el fetch fallará y
      // pasaremos al fallback. No intentamos bypassear SSL: si BCV no
      // funciona desde Vercel, mejor el fallback que confiar en un agente
      // permisivo.
    });
    if (res.ok) {
      const html = await res.text();
      // El HTML del BCV tiene una sección con id="dolar" que contiene la
      // tasa dentro de un <strong>. Formato VE: "61,2600" (coma decimal).
      const match = html.match(/id=["']dolar["'][\s\S]*?<strong>\s*([\d.,]+)\s*<\/strong>/i);
      if (match) {
        const raw = match[1].trim();
        // Normalizar: quitar puntos de miles, cambiar coma decimal a punto
        const parsed = parseFloat(raw.replace(/\./g, "").replace(",", "."));
        if (Number.isFinite(parsed) && parsed > 0) {
          tasa = parsed;
          fuente = "bcv.org.ve";
        }
      }
    } else {
      errores.push({ source: "bcv", status: res.status });
    }
  } catch (e) {
    errores.push({ source: "bcv", error: e.message || String(e) });
  }

  // 3. Fallback: pydolarvenezuela
  if (!tasa) {
    try {
      const res = await fetch(PYDOLAR_URL, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        const price = data?.monitors?.bcv?.price ?? data?.price ?? data?.monitor?.price;
        if (Number.isFinite(price) && price > 0) {
          tasa = price;
          fuente = "pydolarvenezuela";
        } else {
          errores.push({ source: "pydolarvenezuela", error: "respuesta sin price válido" });
        }
      } else {
        errores.push({ source: "pydolarvenezuela", status: res.status });
      }
    } catch (e) {
      errores.push({ source: "pydolarvenezuela", error: e.message || String(e) });
    }
  }

  if (!tasa) {
    return Response.json(
      {
        ok: false,
        error: "No se pudo obtener la tasa de ninguna fuente",
        errores,
      },
      { status: 502 }
    );
  }

  // 4. Insert en Supabase con service_role
  const supa = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error: insertErr } = await supa
    .from("tasa_bcv")
    .insert({ tasa })
    .select()
    .single();

  if (insertErr) {
    return Response.json(
      { ok: false, error: insertErr.message, tasa, fuente },
      { status: 500 }
    );
  }

  return Response.json({
    ok: true,
    tasa,
    fuente,
    insertado_en: data?.created_at,
    errores: errores.length > 0 ? errores : undefined,
  });
}

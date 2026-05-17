import { supabase } from "./supabase";

// Envía una notificación por email vía /api/notificar.
// Adjunta el JWT de Supabase para autenticar la llamada — el endpoint
// rechaza peticiones sin sesión válida.
//
// Si el usuario no tiene sesión, retorna { ok: false } sin lanzar
// (los callers ya hacen .catch(() => {}) para no interrumpir el flujo
// principal por una falla de email).
export async function enviarNotificacion({ tipo, email, data }) {
  if (!email) return { ok: false, error: "sin-email" };

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return { ok: false, error: "sin-sesion" };

  const res = await fetch("/api/notificar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ tipo, email, data }),
  });

  if (!res.ok) {
    return { ok: false, error: `http-${res.status}` };
  }
  return { ok: true };
}

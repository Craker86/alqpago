import { supabase } from "./supabase";

// ============================================================================
// Helpers de conversaciones
// ============================================================================
// `obtenerOCrearConversacion` es el punto de entrada desde el marketplace.
// Idempotente: si ya hay un hilo para ese par (propiedad, inquilino), lo
// devuelve; si no, lo crea. El rate limit del backend (max 10/24h) se aplica
// vía trigger en supabase-mensajeria.sql; acá traducimos el error.
// ============================================================================

export async function obtenerOCrearConversacion({ propiedadId, propietarioId }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Necesitás iniciar sesión");

  // No tiene sentido conversar con uno mismo
  if (session.user.id === propietarioId) {
    throw new Error("No podés iniciar una conversación con vos mismo");
  }

  // 1. Buscar conversación existente
  const { data: existente } = await supabase
    .from("conversaciones")
    .select("id")
    .eq("propiedad_id", propiedadId)
    .eq("inquilino_id", session.user.id)
    .maybeSingle();

  if (existente) return existente;

  // 2. Crear
  const { data: nueva, error } = await supabase
    .from("conversaciones")
    .insert({
      propiedad_id: propiedadId,
      propietario_id: propietarioId,
      inquilino_id: session.user.id,
    })
    .select("id")
    .single();

  if (error) {
    // Race condition: alguien creó la misma conversación entre nuestra
    // búsqueda y nuestro insert. Volvemos a buscar.
    if (error.code === "23505") {
      const { data: ahoraExiste } = await supabase
        .from("conversaciones")
        .select("id")
        .eq("propiedad_id", propiedadId)
        .eq("inquilino_id", session.user.id)
        .single();
      return ahoraExiste;
    }
    // Rate limit del trigger
    if (error.message?.includes("Demasiadas consultas")) {
      throw new Error("Ya iniciaste varias conversaciones hoy. Probá mañana.");
    }
    throw error;
  }

  return nueva;
}

export async function marcarLeidos(conversacionId, userId) {
  // Marca todos los mensajes recibidos en una conversación como leídos.
  // El trigger en mensajes valida que solo cambie `leido_at`.
  return supabase
    .from("mensajes")
    .update({ leido_at: new Date().toISOString() })
    .eq("conversacion_id", conversacionId)
    .neq("autor_id", userId)
    .is("leido_at", null);
}

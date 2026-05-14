"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "./supabase";

// ============================================================================
// useConversacion: hook con suscripción Realtime a una conversación.
// ============================================================================
// Lee el historial inicial + se suscribe a INSERTs nuevos vía
// supabase_realtime. La tabla `mensajes` debe estar en la publicación
// (lo hace supabase-mensajeria.sql §9).
// ============================================================================

export function useConversacion(conversacionId) {
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Set de IDs para evitar duplicados cuando un INSERT propio llega
  // primero por la respuesta del cliente y después por Realtime.
  const vistosRef = useRef(new Set());

  const agregarMensaje = useCallback((m) => {
    if (!m) return;
    if (vistosRef.current.has(m.id)) return;
    vistosRef.current.add(m.id);
    setMensajes((prev) => [...prev, m]);
  }, []);

  // Carga inicial
  useEffect(() => {
    if (!conversacionId) return;
    let cancelado = false;

    async function cargar() {
      setCargando(true);
      const { data, error: err } = await supabase
        .from("mensajes")
        .select("*")
        .eq("conversacion_id", conversacionId)
        .order("created_at", { ascending: true });

      if (cancelado) return;
      if (err) {
        setError(err.message);
      } else {
        vistosRef.current = new Set((data || []).map((m) => m.id));
        setMensajes(data || []);
      }
      setCargando(false);
    }

    cargar();
    return () => { cancelado = true; };
  }, [conversacionId]);

  // Suscripción Realtime
  useEffect(() => {
    if (!conversacionId) return;

    const canal = supabase
      .channel(`conv:${conversacionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensajes",
          filter: `conversacion_id=eq.${conversacionId}`,
        },
        (payload) => agregarMensaje(payload.new)
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "mensajes",
          filter: `conversacion_id=eq.${conversacionId}`,
        },
        (payload) => {
          // Actualizar leido_at en el state local cuando el otro lado
          // marca como leído.
          setMensajes((prev) =>
            prev.map((m) => (m.id === payload.new.id ? payload.new : m))
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, [conversacionId, agregarMensaje]);

  return { mensajes, cargando, error, agregarOptimistico: agregarMensaje };
}

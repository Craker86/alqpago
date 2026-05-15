"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { useConversacion } from "../../lib/useConversacion";
import { marcarLeidos } from "../../lib/conversaciones";
import { ArrowLeft, Home, ShieldCheck } from "lucide-react";
import MessageBubble from "../../MessageBubble";
import MessageInput from "../../MessageInput";

export default function Thread() {
  const params = useParams();
  const router = useRouter();
  const convId = params?.id;

  const [yo, setYo] = useState(null);
  const [conv, setConv] = useState(null);
  const [otro, setOtro] = useState(null);
  const [propiedad, setPropiedad] = useState(null);
  const [verificado, setVerificado] = useState(false);
  const [cargandoMeta, setCargandoMeta] = useState(true);
  const [errorAcceso, setErrorAcceso] = useState(false);

  const { mensajes, cargando: cargandoMsgs, agregarOptimistico } = useConversacion(convId);
  const bottomRef = useRef(null);

  // Sesión + metadatos (conversación, otro perfil, propiedad)
  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      if (cancelado) return;
      setYo(session.user.id);

      const { data: c, error: errConv } = await supabase
        .from("conversaciones")
        .select("*")
        .eq("id", convId)
        .maybeSingle();

      if (cancelado) return;
      if (errConv || !c) { setErrorAcceso(true); setCargandoMeta(false); return; }
      if (![c.propietario_id, c.inquilino_id].includes(session.user.id)) {
        setErrorAcceso(true);
        setCargandoMeta(false);
        return;
      }
      setConv(c);

      const otroId = c.propietario_id === session.user.id ? c.inquilino_id : c.propietario_id;
      const [{ data: perfil }, { data: prop }, { data: verif }] = await Promise.all([
        supabase.from("perfiles").select("id, nombre").eq("id", otroId).maybeSingle(),
        supabase.from("propiedades").select("id, nombre, user_id").eq("id", c.propiedad_id).maybeSingle(),
        supabase.from("verificaciones").select("estado").eq("user_id", otroId).maybeSingle(),
      ]);
      if (cancelado) return;
      setOtro(perfil);
      setPropiedad(prop);
      setVerificado(verif?.estado === "aprobada");
      setCargandoMeta(false);
    }
    cargar();
    return () => { cancelado = true; };
  }, [convId, router]);

  // Marcar como leídos cuando llegan mensajes y la pestaña está visible
  useEffect(() => {
    if (!yo || !convId || mensajes.length === 0) return;
    const hayNoLeidosDelOtro = mensajes.some(
      (m) => m.autor_id !== yo && !m.leido_at
    );
    if (!hayNoLeidosDelOtro) return;
    marcarLeidos(convId, yo);
  }, [yo, convId, mensajes]);

  // Autoscroll al final cuando llegan mensajes nuevos
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes.length]);

  async function enviar(texto) {
    if (!yo || !convId) return;
    const { data: nuevo, error } = await supabase
      .from("mensajes")
      .insert({
        conversacion_id: convId,
        autor_id: yo,
        contenido: texto,
      })
      .select()
      .single();
    if (error) {
      alert("No se pudo enviar el mensaje: " + error.message);
      return;
    }

    // Optimistic update: agregamos al state local sin esperar el echo de
    // Realtime. El `vistosRef` del hook deduplica cuando llegue el INSERT.
    agregarOptimistico(nuevo);

    // Trigger envía notificación inbox al destinatario. Acá disparamos el
    // email también, respetando notif_prefs.mensaje_recibido.email.
    const destinatarioId =
      conv?.propietario_id === yo ? conv?.inquilino_id : conv?.propietario_id;
    if (destinatarioId) {
      enviarEmailMensaje(destinatarioId, nuevo, propiedad);
    }
  }

  if (errorAcceso) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-5">
        <div className="text-center">
          <p className="text-sm text-fg-muted">Esta conversación no existe o no tenés acceso.</p>
          <Link
            href="/mensajes"
            className="inline-flex items-center gap-1 text-sm text-brand-700 font-semibold mt-4 hover:underline"
          >
            <ArrowLeft size={14} strokeWidth={2.25} /> Volver al inbox
          </Link>
        </div>
      </div>
    );
  }

  if (cargandoMeta || cargandoMsgs) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center">
        <p className="text-fg-subtle text-sm">Cargando…</p>
      </div>
    );
  }

  const nombre = otro?.nombre || "Sin nombre";
  const inicial = (nombre[0] || "?").toUpperCase();

  return (
    <div className="min-h-screen bg-surface-muted flex flex-col">
      <header className="sticky top-0 z-20 bg-surface border-b border-stroke">
        <div className="max-w-[480px] mx-auto px-3 py-2.5 flex items-center gap-3">
          <Link
            href="/mensajes"
            aria-label="Volver"
            className="w-9 h-9 rounded-pill flex items-center justify-center text-fg-muted hover:bg-surface-subtle transition"
          >
            <ArrowLeft size={18} strokeWidth={2.25} />
          </Link>
          <div className="w-9 h-9 bg-brand-100 text-brand-800 rounded-pill flex items-center justify-center font-bold text-sm flex-shrink-0">
            {inicial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-fg truncate">{nombre}</p>
              {verificado && (
                <ShieldCheck size={12} className="text-success-600 flex-shrink-0" strokeWidth={2.5} />
              )}
            </div>
            {propiedad?.nombre && (
              <Link
                href={`/propiedades/${propiedad.id}`}
                className="text-[11px] text-fg-muted hover:text-brand-700 inline-flex items-center gap-1 truncate transition"
              >
                <Home size={10} strokeWidth={2} className="flex-shrink-0" />
                <span className="truncate">{propiedad.nombre}</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[480px] mx-auto px-3 py-4 flex flex-col gap-2">
          {mensajes.length === 0 ? (
            <div className="text-center text-xs text-fg-subtle py-8 px-6">
              Todavía no hay mensajes. Escribí el primero.
            </div>
          ) : (
            mensajes.map((m) => (
              <MessageBubble key={m.id} mensaje={m} mio={m.autor_id === yo} />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      <MessageInput onSubmit={enviar} />
    </div>
  );
}

// ============================================================================

async function enviarEmailMensaje(destinatarioId, mensaje, propiedad) {
  const { data: dest } = await supabase
    .from("perfiles")
    .select("email, notif_prefs")
    .eq("id", destinatarioId)
    .single();
  if (!dest?.email) return;
  const emailOk = dest?.notif_prefs?.mensaje_recibido?.email ?? true;
  if (!emailOk) return;

  const { data: { session } } = await supabase.auth.getSession();
  const { data: autorPerfil } = await supabase
    .from("perfiles")
    .select("nombre")
    .eq("id", session.user.id)
    .maybeSingle();

  fetch("/api/notificar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tipo: "mensaje_recibido",
      email: dest.email,
      data: {
        autor_nombre: autorPerfil?.nombre || "alguien",
        propiedad_nombre: propiedad?.nombre || "una propiedad",
        preview: mensaje.contenido.slice(0, 140),
        conversacion_id: mensaje.conversacion_id,
      },
    }),
  }).catch(() => {});
}

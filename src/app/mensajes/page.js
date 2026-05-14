"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { MessageCircle, ArrowLeft } from "lucide-react";
import ThreadCard from "../ThreadCard";

export default function MensajesIndex() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [yo, setYo] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      if (cancelado) return;
      setYo(session.user.id);

      // Conversaciones donde soy propietario o inquilino
      const { data: convs } = await supabase
        .from("conversaciones")
        .select("*")
        .or(`propietario_id.eq.${session.user.id},inquilino_id.eq.${session.user.id}`)
        .order("ultimo_mensaje_at", { ascending: false });

      if (cancelado || !convs || convs.length === 0) {
        setItems([]);
        setCargando(false);
        return;
      }

      // Conjuntos de IDs a enriquecer
      const otrosIds = new Set();
      const propIds = new Set();
      convs.forEach((c) => {
        const otro = c.propietario_id === session.user.id ? c.inquilino_id : c.propietario_id;
        otrosIds.add(otro);
        propIds.add(c.propiedad_id);
      });

      const [{ data: perfiles }, { data: propiedades }, { data: verifs }] = await Promise.all([
        supabase.from("perfiles").select("id, nombre").in("id", [...otrosIds]),
        supabase.from("propiedades").select("id, nombre").in("id", [...propIds]),
        supabase.from("verificaciones").select("user_id, estado").in("user_id", [...otrosIds]),
      ]);

      const perfilPorId = Object.fromEntries((perfiles || []).map((p) => [p.id, p]));
      const propPorId = Object.fromEntries((propiedades || []).map((p) => [p.id, p]));
      const verifPorId = Object.fromEntries((verifs || []).map((v) => [v.user_id, v]));

      // Conteo de no leídos por conversación (donde yo NO soy el autor)
      const convIds = convs.map((c) => c.id);
      const { data: noLeidos } = await supabase
        .from("mensajes")
        .select("conversacion_id, autor_id")
        .in("conversacion_id", convIds)
        .neq("autor_id", session.user.id)
        .is("leido_at", null);
      const unreadsPorConv = {};
      (noLeidos || []).forEach((m) => {
        unreadsPorConv[m.conversacion_id] = (unreadsPorConv[m.conversacion_id] || 0) + 1;
      });

      const enriquecidos = convs.map((c) => {
        const otroId = c.propietario_id === session.user.id ? c.inquilino_id : c.propietario_id;
        return {
          conversacion: c,
          otro: perfilPorId[otroId] || null,
          propiedad: propPorId[c.propiedad_id] || null,
          verificado: verifPorId[otroId]?.estado === "aprobada",
          unreads: unreadsPorConv[c.id] || 0,
        };
      });

      if (!cancelado) {
        setItems(enriquecidos);
        setCargando(false);
      }
    }

    cargar();
    return () => { cancelado = true; };
  }, []);

  if (cargando) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center">
        <p className="text-fg-subtle text-sm">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-muted pb-24">
      <div className="max-w-[480px] mx-auto px-5">
        <Link
          href="/perfil"
          className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mt-5 mb-2 transition"
        >
          <ArrowLeft size={14} strokeWidth={2.25} /> Volver al perfil
        </Link>

        <header className="mt-2 pb-4">
          <div className="flex items-center gap-2">
            <MessageCircle size={22} className="text-brand-700" strokeWidth={2.25} />
            <h1 className="text-2xl font-bold text-fg">Mensajes</h1>
          </div>
          <p className="text-sm text-fg-muted mt-1">
            {items.length === 0
              ? "Sin conversaciones todavía"
              : `${items.length} ${items.length === 1 ? "conversación" : "conversaciones"}`}
          </p>
        </header>

        {items.length === 0 ? (
          <div className="bg-surface rounded-card shadow-card p-10 text-center mt-2">
            <div className="w-14 h-14 bg-brand-50 rounded-pill flex items-center justify-center mx-auto">
              <MessageCircle size={24} className="text-brand-300" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-semibold text-fg mt-4">Tu inbox está vacío</p>
            <p className="text-xs text-fg-muted mt-1 max-w-[280px] mx-auto leading-relaxed">
              Cuando consultes una propiedad o un inquilino te escriba, los hilos van a aparecer acá.
            </p>
            <Link
              href="/propiedades"
              className="inline-flex items-center justify-center gap-2 mt-5 px-5 py-2.5 bg-brand-800 text-fg-inverse rounded-pill text-xs font-semibold shadow-card hover:bg-brand-900 transition"
            >
              Explorar propiedades
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <ThreadCard
                key={item.conversacion.id}
                conversacion={item.conversacion}
                otro={item.otro}
                propiedad={item.propiedad}
                verificado={item.verificado}
                unreads={item.unreads}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

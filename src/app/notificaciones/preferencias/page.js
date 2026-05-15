"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  DollarSign,
  Users,
  Smartphone,
  Mail,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  MessageCircle,
} from "lucide-react";

const EVENTOS_INQUILINO = [
  { id: "pago_confirmado", titulo: "Pago confirmado", desc: "Cuando el propietario confirma tu pago", Icon: CheckCircle2, tone: "success" },
  { id: "pago_rechazado", titulo: "Pago rechazado", desc: "Cuando el propietario rechaza un pago", Icon: XCircle, tone: "danger" },
];

const EVENTOS_PROPIETARIO = [
  { id: "pago_recibido", titulo: "Pago recibido", desc: "Cuando un inquilino te envía un pago", Icon: DollarSign, tone: "warning" },
  { id: "inquilino_vinculado", titulo: "Inquilino vinculado", desc: "Cuando un nuevo inquilino se vincula a tu propiedad", Icon: Users, tone: "brand" },
];

const EVENTOS_VERIFICACION = [
  { id: "verificacion_aprobada", titulo: "Verificación aprobada", desc: "Cuando tu identidad es verificada por el equipo Rentto", Icon: ShieldCheck, tone: "success" },
  { id: "verificacion_rechazada", titulo: "Verificación rechazada", desc: "Cuando tu solicitud de verificación es rechazada", Icon: ShieldAlert, tone: "danger" },
  { id: "verificacion_requiere_reenvio", titulo: "Reenvío requerido", desc: "Cuando necesitamos que reenvíes algunos documentos", Icon: ShieldQuestion, tone: "warning" },
];

const EVENTOS_MENSAJERIA = [
  { id: "mensaje_recibido", titulo: "Mensaje nuevo", desc: "Cuando alguien te escribe en una conversación", Icon: MessageCircle, tone: "brand" },
];

const DEFAULT_PREFS = {
  pago_confirmado: { in_app: true, email: true },
  pago_rechazado: { in_app: true, email: true },
  pago_recibido: { in_app: true, email: true },
  inquilino_vinculado: { in_app: true, email: true },
  verificacion_aprobada: { in_app: true, email: true },
  verificacion_rechazada: { in_app: true, email: true },
  verificacion_requiere_reenvio: { in_app: true, email: true },
  mensaje_recibido: { in_app: true, email: true },
};

export default function PreferenciasNotif() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [rol, setRol] = useState("inquilino");
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const { data: perfil } = await supabase
        .from("perfiles")
        .select("rol, notif_prefs")
        .eq("id", session.user.id)
        .single();

      if (perfil?.rol) setRol(perfil.rol);
      if (perfil?.notif_prefs) {
        // Merge para que nuevos eventos añadidos en el futuro tengan default
        setPrefs({ ...DEFAULT_PREFS, ...perfil.notif_prefs });
      }
      setCargando(false);
    }
    cargar();
  }, []);

  function toggle(eventoId, canal) {
    setPrefs((p) => ({
      ...p,
      [eventoId]: { ...p[eventoId], [canal]: !p[eventoId][canal] },
    }));
    setMensaje("");
  }

  async function guardar() {
    setGuardando(true);
    setMensaje("");
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase
      .from("perfiles")
      .update({ notif_prefs: prefs })
      .eq("id", session.user.id);
    if (error) {
      setMensaje("Error al guardar: " + error.message);
    } else {
      setMensaje("Preferencias guardadas");
    }
    setGuardando(false);
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center">
        <p className="text-fg-subtle text-sm">Cargando…</p>
      </div>
    );
  }

  const eventos = [
    ...(rol === "propietario"
      ? [...EVENTOS_INQUILINO, ...EVENTOS_PROPIETARIO]
      : EVENTOS_INQUILINO),
    ...EVENTOS_MENSAJERIA,
    ...EVENTOS_VERIFICACION,
  ];

  return (
    <div className="min-h-screen bg-surface-muted pb-24">
      <div className="max-w-[480px] mx-auto px-5">
        <Link
          href="/notificaciones"
          className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mt-5 mb-2 transition"
        >
          <ArrowLeft size={14} strokeWidth={2.25} /> Volver al inbox
        </Link>

        <header className="pt-2">
          <h1 className="text-2xl font-bold text-fg">Preferencias</h1>
          <p className="text-sm text-fg-muted mt-1">
            Elige qué notificaciones recibir y por dónde
          </p>
        </header>

        <div className="bg-surface rounded-card shadow-card mt-4 divide-y divide-stroke overflow-hidden">
          {eventos.map((ev) => (
            <EventoRow
              key={ev.id}
              evento={ev}
              prefs={prefs[ev.id]}
              onToggle={(canal) => toggle(ev.id, canal)}
            />
          ))}
        </div>

        {mensaje && (
          <p className={`text-xs text-center font-semibold mt-4 ${
            mensaje.includes("Error") ? "text-danger-600" : "text-success-600"
          }`}>
            {mensaje}
          </p>
        )}

        <button
          onClick={guardar}
          disabled={guardando}
          className={`w-full py-3.5 mt-4 rounded-pill text-fg-inverse font-semibold text-sm transition ${
            guardando
              ? "bg-surface-subtle text-fg-subtle cursor-not-allowed"
              : "bg-brand-800 hover:bg-brand-900 shadow-card"
          }`}
        >
          {guardando ? "Guardando…" : "Guardar preferencias"}
        </button>

        <p className="text-[10px] text-fg-subtle text-center mt-4 leading-relaxed">
          Las preferencias por defecto son <span className="font-semibold">todas activas</span>.
          Apaga las que no te interesen para no saturar tu inbox.
        </p>
      </div>
    </div>
  );
}

function EventoRow({ evento, prefs, onToggle }) {
  const { titulo, desc, Icon, tone } = evento;
  const iconStyles = {
    success: "bg-success-100 text-success-600",
    danger: "bg-danger-100 text-danger-600",
    warning: "bg-warning-100 text-warning-700",
    brand: "bg-brand-50 text-brand-700",
  }[tone] || "bg-surface-subtle text-fg-muted";

  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-pill flex items-center justify-center flex-shrink-0 ${iconStyles}`}>
          <Icon size={18} strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-fg">{titulo}</p>
          <p className="text-xs text-fg-muted mt-0.5">{desc}</p>
        </div>
      </div>
      <div className="flex gap-3 mt-3 pl-13" style={{ paddingLeft: "3.25rem" }}>
        <ChannelToggle
          Icon={Smartphone}
          label="In-app"
          active={prefs?.in_app ?? true}
          onClick={() => onToggle("in_app")}
        />
        <ChannelToggle
          Icon={Mail}
          label="Email"
          active={prefs?.email ?? true}
          onClick={() => onToggle("email")}
        />
      </div>
    </div>
  );
}

function ChannelToggle({ Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-pill text-xs font-semibold transition ${
        active
          ? "bg-brand-50 text-brand-700 border border-brand-200"
          : "bg-surface-subtle text-fg-subtle border border-stroke"
      }`}
    >
      <Icon size={12} strokeWidth={2.25} />
      {label}
      <span className={`ml-1 ${active ? "opacity-100" : "opacity-30"}`}>
        {active ? "ON" : "OFF"}
      </span>
    </button>
  );
}

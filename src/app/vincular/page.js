"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { ArrowLeft, Home, KeyRound, Shield, ShieldCheck, ShieldPlus, CheckCircle2, AlertTriangle } from "lucide-react";
import { calcularScore, toneDeModo as toneDeScore } from "../lib/scoring";
import { getModo, toneDeModo } from "../lib/modos";

export default function Vincular() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [propiedad, setPropiedad] = useState(null);
  const [scoring, setScoring] = useState(null);

  // Carga el scoring del inquilino al montar (para tenerlo listo cuando busque)
  useEffect(() => {
    async function cargarScoring() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const { data: perfil } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      const { data: pagosData } = await supabase
        .from("pagos")
        .select("*")
        .eq("user_id", session.user.id);

      setScoring(
        calcularScore({
          perfil,
          user: { email: session.user.email, created_at: session.user.created_at },
          pagos: pagosData || [],
        })
      );
    }
    cargarScoring();
  }, []);

  async function buscarPropiedad() {
    setCargando(true);
    setMensaje("");

    if (!codigo.trim() || codigo.length < 6) {
      setMensaje("Ingresa un código válido de 6 caracteres");
      setCargando(false);
      return;
    }

    const { data: prop } = await supabase
      .from("propiedades")
      .select("*")
      .eq("codigo_invitacion", codigo.toUpperCase())
      .single();

    if (!prop) {
      setMensaje("Código no encontrado. Verifica con tu propietario.");
    } else {
      setPropiedad(prop);
    }
    setCargando(false);
  }

  async function confirmarVinculacion() {
    setCargando(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    const { error } = await supabase.from("vinculaciones").insert({
      propiedad_id: propiedad.id,
      inquilino_id: session.user.id,
    });

    if (error) {
      setMensaje("Error: " + error.message);
    } else {
      setMensaje("Vinculación exitosa");
      setTimeout(() => router.push("/dashboard"), 1500);
    }
    setCargando(false);
  }

  const modo = propiedad ? getModo(propiedad.modo) : null;
  const myScore = scoring?.score ?? 0;
  const requerido = modo?.scoreMinimo ?? 0;
  const calificas = myScore >= requerido;

  return (
    <div className="min-h-screen bg-surface-muted pb-24">
      <div className="max-w-[480px] mx-auto px-5">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mt-5 mb-2 transition"
        >
          <ArrowLeft size={14} strokeWidth={2.25} /> Volver
        </Link>

        <h1 className="text-2xl font-bold text-fg">Vincular propiedad</h1>
        <p className="text-sm text-fg-muted mt-1">Ingresa el código que te dio tu propietario</p>

        <div className="bg-surface border border-stroke rounded-card shadow-card p-5 mt-4">
          {!propiedad ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-14 h-14 bg-brand-50 rounded-pill flex items-center justify-center">
                  <KeyRound size={22} className="text-brand-700" strokeWidth={2.25} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-fg-muted block mb-1.5">Código de invitación</label>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="A3F2B1"
                  maxLength="6"
                  className="w-full px-4 py-4 border border-stroke bg-surface rounded-xl text-center text-2xl font-bold tracking-[0.4em] text-brand-700 placeholder:text-fg-subtle placeholder:font-normal placeholder:tracking-widest focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200 transition"
                />
              </div>
              {mensaje && (
                <p className="text-xs text-center text-danger-600 font-semibold">{mensaje}</p>
              )}
              <button
                onClick={buscarPropiedad}
                disabled={cargando || codigo.length < 6}
                className={`w-full py-3.5 rounded-pill text-fg-inverse font-semibold text-sm transition ${
                  cargando || codigo.length < 6
                    ? "bg-surface-subtle text-fg-subtle cursor-not-allowed"
                    : "bg-brand-800 hover:bg-brand-900 shadow-card"
                }`}
              >
                {cargando ? "Buscando…" : "Buscar propiedad"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-14 h-14 bg-brand-100 text-brand-800 rounded-pill flex items-center justify-center mx-auto">
                  <Home size={22} strokeWidth={2.25} />
                </div>
                <p className="text-sm font-semibold text-fg mt-3">{propiedad.nombre}</p>
                <p className="text-xs text-fg-muted mt-0.5">{propiedad.direccion}</p>
              </div>

              <ModoBanner modo={modo} />

              <div className="bg-surface-subtle rounded-card p-4 space-y-2.5">
                <InfoRow label="Propietario" value={propiedad.propietario_nombre || "—"} />
                <InfoRow
                  label="Monto mensual"
                  value={`$${propiedad.monto_mensual}/mes`}
                  valueClass="text-brand-700 font-semibold"
                />
                <InfoRow label="Día de corte" value={`Día ${propiedad.dia_corte}`} />
              </div>

              <ScoreCheck
                myScore={myScore}
                requerido={requerido}
                calificas={calificas}
                modo={modo}
              />

              {mensaje && (
                <p className={`text-xs text-center font-semibold ${
                  mensaje.includes("Error") ? "text-danger-600" : "text-success-600"
                }`}>
                  {mensaje}
                </p>
              )}

              <button
                onClick={confirmarVinculacion}
                disabled={cargando || !calificas}
                className={`w-full py-3.5 rounded-pill text-fg-inverse font-semibold text-sm transition ${
                  cargando || !calificas
                    ? "bg-surface-subtle text-fg-subtle cursor-not-allowed"
                    : "bg-brand-800 hover:bg-brand-900 shadow-card"
                }`}
              >
                {cargando
                  ? "Vinculando…"
                  : calificas
                    ? "Confirmar vinculación"
                    : `Te faltan ${requerido - myScore} pts`}
              </button>
              <button
                onClick={() => { setPropiedad(null); setCodigo(""); setMensaje(""); }}
                className="w-full py-2 text-sm text-fg-muted hover:text-fg transition"
              >
                Buscar otro código
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModoBanner({ modo }) {
  const tone = toneDeModo(modo.id);
  const Icon = modo.id === "premium" ? ShieldPlus : modo.id === "protegido" ? ShieldCheck : Shield;
  const heroStyles = {
    brand: "bg-brand-800 text-fg-inverse",
    success: "bg-success-600 text-fg-inverse",
    warning: "bg-warning-600 text-fg-inverse",
  }[tone] || "bg-fg text-fg-inverse";

  return (
    <div className={`${heroStyles} rounded-card p-3 flex items-center gap-3`}>
      <div className="w-9 h-9 bg-white/20 rounded-pill flex items-center justify-center flex-shrink-0">
        <Icon size={16} strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold">Rentto {modo.label}</p>
        <p className="text-[11px] opacity-85">{modo.descripcion}</p>
      </div>
    </div>
  );
}

function ScoreCheck({ myScore, requerido, calificas, modo }) {
  if (calificas) {
    return (
      <div className="bg-success-100 text-success-600 rounded-card p-3 flex items-center gap-2.5">
        <CheckCircle2 size={20} strokeWidth={2.25} className="flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold">Calificas para modo {modo.label}</p>
          <p className="text-[11px]">
            Tu score es <span className="font-bold">{myScore}</span> · Mínimo requerido: {requerido}
          </p>
        </div>
      </div>
    );
  }

  const faltan = requerido - myScore;
  return (
    <div className="bg-warning-100 text-warning-700 rounded-card p-3">
      <div className="flex items-center gap-2.5">
        <AlertTriangle size={20} strokeWidth={2.25} className="flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold">No calificas para este modo todavía</p>
          <p className="text-[11px]">
            Tu score: <span className="font-bold">{myScore}</span> · Requerido: {requerido} · Faltan {faltan} pts
          </p>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-warning-700/20 text-[11px] leading-relaxed">
        <p className="font-semibold mb-1">Para subir tu score:</p>
        <ul className="space-y-0.5 ml-3 list-disc">
          <li>Completa tu perfil (nombre + teléfono)</li>
          <li>Cada pago confirmado a tiempo suma 7 pts</li>
          <li>Mantén pagos sin pendientes &gt;7 días</li>
          <li>Pídele a tu propietario una propiedad de modo más bajo (Básico requiere 50 pts)</li>
        </ul>
      </div>
    </div>
  );
}

function InfoRow({ label, value, valueClass = "text-fg font-medium" }) {
  return (
    <div className="flex justify-between items-center gap-3">
      <span className="text-xs text-fg-muted">{label}</span>
      <span className={`text-xs ${valueClass}`}>{value}</span>
    </div>
  );
}

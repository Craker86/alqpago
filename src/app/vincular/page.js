"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { ArrowLeft, Home, KeyRound } from "lucide-react";

export default function Vincular() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [propiedad, setPropiedad] = useState(null);

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

              <div className="bg-surface-subtle rounded-card p-4 space-y-2.5">
                <InfoRow label="Propietario" value={propiedad.propietario_nombre || "—"} />
                <InfoRow
                  label="Monto mensual"
                  value={`$${propiedad.monto_mensual}/mes`}
                  valueClass="text-brand-700 font-semibold"
                />
                <InfoRow label="Día de corte" value={`Día ${propiedad.dia_corte}`} />
              </div>

              {mensaje && (
                <p className={`text-xs text-center font-semibold ${
                  mensaje.includes("Error") ? "text-danger-600" : "text-success-600"
                }`}>
                  {mensaje}
                </p>
              )}

              <button
                onClick={confirmarVinculacion}
                disabled={cargando}
                className={`w-full py-3.5 rounded-pill text-fg-inverse font-semibold text-sm transition ${
                  cargando ? "bg-surface-subtle text-fg-subtle cursor-not-allowed" : "bg-brand-800 hover:bg-brand-900 shadow-card"
                }`}
              >
                {cargando ? "Vinculando…" : "Confirmar vinculación"}
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

function InfoRow({ label, value, valueClass = "text-fg font-medium" }) {
  return (
    <div className="flex justify-between items-center gap-3">
      <span className="text-xs text-fg-muted">{label}</span>
      <span className={`text-xs ${valueClass}`}>{value}</span>
    </div>
  );
}

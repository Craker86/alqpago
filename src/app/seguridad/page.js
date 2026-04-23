"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function Seguridad() {
  const [passwordNueva, setPasswordNueva] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  async function cambiarPassword() {
    setCargando(true);
    setMensaje("");
    if (passwordNueva.length < 6) {
      setMensaje("La contraseña debe tener mínimo 6 caracteres");
      setCargando(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: passwordNueva });
    if (error) {
      setMensaje("Error: " + error.message);
    } else {
      setMensaje("Contraseña actualizada correctamente");
      setPasswordNueva("");
    }
    setCargando(false);
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

        <h1 className="text-2xl font-bold text-fg">Seguridad</h1>
        <p className="text-sm text-fg-muted mt-1">Protege tu cuenta</p>

        <div className="bg-surface border border-stroke rounded-card shadow-card p-5 mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-brand-700" strokeWidth={2.25} />
            <h2 className="text-sm font-semibold text-fg">Cambiar contraseña</h2>
          </div>

          <div>
            <label className="text-xs font-semibold text-fg-muted block mb-1.5">Nueva contraseña</label>
            <div className="relative">
              <input
                type={mostrarPassword ? "text" : "password"}
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-3 pr-11 border border-stroke bg-surface rounded-xl text-sm placeholder:text-fg-subtle focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200 transition"
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                aria-label={mostrarPassword ? "Ocultar" : "Mostrar"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg-muted transition"
              >
                {mostrarPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {mensaje && (
            <p className={`text-xs text-center font-semibold ${mensaje.includes("Error") ? "text-danger-600" : "text-success-600"}`}>
              {mensaje}
            </p>
          )}

          <button
            onClick={cambiarPassword}
            disabled={cargando}
            className={`w-full py-3.5 rounded-pill text-fg-inverse font-semibold text-sm transition ${
              cargando ? "bg-surface-subtle text-fg-subtle cursor-not-allowed" : "bg-brand-800 hover:bg-brand-900 shadow-card"
            }`}
          >
            {cargando ? "Cambiando…" : "Cambiar contraseña"}
          </button>
        </div>
      </div>
    </div>
  );
}

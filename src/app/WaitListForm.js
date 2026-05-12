"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "./lib/supabase";
import { Sparkles, Loader2, Rocket } from "lucide-react";

const OPCIONES_ROL = [
  { id: "inquilino", label: "Inquilino" },
  { id: "propietario", label: "Propietario" },
  { id: "ambos", label: "Ambos" },
];

export default function WaitListForm() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState("");

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const valido = emailValido && rol !== null;

  async function enviar(e) {
    e.preventDefault();
    if (!valido || enviando) return;

    setError("");
    setEnviando(true);

    const { error: insertErr } = await supabase.from("wait_list").insert({
      email: email.trim().toLowerCase(),
      nombre: nombre.trim() || null,
      rol,
      origen: "landing",
    });

    if (insertErr) {
      if (
        insertErr.code === "23505" ||
        insertErr.message.toLowerCase().includes("duplicate") ||
        insertErr.message.toLowerCase().includes("unique")
      ) {
        setError(
          "Ese email ya está en la lista. Te avisaremos cuando te toque."
        );
      } else {
        setError("Error: " + insertErr.message);
      }
      setEnviando(false);
      return;
    }

    setExito(true);
    setEnviando(false);
  }

  if (exito) {
    return (
      <section
        id="piloto"
        className="bg-success-100 border border-success-600/30 rounded-card p-8 text-center"
      >
        <div className="w-14 h-14 bg-success-600 text-white rounded-pill flex items-center justify-center mx-auto shadow-card">
          <Sparkles size={24} strokeWidth={2.25} />
        </div>
        <h2 className="text-xl font-bold text-success-600 mt-4">
          Estás dentro
        </h2>
        <p className="text-sm text-fg-muted mt-2 max-w-[340px] mx-auto">
          {nombre ? `${nombre.split(" ")[0]}, te ` : "Te "}
          escribimos cuando te toque turno.
        </p>
        <Link
          href="/modos"
          className="inline-flex items-center justify-center gap-1.5 mt-5 px-5 py-2.5 bg-success-600 text-white rounded-pill text-sm font-semibold shadow-card hover:bg-success-600/90 transition"
        >
          Ver modos →
        </Link>
      </section>
    );
  }

  return (
    <section
      id="piloto"
      className="bg-surface border border-stroke rounded-card p-6 sm:p-8 shadow-card"
    >
      <div className="flex items-center justify-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-brand-100 text-brand-800 px-2.5 py-0.5 rounded-pill uppercase tracking-wide">
          <Rocket size={10} strokeWidth={2.5} /> Piloto en Caracas
        </span>
      </div>
      <h2 className="text-xl font-bold text-fg text-center">
        Sumate a los primeros 50
      </h2>
      <p className="text-sm text-fg-muted text-center mt-1.5 max-w-[380px] mx-auto">
        Caracas, grupo cerrado.{" "}
        <strong className="text-fg">3 meses sin comisión</strong> para los que entren ahora.
      </p>

      <form onSubmit={enviar} className="mt-6 space-y-3 max-w-[400px] mx-auto">
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre completo (opcional)"
          disabled={enviando}
          className="w-full px-4 py-3 border border-stroke bg-surface rounded-xl text-sm placeholder:text-fg-subtle focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200 transition disabled:opacity-60"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
          disabled={enviando}
          className="w-full px-4 py-3 border border-stroke bg-surface rounded-xl text-sm placeholder:text-fg-subtle focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200 transition disabled:opacity-60"
        />

        <div>
          <label className="text-xs font-semibold text-fg-muted block mb-2">
            ¿Cómo te sumás?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {OPCIONES_ROL.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setRol(opt.id)}
                disabled={enviando}
                className={`py-2.5 rounded-pill text-xs font-semibold border transition ${
                  rol === opt.id
                    ? "bg-brand-800 text-fg-inverse border-brand-800 shadow-card"
                    : "bg-surface text-fg-muted border-stroke hover:border-brand-300 hover:text-fg"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-xs text-danger-600 font-semibold text-center">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!valido || enviando}
          className={`w-full py-3.5 rounded-pill text-fg-inverse font-bold text-sm shadow-card transition inline-flex items-center justify-center gap-2 ${
            !valido || enviando
              ? "bg-surface-subtle text-fg-subtle cursor-not-allowed"
              : "bg-brand-800 hover:bg-brand-900"
          }`}
        >
          {enviando ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Enviando…
            </>
          ) : (
            "Quiero entrar al piloto"
          )}
        </button>

        <p className="text-[10px] text-fg-subtle text-center pt-1">
          Al sumarte aceptás nuestra{" "}
          <Link
            href="/privacidad"
            className="text-brand-700 hover:underline"
          >
            política de privacidad
          </Link>
          .
        </p>
      </form>
    </section>
  );
}

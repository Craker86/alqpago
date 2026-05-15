"use client";

import { useState, useRef } from "react";
import { Send, Loader2 } from "lucide-react";

// ============================================================================
// MessageInput: textarea autoexpansible + botón send.
// ============================================================================
// Submit con Enter (Shift+Enter = newline). El padre maneja el envío async.
// El input se vacía optimistamente cuando el padre devuelve éxito.

const MAX_LEN = 2000;

export default function MessageInput({ onSubmit, deshabilitado, placeholder }) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const taRef = useRef(null);

  function autosize() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }

  async function enviar() {
    const t = texto.trim();
    if (!t || enviando || deshabilitado) return;
    setEnviando(true);
    try {
      await onSubmit(t);
      setTexto("");
      requestAnimationFrame(autosize);
    } finally {
      setEnviando(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  const restantes = MAX_LEN - texto.length;
  const cercaLimite = restantes < 100;
  const puedeEnviar = texto.trim().length > 0 && !enviando && !deshabilitado;

  return (
    <div className="border-t border-stroke bg-surface px-3 py-2.5 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
      <div className="max-w-[480px] mx-auto flex items-end gap-2">
        <textarea
          ref={taRef}
          value={texto}
          onChange={(e) => { setTexto(e.target.value.slice(0, MAX_LEN)); autosize(); }}
          onKeyDown={onKeyDown}
          placeholder={deshabilitado ? "Conversación bloqueada" : (placeholder || "Escribí un mensaje…")}
          rows={1}
          disabled={deshabilitado}
          className="flex-1 resize-none px-3 py-2.5 rounded-2xl border border-stroke bg-surface-subtle text-sm placeholder:text-fg-subtle focus:border-brand-700 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-200 transition disabled:opacity-60"
        />
        <button
          onClick={enviar}
          disabled={!puedeEnviar}
          aria-label="Enviar"
          className={`w-10 h-10 rounded-pill flex-shrink-0 flex items-center justify-center transition shadow-card ${
            puedeEnviar
              ? "bg-brand-800 text-fg-inverse hover:bg-brand-900"
              : "bg-surface-subtle text-fg-subtle cursor-not-allowed"
          }`}
        >
          {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} strokeWidth={2.25} />}
        </button>
      </div>
      {cercaLimite && (
        <p className="text-[10px] text-fg-subtle text-right mt-1 max-w-[480px] mx-auto">
          {restantes} caracteres restantes
        </p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const prefs = [
  { id: "recordatorio", nombre: "Recordatorio de pago", detalle: "3 días antes del vencimiento", defecto: true },
  { id: "confirmado", nombre: "Pago confirmado", detalle: "Cuando el propietario confirma", defecto: true },
  { id: "bcv", nombre: "Cambio de tasa BCV", detalle: "Cuando la tasa cambia más del 5%", defecto: false },
  { id: "promos", nombre: "Promociones", detalle: "Ofertas y beneficios", defecto: false },
];

export default function Notificaciones() {
  const [estado, setEstado] = useState(
    prefs.reduce((acc, p) => ({ ...acc, [p.id]: p.defecto }), {})
  );

  const toggle = (id) => setEstado((s) => ({ ...s, [id]: !s[id] }));

  return (
    <div className="min-h-screen bg-surface-muted pb-24">
      <div className="max-w-[480px] mx-auto px-5">
        <Link
          href="/perfil"
          className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mt-5 mb-2 transition"
        >
          <ArrowLeft size={14} strokeWidth={2.25} /> Volver al perfil
        </Link>

        <h1 className="text-2xl font-bold text-fg">Notificaciones</h1>
        <p className="text-sm text-fg-muted mt-1">Elige qué recibir</p>

        <div className="bg-surface rounded-card shadow-card mt-4 divide-y divide-stroke overflow-hidden">
          {prefs.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-fg truncate">{p.nombre}</p>
                <p className="text-xs text-fg-muted truncate">{p.detalle}</p>
              </div>
              <Toggle active={estado[p.id]} onClick={() => toggle(p.id)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Toggle({ active, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`w-11 h-6 rounded-pill flex items-center px-0.5 transition-colors flex-shrink-0 ${
        active ? "bg-brand-700" : "bg-stroke-strong"
      }`}
    >
      <span
        className={`w-5 h-5 bg-white rounded-pill shadow-card transform transition-transform ${
          active ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const items = [
  { nombre: "Moneda principal", detalle: "Mostrar montos en", valor: "USD ($)", valorTone: "brand" },
  { nombre: "Tasa de referencia", detalle: "Para conversión Bs", valor: "BCV", valorTone: "brand" },
  { nombre: "Idioma", detalle: "Interfaz de la app", valor: "Español", valorTone: "brand" },
  { nombre: "Versión", detalle: "Rentto MVP", valor: "1.0.0", valorTone: "subtle" },
];

export default function Configuracion() {
  return (
    <div className="min-h-screen bg-surface-muted pb-24">
      <div className="max-w-[480px] mx-auto px-5">
        <Link
          href="/perfil"
          className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mt-5 mb-2 transition"
        >
          <ArrowLeft size={14} strokeWidth={2.25} /> Volver al perfil
        </Link>

        <h1 className="text-2xl font-bold text-fg">Configuración</h1>
        <p className="text-sm text-fg-muted mt-1">Preferencias de la app</p>

        <div className="bg-surface rounded-card shadow-card mt-4 divide-y divide-stroke overflow-hidden">
          {items.map((item) => (
            <div key={item.nombre} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-fg truncate">{item.nombre}</p>
                <p className="text-xs text-fg-muted truncate">{item.detalle}</p>
              </div>
              <span className={`text-sm font-semibold flex-shrink-0 ${
                item.valorTone === "brand" ? "text-brand-700" : "text-fg-subtle"
              }`}>
                {item.valor}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

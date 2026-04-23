"use client";

import Link from "next/link";
import { ArrowLeft, Smartphone, DollarSign, Landmark, CreditCard } from "lucide-react";

const metodos = [
  { Icon: Smartphone, nombre: "Pago móvil", detalle: "Disponible en todos los bancos" },
  { Icon: DollarSign, nombre: "Zelle", detalle: "Pagos en USD" },
  { Icon: Landmark, nombre: "Transferencia bancaria", detalle: "Cualquier banco nacional" },
  { Icon: CreditCard, nombre: "Binance Pay", detalle: "USDT y criptomonedas" },
];

export default function MetodosPago() {
  return (
    <div className="min-h-screen bg-surface-muted pb-24">
      <div className="max-w-[480px] mx-auto px-5">
        <Link
          href="/perfil"
          className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mt-5 mb-2 transition"
        >
          <ArrowLeft size={14} strokeWidth={2.25} /> Volver al perfil
        </Link>

        <h1 className="text-2xl font-bold text-fg">Métodos de pago</h1>
        <p className="text-sm text-fg-muted mt-1">Cuatro rails aceptados en Rentto</p>

        <div className="bg-surface rounded-card shadow-card mt-4 divide-y divide-stroke overflow-hidden">
          {metodos.map(({ Icon, nombre, detalle }) => (
            <div key={nombre} className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 bg-brand-50 rounded-pill flex items-center justify-center flex-shrink-0">
                <Icon size={18} className="text-brand-700" strokeWidth={2.25} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-fg truncate">{nombre}</p>
                <p className="text-xs text-fg-muted truncate">{detalle}</p>
              </div>
              <span className="inline-flex items-center text-[10px] font-semibold bg-success-100 text-success-600 px-2 py-0.5 rounded-pill flex-shrink-0">
                Activo
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

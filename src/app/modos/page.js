import Link from "next/link";
import { Shield, ShieldCheck, ShieldPlus, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { MODOS_LISTA } from "../lib/modos";

export const metadata = {
  title: "Los 3 modos de Rentto - Básico, Protegido y Premium",
  description: "Conoce las tres formas de alquilar con Rentto en Venezuela. Plataforma de pago, garantía parcial y garante total con cobertura de hasta 3 meses.",
};

const ICONS = {
  basico: Shield,
  protegido: ShieldCheck,
  premium: ShieldPlus,
};

export default function ModosPage() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-[480px] mx-auto px-5">
        {/* Header */}
        <header className="flex items-center justify-between py-5">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-brand-700 text-fg-inverse rounded-lg flex items-center justify-center font-bold text-base">
              R
            </div>
            <span className="font-bold text-fg">rentto</span>
          </Link>
          <Link
            href="/login"
            className="text-sm font-semibold text-fg hover:bg-surface-subtle rounded-pill px-4 py-2 transition"
          >
            Iniciar sesión
          </Link>
        </header>

        {/* Hero */}
        <section className="text-center py-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg mb-3 transition"
          >
            <ArrowLeft size={12} strokeWidth={2.25} /> Volver al inicio
          </Link>
          <h1 className="text-3xl font-bold text-fg leading-tight">
            Tres formas de alquilar con Rentto
          </h1>
          <p className="text-base text-fg-muted mt-3 leading-relaxed">
            Elige el nivel de protección que mejor se ajusta a tu propiedad.
            Mientras más alto el modo, mayor la garantía.
          </p>
        </section>

        {/* Cards de modos */}
        <section className="space-y-4 pb-6">
          {MODOS_LISTA.map((modo) => (
            <ModoCard key={modo.id} modo={modo} />
          ))}
        </section>

        {/* Tabla comparativa */}
        <section className="py-10">
          <h2 className="text-xl font-bold text-fg text-center mb-6">
            Comparativa rápida
          </h2>
          <div className="bg-surface border border-stroke rounded-card shadow-card overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-surface-subtle">
                <tr>
                  <th className="text-left p-3 font-semibold text-fg-muted">&nbsp;</th>
                  {MODOS_LISTA.map((m) => (
                    <th key={m.id} className="text-center p-3 font-bold text-fg">
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <ComparativaRow
                  label="Comisión propietario"
                  values={MODOS_LISTA.map((m) => `${m.propietario.mensual}%/mes`)}
                />
                <ComparativaRow
                  label="Primer mes prop."
                  values={MODOS_LISTA.map((m) => m.propietario.primerMes > 0 ? `${m.propietario.primerMes}%` : "—")}
                />
                <ComparativaRow
                  label="Comisión inquilino"
                  values={MODOS_LISTA.map((m) => m.inquilino.mensual > 0 ? `${m.inquilino.mensual}%/mes` : "Gratis")}
                />
                <ComparativaRow
                  label="Cobertura impago"
                  values={MODOS_LISTA.map((m) => m.coberturaMeses === 0 ? "—" : `${m.coberturaMeses} ${m.coberturaMeses === 1 ? "mes" : "meses"}`)}
                />
                <ComparativaRow
                  label="Score mínimo"
                  values={MODOS_LISTA.map((m) => `${m.scoreMinimo} pts`)}
                  ultima
                />
              </tbody>
            </table>
          </div>
        </section>

        {/* CTAs */}
        <section className="py-8">
          <h2 className="text-xl font-bold text-fg text-center">
            ¿Listo para empezar?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
            <Link
              href="/login"
              className="bg-brand-800 text-fg-inverse rounded-pill py-3.5 px-6 font-semibold text-sm shadow-card hover:bg-brand-900 transition text-center inline-flex items-center justify-center gap-2"
            >
              Buscar inmueble <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
            <Link
              href="/login?rol=propietario"
              className="border border-brand-800 text-brand-800 rounded-pill py-3.5 px-6 font-semibold text-sm hover:bg-brand-50 transition text-center inline-flex items-center justify-center gap-2"
            >
              Publicar mi inmueble <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
          </div>
          <p className="text-xs text-fg-muted text-center mt-4">
            Tu score se calcula automáticamente al firmar y pagar tus rentas.
          </p>
        </section>

        <hr className="border-stroke my-8" />
        <footer className="py-6 text-center">
          <p className="text-sm text-fg-muted">
            Rentto · Hecho en Venezuela 🇻🇪
          </p>
          <div className="flex justify-center items-center gap-2 mt-3 text-sm text-fg-muted">
            <Link href="/" className="hover:text-brand-700 transition">Inicio</Link>
            <span aria-hidden="true">·</span>
            <Link href="/login" className="hover:text-brand-700 transition">Iniciar sesión</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

function ModoCard({ modo }) {
  const Icon = ICONS[modo.id];
  const tone = modo.id === "premium" ? "brand" : modo.id === "protegido" ? "success" : "warning";
  const heroStyles = {
    brand: "bg-brand-800 text-fg-inverse",
    success: "bg-success-600 text-fg-inverse",
    warning: "bg-warning-600 text-fg-inverse",
  }[tone];

  return (
    <article className="bg-surface border border-stroke rounded-card shadow-card overflow-hidden">
      <div className={`${heroStyles} p-5`}>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-pill flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
            <Icon size={22} strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide opacity-80 font-semibold">
              Modo de Rentto
            </p>
            <h3 className="text-2xl font-bold mt-0.5">{modo.label}</h3>
            <p className="text-sm opacity-85">{modo.slogan}</p>
          </div>
        </div>
        <p className="text-sm opacity-90 mt-4 leading-relaxed">
          {modo.descripcion}
        </p>
      </div>

      <div className="p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Propietario paga" value={`${modo.propietario.mensual}%`} sub={modo.propietario.primerMes > 0 ? `+${modo.propietario.primerMes}% 1er mes` : "/mes"} />
          <Stat label="Inquilino paga" value={modo.inquilino.mensual > 0 ? `${modo.inquilino.mensual}%` : "0%"} sub={modo.inquilino.mensual > 0 ? "/mes" : "Sin recargo"} />
          <Stat label="Cobertura" value={modo.coberturaMeses === 0 ? "Sin garantía" : `${modo.coberturaMeses} ${modo.coberturaMeses === 1 ? "mes" : "meses"}`} sub={modo.coberturaMeses === 0 ? "Solo plataforma" : "de impago"} />
          <Stat label="Score mínimo" value={`${modo.scoreMinimo} pts`} sub="del inquilino" />
        </div>

        <div className="pt-3 border-t border-stroke">
          <p className="text-[11px] font-semibold text-fg-muted uppercase tracking-wide mb-2">
            Incluye
          </p>
          <ul className="space-y-1.5">
            {modo.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-fg">
                <Check size={14} strokeWidth={2.5} className="text-brand-700 flex-shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-fg-muted uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-fg mt-0.5">{value}</p>
      <p className="text-[10px] text-fg-subtle">{sub}</p>
    </div>
  );
}

function ComparativaRow({ label, values, ultima }) {
  return (
    <tr className={ultima ? "" : "border-b border-stroke"}>
      <td className="p-3 text-fg-muted font-medium">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="p-3 text-center font-semibold text-fg">{v}</td>
      ))}
    </tr>
  );
}

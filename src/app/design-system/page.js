import { Building2 } from "lucide-react";

export default function DesignSystem() {
  return (
    <div className="min-h-screen bg-surface-muted">
      <div className="max-w-md mx-auto p-6 space-y-6">
        <header className="bg-brand-800 text-fg-inverse rounded-2xl p-5 shadow-card">
          <p className="text-xs opacity-80 uppercase tracking-wide">Design system</p>
          <h1 className="text-2xl font-bold mt-1">Rentto · tokens visuales</h1>
          <p className="text-sm opacity-80 mt-1">Solo referencia. Borrar al integrar.</p>
        </header>

        <Section title="Paleta brand">
          <div className="grid grid-cols-5 gap-1.5 text-[10px]">
            <Swatch className="bg-brand-50 text-fg-muted">50</Swatch>
            <Swatch className="bg-brand-100 text-fg-muted">100</Swatch>
            <Swatch className="bg-brand-200 text-fg-muted">200</Swatch>
            <Swatch className="bg-brand-300 text-fg">300</Swatch>
            <Swatch className="bg-brand-400 text-fg">400</Swatch>
            <Swatch className="bg-brand-500 text-fg-inverse">500</Swatch>
            <Swatch className="bg-brand-600 text-fg-inverse">600</Swatch>
            <Swatch className="bg-brand-700 text-fg-inverse">700</Swatch>
            <Swatch className="bg-brand-800 text-fg-inverse">800</Swatch>
            <Swatch className="bg-brand-900 text-fg-inverse">900</Swatch>
          </div>
        </Section>

        <Section title="Estados / Pills">
          <div className="flex gap-2 flex-wrap">
            <Pill className="bg-success-100 text-success-600">Confirmado</Pill>
            <Pill className="bg-warning-100 text-warning-700">Pendiente</Pill>
            <Pill className="bg-danger-100 text-danger-600">Rechazado</Pill>
            <Pill className="bg-surface-subtle text-fg-muted">Borrador</Pill>
          </div>
        </Section>

        <Section title="Buttons">
          <div className="space-y-2">
            <button className="w-full bg-brand-800 text-fg-inverse rounded-pill py-3 font-semibold text-sm shadow-card hover:bg-brand-900 transition">
              Primary
            </button>
            <button className="w-full bg-surface text-brand-800 border border-brand-800 rounded-pill py-3 font-semibold text-sm hover:bg-brand-50 transition">
              Secondary
            </button>
            <button className="w-full bg-surface-subtle text-fg rounded-pill py-3 font-semibold text-sm hover:bg-stroke transition">
              Ghost
            </button>
          </div>
        </Section>

        <Section title="Input">
          <input
            type="text"
            placeholder="Buscar inmuebles…"
            className="w-full rounded-xl border border-stroke bg-surface px-4 py-3.5 text-base placeholder:text-fg-subtle focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200 transition"
          />
        </Section>

        <Section title="Stat">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Recibido" value="$1,500" tone="brand" />
            <Stat label="Pendiente" value="$320" tone="warning" />
          </div>
        </Section>

        <Section title="Card (inmueble)">
          <article className="bg-surface rounded-card shadow-card overflow-hidden">
            <div className="aspect-[16/9] bg-brand-50 flex items-center justify-center">
              <Building2 className="text-brand-300" size={48} strokeWidth={1.5} />
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-fg">Apartamento El Rosal</h3>
                <Pill className="bg-success-100 text-success-600">Disponible</Pill>
              </div>
              <p className="text-sm text-fg-muted">2 hab · 1 baño · 65 m²</p>
              <p className="text-2xl font-bold text-brand-700">
                $450 <span className="text-sm font-normal text-gray-500">/ mes</span>
              </p>
            </div>
          </article>
        </Section>

        <Section title="ProgressBar">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-fg-muted">
              <span>Pago del mes</span>
              <span className="font-semibold text-fg">75%</span>
            </div>
            <div className="h-2 w-full rounded-pill bg-surface-subtle overflow-hidden">
              <div className="h-full w-3/4 bg-brand-700 rounded-pill" />
            </div>
          </div>
        </Section>

        <Section title="Radios">
          <div className="grid grid-cols-3 gap-2">
            <RadiusDemo name="md (6px)" className="rounded-md" />
            <RadiusDemo name="lg (8px)" className="rounded-lg" />
            <RadiusDemo name="xl (12px)" className="rounded-xl" />
            <RadiusDemo name="2xl (16px)" className="rounded-2xl" />
            <RadiusDemo name="card" className="rounded-card" />
            <RadiusDemo name="pill" className="rounded-pill" />
          </div>
        </Section>

        <Section title="Sombras">
          <div className="grid grid-cols-3 gap-3">
            <ShadowDemo name="card" className="shadow-card" />
            <ShadowDemo name="elevated" className="shadow-elevated" />
            <ShadowDemo name="pop" className="shadow-pop" />
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ className, children }) {
  return (
    <div className={`rounded-md aspect-square flex items-end justify-center pb-1 ${className}`}>
      {children}
    </div>
  );
}

function Pill({ className, children }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-pill text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

function Stat({ label, value, tone }) {
  const isWarning = tone === "warning";
  const bgClass = isWarning ? "bg-warning-100" : "bg-surface";
  const valueClass = isWarning ? "text-warning-700" : "text-brand-800";
  const labelClass = isWarning ? "text-warning-700" : "text-fg-muted";
  return (
    <div className={`${bgClass} rounded-card p-4 shadow-card`}>
      <p className={`text-xs uppercase tracking-wide ${labelClass}`}>{label}</p>
      <p className={`text-2xl font-bold mt-1 ${valueClass}`}>{value}</p>
    </div>
  );
}

function RadiusDemo({ name, className }) {
  return (
    <div className="text-center text-xs text-fg-muted space-y-1">
      <div className={`h-14 bg-brand-700 ${className}`} />
      <span>{name}</span>
    </div>
  );
}

function ShadowDemo({ name, className }) {
  return (
    <div className="text-center text-xs text-fg-muted space-y-1">
      <div className={`h-14 bg-surface rounded-xl ${className}`} />
      <span>{name}</span>
    </div>
  );
}

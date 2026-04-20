import Link from "next/link";
import { Shield, Smartphone, Zap } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-[480px] mx-auto px-5">

        {/* Header */}
        <header className="flex items-center justify-between py-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-brand-700 text-fg-inverse rounded-lg flex items-center justify-center font-bold text-base">
              R
            </div>
            <span className="font-bold text-fg">rentto</span>
            <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-pill font-medium">
              Venezuela 🇻🇪
            </span>
          </div>
          <Link
            href="/login"
            className="text-sm font-semibold text-fg hover:bg-surface-subtle rounded-pill px-4 py-2 transition"
          >
            Iniciar sesión
          </Link>
        </header>

        {/* Hero */}
        <section className="text-center py-10 sm:py-16">
          <h1 className="text-3xl sm:text-4xl font-bold text-fg leading-tight">
            La forma inteligente de alquilar en Venezuela
          </h1>
          <p className="text-base text-fg-muted mt-4 leading-relaxed">
            Publica, alquila y paga. 100% digital, 100% seguro.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Link
              href="/propiedades"
              className="flex-1 bg-brand-800 text-fg-inverse rounded-pill py-3.5 px-6 font-semibold text-sm shadow-card hover:bg-brand-900 transition text-center"
            >
              Buscar inmueble
            </Link>
            <Link
              href="/login?rol=propietario"
              className="flex-1 border border-brand-800 text-brand-800 rounded-pill py-3.5 px-6 font-semibold text-sm hover:bg-brand-50 transition text-center"
            >
              Publicar mi inmueble
            </Link>
          </div>
        </section>

        {/* ¿Por qué Rentto? */}
        <section className="py-10">
          <h2 className="text-xl font-bold text-fg text-center mb-6">¿Por qué Rentto?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Feature
              Icon={Shield}
              title="Pago garantizado"
              description="Si el inquilino no paga, nosotros cubrimos."
            />
            <Feature
              Icon={Smartphone}
              title="Contrato 100% digital"
              description="Firma desde tu teléfono con validez legal."
            />
            <Feature
              Icon={Zap}
              title="Alquila en 24 horas"
              description="Sin aval, sin fiador, sin trámites."
            />
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="py-10">
          <h2 className="text-xl font-bold text-fg text-center mb-6">Cómo funciona</h2>
          <div className="space-y-4">
            <Step n={1}>Busca tu próximo hogar en nuestro marketplace.</Step>
            <Step n={2}>Solicita y firma tu contrato digital.</Step>
            <Step n={3}>Paga mes a mes desde la app.</Step>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-stroke text-center">
          <p className="text-sm text-fg-muted">Rentto · Hecho en Venezuela 🇻🇪</p>
          <div className="flex justify-center gap-4 mt-3 text-xs text-fg-subtle">
            <Link href="/terminos" className="hover:text-fg-muted transition">Términos</Link>
            <Link href="/privacidad" className="hover:text-fg-muted transition">Privacidad</Link>
            <Link href="/contacto" className="hover:text-fg-muted transition">Contacto</Link>
          </div>
        </footer>

      </div>
    </div>
  );
}

function Feature({ Icon, title, description }) {
  return (
    <div className="bg-surface rounded-card p-5 shadow-card">
      <div className="w-10 h-10 bg-brand-50 rounded-pill flex items-center justify-center">
        <Icon size={20} className="text-brand-700" />
      </div>
      <h3 className="font-semibold text-fg mt-3">{title}</h3>
      <p className="text-sm text-fg-muted mt-1">{description}</p>
    </div>
  );
}

function Step({ n, children }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-8 h-8 bg-brand-100 text-brand-800 rounded-pill flex items-center justify-center font-bold text-sm flex-shrink-0">
        {n}
      </div>
      <p className="text-fg pt-1">{children}</p>
    </div>
  );
}

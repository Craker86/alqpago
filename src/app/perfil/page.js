"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import Link from "next/link";
import {
  User,
  CreditCard,
  FileText,
  Receipt,
  Bell,
  Lock,
  Settings,
  ChevronRight,
  ArrowRight,
  LogOut,
  Sparkles,
  ShieldCheck,
  Clock,
  ShieldAlert,
  Rocket,
} from "lucide-react";
import { calcularScore, toneDeModo } from "../lib/scoring";

export default function Perfil() {
  const router = useRouter();
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [rol, setRol] = useState("");
  const [scoring, setScoring] = useState(null);
  const [verificacion, setVerificacion] = useState(null);
  const [esAdmin, setEsAdmin] = useState(false);

  const opciones = [
    { Icon: User, nombre: "Datos personales", ruta: "/datos-personales" },
    { Icon: ShieldCheck, nombre: "Verificar identidad", ruta: "/perfil/verificar", badge: "verificacion" },
    { Icon: FileText, nombre: "Contratos", ruta: "/contrato" },
    { Icon: CreditCard, nombre: "Métodos de pago", ruta: "/metodos-pago" },
    { Icon: Receipt, nombre: "Recibos y facturas", ruta: "/recibos" },
    { Icon: Bell, nombre: "Notificaciones", ruta: "/notificaciones" },
    { Icon: Lock, nombre: "Seguridad", ruta: "/seguridad" },
    { Icon: Settings, nombre: "Configuración", ruta: "/configuracion" },
  ];

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      setUsuario({
        email: session.user.email,
        id: session.user.id,
        creado: new Date(session.user.created_at).toLocaleDateString("es-VE"),
      });

      const { data: perfil } = await supabase.from("perfiles").select("*").eq("id", session.user.id).single();
      if (perfil) {
        setRol(perfil.rol);
        if (perfil.nombre) setUsuario((prev) => ({ ...prev, nombre: perfil.nombre }));
        setEsAdmin(!!perfil.es_admin);
      }

      const { data: verif } = await supabase
        .from("verificaciones")
        .select("estado")
        .eq("user_id", session.user.id)
        .maybeSingle();
      setVerificacion(verif);

      // Score solo aplica a inquilinos
      if (perfil?.rol !== "propietario") {
        const { data: pagosData } = await supabase
          .from("pagos")
          .select("*")
          .eq("user_id", session.user.id);
        setScoring(
          calcularScore({
            perfil,
            user: { email: session.user.email, created_at: session.user.created_at },
            pagos: pagosData || [],
            verificacion: verif,
          })
        );
      }

      setCargando(false);
    }
    cargar();
  }, []);

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center">
        <p className="text-fg-subtle text-sm">Cargando…</p>
      </div>
    );
  }

  const nombre = usuario.nombre || usuario.email.split("@")[0];
  const iniciales = nombre.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-surface-muted pb-24">
      <div className="max-w-[480px] mx-auto px-5">

        <section className="text-center pt-6">
          <div className="w-20 h-20 bg-brand-800 text-fg-inverse rounded-pill flex items-center justify-center text-3xl font-bold mx-auto shadow-card">
            {iniciales}
          </div>
          <h1 className="text-lg font-semibold text-fg mt-3">{nombre}</h1>
          <p className="text-xs text-fg-muted mt-0.5">{usuario.email}</p>
          <span className="inline-flex items-center mt-2 text-[10px] bg-brand-50 text-brand-700 px-3 py-1 rounded-pill font-semibold">
            {rol === "propietario" ? "Propietario" : "Inquilino"}
          </span>
        </section>

        <div className="bg-surface border border-stroke rounded-card p-4 mt-6 shadow-card">
          <div className="flex justify-between">
            <span className="text-xs text-fg-muted">Email</span>
            <span className="text-xs font-semibold text-brand-700 truncate ml-3">{usuario.email}</span>
          </div>
          <div className="flex justify-between mt-3">
            <span className="text-xs text-fg-muted">Miembro desde</span>
            <span className="text-xs font-semibold text-fg">{usuario.creado}</span>
          </div>
        </div>

        {scoring && (
          <ScoreCard scoring={scoring} />
        )}

        {esAdmin && <AdminCard />}

        <nav className="bg-surface border border-stroke rounded-card mt-6 shadow-card overflow-hidden divide-y divide-stroke">
          {opciones.map(({ Icon, nombre, ruta, badge }) => (
            <Link
              href={ruta}
              key={nombre}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-subtle transition"
            >
              <div className="w-9 h-9 bg-brand-50 rounded-pill flex items-center justify-center flex-shrink-0">
                <Icon size={16} className="text-brand-700" strokeWidth={2.25} />
              </div>
              <span className="flex-1 text-sm font-medium text-fg">{nombre}</span>
              {badge === "verificacion" && (
                <VerificacionBadge estado={verificacion?.estado} />
              )}
              <ChevronRight size={16} className="text-fg-subtle" strokeWidth={2} />
            </Link>
          ))}
        </nav>

        <button
          onClick={cerrarSesion}
          className="flex items-center justify-center gap-2 w-full py-3 mt-6 text-sm text-danger-600 font-semibold border border-danger-100 rounded-pill hover:bg-danger-100 transition"
        >
          <LogOut size={14} strokeWidth={2.5} />
          Cerrar sesión
        </button>

      </div>
    </div>
  );
}

function AdminCard() {
  return (
    <div className="bg-fg text-fg-inverse rounded-card mt-6 shadow-elevated overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <p className="text-[10px] uppercase tracking-wide opacity-70 font-semibold">Modo admin</p>
      </div>
      <Link
        href="/admin/verificaciones"
        className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition"
      >
        <div className="w-10 h-10 bg-white/10 rounded-pill flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
          <ShieldCheck size={18} strokeWidth={2.25} />
        </div>
        <p className="flex-1 text-sm font-bold">Verificaciones por revisar</p>
        <ArrowRight size={16} className="opacity-80 flex-shrink-0" strokeWidth={2.25} />
      </Link>
      <div className="border-t border-white/10" />
      <Link
        href="/admin/wait-list"
        className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition"
      >
        <div className="w-10 h-10 bg-white/10 rounded-pill flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
          <Rocket size={18} strokeWidth={2.25} />
        </div>
        <p className="flex-1 text-sm font-bold">Wait list del piloto</p>
        <ArrowRight size={16} className="opacity-80 flex-shrink-0" strokeWidth={2.25} />
      </Link>
    </div>
  );
}

function VerificacionBadge({ estado }) {
  if (estado === "aprobada") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-success-100 text-success-600 px-2 py-0.5 rounded-pill">
        <ShieldCheck size={10} strokeWidth={2.5} />
        Verificado
      </span>
    );
  }
  if (estado === "pendiente") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-warning-100 text-warning-700 px-2 py-0.5 rounded-pill">
        <Clock size={10} strokeWidth={2.5} />
        En revisión
      </span>
    );
  }
  if (estado === "rechazada" || estado === "requiere_reenvio") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-danger-100 text-danger-600 px-2 py-0.5 rounded-pill">
        <ShieldAlert size={10} strokeWidth={2.5} />
        Atención
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[10px] font-bold bg-brand-100 text-brand-800 px-2 py-0.5 rounded-pill">
      Sin verificar
    </span>
  );
}

function ScoreCard({ scoring }) {
  const { score, modo } = scoring;
  const modoTone = toneDeModo(modo);
  const modoStyles = {
    brand: "bg-brand-100 text-brand-800",
    success: "bg-success-100 text-success-600",
    warning: "bg-warning-100 text-warning-700",
    neutral: "bg-surface-subtle text-fg-muted",
  }[modoTone];

  return (
    <Link
      href="/contrato"
      className="block bg-brand-800 text-fg-inverse rounded-card p-4 mt-6 shadow-elevated hover:bg-brand-900 transition"
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-white/15 rounded-pill flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
          <Sparkles size={22} strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[10px] uppercase tracking-wide opacity-80 font-semibold">Tu score Rentto</p>
            <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-pill ${modoStyles}`}>
              {modo}
            </span>
          </div>
          <p className="text-2xl font-bold mt-0.5">{score}<span className="text-sm opacity-70 font-normal"> / 100</span></p>
        </div>
        <ArrowRight size={18} className="opacity-80 flex-shrink-0" strokeWidth={2.25} />
      </div>
      <div className="mt-3 h-1.5 w-full bg-white/15 rounded-pill overflow-hidden">
        <div className="h-full bg-white rounded-pill transition-all" style={{ width: `${score}%` }} />
      </div>
    </Link>
  );
}

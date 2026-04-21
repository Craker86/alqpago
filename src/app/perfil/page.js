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
} from "lucide-react";

export default function Perfil() {
  const router = useRouter();
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [rol, setRol] = useState("");

  const opciones = [
    { Icon: User, nombre: "Datos personales", ruta: "/datos-personales" },
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

      const { data: perfil } = await supabase.from("perfiles").select("rol, nombre").eq("id", session.user.id).single();
      if (perfil) {
        setRol(perfil.rol);
        if (perfil.nombre) setUsuario((prev) => ({ ...prev, nombre: perfil.nombre }));
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

        <nav className="bg-surface border border-stroke rounded-card mt-6 shadow-card overflow-hidden divide-y divide-stroke">
          {opciones.map(({ Icon, nombre, ruta }) => (
            <Link
              href={ruta}
              key={nombre}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-subtle transition"
            >
              <div className="w-9 h-9 bg-brand-50 rounded-pill flex items-center justify-center flex-shrink-0">
                <Icon size={16} className="text-brand-700" strokeWidth={2.25} />
              </div>
              <span className="flex-1 text-sm font-medium text-fg">{nombre}</span>
              <ChevronRight size={16} className="text-fg-subtle" strokeWidth={2} />
            </Link>
          ))}
        </nav>

        {rol === "propietario" && (
          <Link
            href="/propietario"
            className="flex items-center justify-center gap-2 w-full py-3 mt-6 text-sm text-brand-700 font-semibold border border-brand-200 rounded-pill hover:bg-brand-50 transition"
          >
            Panel del propietario <ArrowRight size={14} strokeWidth={2.5} />
          </Link>
        )}

        <button
          onClick={cerrarSesion}
          className="flex items-center justify-center gap-2 w-full py-3 mt-3 text-sm text-danger-600 font-semibold border border-danger-100 rounded-pill hover:bg-danger-100 transition"
        >
          <LogOut size={14} strokeWidth={2.5} />
          Cerrar sesión
        </button>

      </div>
    </div>
  );
}

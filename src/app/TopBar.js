"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "./lib/supabase";

export default function TopBar() {
  const pathname = usePathname();
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState(null);
  const [unreads, setUnreads] = useState(0);

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: perfil } = await supabase
        .from("perfiles")
        .select("nombre, rol")
        .eq("id", session.user.id)
        .single();
      if (perfil?.nombre) setNombre(perfil.nombre);
      if (perfil?.rol) setRol(perfil.rol);

      // Conteo de notificaciones sin leer del usuario actual
      const { count } = await supabase
        .from("notificaciones")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .eq("leida", false);
      if (typeof count === "number") setUnreads(count);
    }
    cargar();
  }, [pathname]);

  if (pathname === "/" || pathname === "/login" || pathname === "/modos") return null;

  const inicial = nombre ? nombre[0].toUpperCase() : "?";
  const inicio = rol === "propietario" ? "/propietario" : "/dashboard";

  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-stroke">
      <div className="max-w-[480px] mx-auto px-5 py-3 flex items-center justify-between">
        <Link href={inicio} className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-700 text-fg-inverse rounded-lg flex items-center justify-center font-bold text-sm">
            R
          </div>
          <span className="font-bold text-fg text-sm">rentto</span>
          <span className="inline-flex items-center gap-1 text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded-pill font-semibold">
            VE <FlagVE />
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/notificaciones"
            aria-label={`Notificaciones${unreads > 0 ? ` (${unreads} sin leer)` : ""}`}
            className="relative p-1.5 rounded-pill text-fg-muted hover:text-fg hover:bg-surface-subtle transition"
          >
            <Bell size={20} strokeWidth={2} />
            {unreads > 0 && (
              <span className="absolute top-0 right-0 min-w-[16px] h-4 px-1 bg-danger-600 text-white rounded-pill text-[9px] font-bold flex items-center justify-center ring-2 ring-surface">
                {unreads > 9 ? "9+" : unreads}
              </span>
            )}
          </Link>
          <Link
            href="/perfil"
            aria-label="Perfil"
            className="w-8 h-8 bg-brand-100 text-brand-800 rounded-pill flex items-center justify-center font-bold text-xs hover:bg-brand-200 transition"
          >
            {inicial}
          </Link>
        </div>
      </div>
    </header>
  );
}

function FlagVE() {
  return (
    <svg
      width="12"
      height="9"
      viewBox="0 0 22 15"
      aria-label="Bandera de Venezuela"
      className="inline-block rounded-[2px] flex-shrink-0"
    >
      <rect width="22" height="5" fill="#FCD116" />
      <rect y="5" width="22" height="5" fill="#00247D" />
      <rect y="10" width="22" height="5" fill="#CF142B" />
    </svg>
  );
}

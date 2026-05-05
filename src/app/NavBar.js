"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  Building2,
  Wallet,
  FileText,
  User,
  BarChart3,
  Banknote,
} from "lucide-react";
import { supabase } from "./lib/supabase";

const NAV_INQUILINO = {
  left: [
    { href: "/dashboard", label: "Inicio", Icon: Home },
    { href: "/propiedades", label: "Explorar", Icon: Building2 },
  ],
  fab: { href: "/pagar", label: "Pagar", Icon: Wallet },
  right: [
    { href: "/contrato", label: "Contrato", Icon: FileText },
    { href: "/perfil", label: "Perfil", Icon: User },
  ],
};

const NAV_PROPIETARIO = {
  left: [
    { href: "/propietario", label: "Inicio", Icon: Home },
    { href: "/estadisticas", label: "Stats", Icon: BarChart3 },
  ],
  fab: { href: "/cobros", label: "Cobrar", Icon: Banknote },
  right: [
    { href: "/propiedades", label: "Explorar", Icon: Building2 },
    { href: "/perfil", label: "Perfil", Icon: User },
  ],
};

export default function NavBar() {
  const pathname = usePathname();
  const [rol, setRol] = useState(null);
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelado) {
        if (!cancelado) { setRol(null); setPendientes(0); }
        return;
      }
      const { data: perfil } = await supabase
        .from("perfiles")
        .select("rol")
        .eq("id", session.user.id)
        .single();
      if (cancelado) return;
      const r = perfil?.rol || null;
      setRol(r);

      // Conteo de pagos pendientes para el badge del FAB del propietario
      if (r === "propietario") {
        const { count } = await supabase
          .from("pagos")
          .select("*, propiedades!inner(user_id)", { count: "exact", head: true })
          .eq("estado", "pendiente")
          .eq("propiedades.user_id", session.user.id);
        if (!cancelado && typeof count === "number") setPendientes(count);
      } else {
        setPendientes(0);
      }
    }
    cargar();
    return () => { cancelado = true; };
  }, [pathname]);

  if (pathname === "/" || pathname === "/login" || pathname === "/modos") return null;

  const config = rol === "propietario" ? NAV_PROPIETARIO : NAV_INQUILINO;
  const { left, fab, right } = config;
  const showBadge = rol === "propietario" && pendientes > 0;
  const fabActive = pathname === fab.href;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-stroke max-w-[480px] mx-auto">
      <div className="relative flex items-center justify-around h-16 pb-[env(safe-area-inset-bottom)]">
        {left.map((item) => (
          <NavItem key={item.href} item={item} active={pathname === item.href} />
        ))}
        <div className="w-14" aria-hidden="true" />
        {right.map((item) => (
          <NavItem key={item.href} item={item} active={pathname === item.href} />
        ))}

        <Link
          href={fab.href}
          aria-label={
            showBadge
              ? `${fab.label} (${pendientes} pago${pendientes === 1 ? "" : "s"} pendiente${pendientes === 1 ? "" : "s"})`
              : fab.label
          }
          className={`absolute left-1/2 -translate-x-1/2 -top-7 flex flex-col items-center gap-1 transition ${
            fabActive ? "scale-[1.03]" : ""
          }`}
        >
          <span className="relative w-14 h-14 rounded-pill bg-brand-800 text-fg-inverse flex items-center justify-center shadow-pop ring-4 ring-surface hover:bg-brand-900 transition">
            <fab.Icon size={22} strokeWidth={2.25} />
            {showBadge && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 bg-danger-600 text-white rounded-pill text-[10px] font-bold flex items-center justify-center ring-2 ring-surface">
                {pendientes > 9 ? "9+" : pendientes}
              </span>
            )}
          </span>
          <span className="text-[10px] font-semibold text-brand-800">
            {fab.label}
          </span>
        </Link>
      </div>
    </nav>
  );
}

function NavItem({ item, active }) {
  const { href, label, Icon } = item;
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 flex-1 py-1 transition ${
        active ? "text-brand-700" : "text-fg-subtle hover:text-fg-muted"
      }`}
    >
      <Icon size={20} strokeWidth={active ? 2.25 : 2} />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}

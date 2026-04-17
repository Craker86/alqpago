"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBar() {
  const pathname = usePathname();

  // No mostrar la barra en landing page ni en login
  if (pathname === "/" || pathname === "/login") {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 max-w-md mx-auto">
      <div className="flex justify-around py-2 pb-5">
        <Link href="/dashboard" className={`flex flex-col items-center gap-1 ${pathname === "/dashboard" ? "text-emerald-700" : "text-gray-400"}`}>
          <span className="text-lg">🏠</span>
          <span className="text-[10px] font-medium">Inicio</span>
        </Link>
        <Link href="/pagar" className={`flex flex-col items-center gap-1 ${pathname === "/pagar" ? "text-emerald-700" : "text-gray-400"}`}>
          <span className="text-lg">💰</span>
          <span className="text-[10px] font-medium">Pagar</span>
        </Link>
        <Link href="/propiedades" className={`flex flex-col items-center gap-1 ${pathname === "/propiedades" ? "text-emerald-700" : "text-gray-400"}`}>
          <span className="text-lg">🏘️</span>
          <span className="text-[10px] font-medium">Explorar</span>
        </Link>
        <Link href="/perfil" className={`flex flex-col items-center gap-1 ${pathname === "/perfil" ? "text-emerald-700" : "text-gray-400"}`}>
          <span className="text-lg">👤</span>
          <span className="text-[10px] font-medium">Perfil</span>
        </Link>
      </div>
    </nav>
  );
}
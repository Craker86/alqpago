"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [pagos, setPagos] = useState([]);
  const [propiedad, setPropiedad] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [tasa, setTasa] = useState(0);
  const router = useRouter();

  useEffect(() => {
    async function cargarDatos() {
      // Verificar si hay sesion activa
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // Buscar la propiedad
      const { data: prop } = await supabase
        .from("propiedades")
        .select("*")
        .limit(1)
        .single();

      // Buscar los pagos
      const { data: pagosData } = await supabase
        .from("pagos")
        .select("*")
        .order("fecha_pago", { ascending: false });
const { data: tasaData } = await supabase
        .from("tasa_bcv")
        .select("tasa")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (tasaData) setTasa(tasaData.tasa);
      setPropiedad(prop);
      setPagos(pagosData || []);
      setCargando(false);
    }

    cargarDatos();
  }, []);

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  function iconoMetodo(metodo) {
    if (metodo === "Pago móvil") return "📱";
    if (metodo === "Zelle") return "Z";
    if (metodo === "Transferencia") return "🏦";
    return "💳";
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto">

      <h1 className="text-2xl font-bold text-gray-900">Hola, Jesús</h1>
      <p className="text-sm text-gray-500 mt-1">
        Tu alquiler de abril está pendiente
      </p>

      {propiedad && (
        <div className="bg-emerald-800 text-white rounded-2xl p-5 mt-4">
          <p className="text-xs opacity-80">Monto del mes - Abril 2026</p>
          <p className="text-4xl font-bold mt-1">${propiedad.monto_mensual}</p>
          <p className="text-xs opacity-70 mt-1">Bs. {(propiedad.monto_mensual * tasa).toFixed(2)} al cambio BCV</p>
          <div className="flex justify-between items-end mt-3">
            <span className="text-xs opacity-70">{propiedad.nombre}</span>
            <span className="bg-white/20 text-xs px-3 py-1 rounded-full">
              Vence {propiedad.dia_corte} abr
            </span>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4 flex items-center gap-3">
        <span className="text-2xl">⚡</span>
        <div>
          <p className="text-sm font-semibold text-gray-900">
            Paga hoy y gana 5% de descuento
          </p>
          <p className="text-xs text-gray-500">
            Tu propietario activó el pago anticipado
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center mt-6 mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Pagar con</h2>
        <Link href="/pagar" className="text-xs text-emerald-700">Ver todos</Link>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Link href="/pagar" className="bg-white border border-gray-200 rounded-xl p-3 text-center hover:border-emerald-500">
          <div className="text-xl mb-1">📱</div>
          <span className="text-[10px] text-gray-600">Pago Móvil</span>
        </Link>
        <Link href="/pagar" className="bg-white border border-gray-200 rounded-xl p-3 text-center hover:border-emerald-500">
          <div className="text-xl mb-1 font-bold text-purple-700">Z</div>
          <span className="text-[10px] text-gray-600">Zelle</span>
        </Link>
        <Link href="/pagar" className="bg-white border border-gray-200 rounded-xl p-3 text-center hover:border-emerald-500">
          <div className="text-xl mb-1">🏦</div>
          <span className="text-[10px] text-gray-600">Transfer.</span>
        </Link>
        <Link href="/pagar" className="bg-white border border-gray-200 rounded-xl p-3 text-center hover:border-emerald-500">
          <div className="text-xl mb-1">💳</div>
          <span className="text-[10px] text-gray-600">Binance</span>
        </Link>
      </div>

      <div className="flex justify-between items-center mt-6 mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Historial reciente</h2>
        <span className="text-xs text-emerald-700 cursor-pointer">Ver todo</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {pagos.map((pago) => (
          <div key={pago.id} className="flex items-center gap-3 p-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-lg">
              {iconoMetodo(pago.metodo)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                Alquiler {new Date(pago.fecha_pago).toLocaleDateString("es-VE", { month: "long", year: "numeric" })}
              </p>
              <p className="text-xs text-gray-500">
                {pago.metodo} · {new Date(pago.fecha_pago).toLocaleDateString("es-VE", { day: "numeric", month: "short" })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">${pago.monto}</p>
              <p className={`text-xs font-medium ${pago.estado === "confirmado" ? "text-emerald-600" : "text-amber-500"}`}>
                {pago.estado === "confirmado" ? "Confirmado" : "Pendiente"}
              </p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
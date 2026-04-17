"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import Link from "next/link";

export default function Propietario() {
  const router = useRouter();
  const [pagos, setPagos] = useState([]);
  const [propiedad, setPropiedad] = useState(null);
  const [cargando, setCargando] = useState(true);
  // Estado para contar pagos confirmados y pendientes
  const [stats, setStats] = useState({ confirmados: 0, pendientes: 0, total: 0 });
  const [propiedades, setPropiedades] = useState([]);

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const { data: prop } = await supabase
        .from("propiedades").select("*").limit(1).single();

      const { data: pagosData } = await supabase
        .from("pagos").select("*").order("fecha_pago", { ascending: false });

      setPropiedad(prop);
      setPagos(pagosData || []);

      // Calcular estadisticas
      const confirmados = (pagosData || []).filter(p => p.estado === "confirmado").length;
      const pendientes = (pagosData || []).filter(p => p.estado === "pendiente").length;
      const total = (pagosData || []).reduce((sum, p) => sum + Number(p.monto), 0);
      setStats({ confirmados, pendientes, total });
      const { data: propsData } = await supabase
        .from("propiedades")
        .select("*")
        .order("created_at", { ascending: false });
      setPropiedades(propsData || []);

      setCargando(false);
    }
    cargar();
  }, []);

  // Funcion para confirmar un pago
  async function confirmarPago(pagoId) {
    const { error } = await supabase
      .from("pagos")
      .update({ estado: "confirmado" })
      .eq("id", pagoId);

    if (!error) {
      // Actualizar la lista sin recargar la pagina
      setPagos(pagos.map(p => p.id === pagoId ? { ...p, estado: "confirmado" } : p));
      setStats(prev => ({
        ...prev,
        confirmados: prev.confirmados + 1,
        pendientes: prev.pendientes - 1,
      }));
    }
  }

  // Funcion para rechazar un pago
  async function rechazarPago(pagoId) {
    const { error } = await supabase
      .from("pagos")
      .update({ estado: "rechazado" })
      .eq("id", pagoId);

    if (!error) {
      setPagos(pagos.map(p => p.id === pagoId ? { ...p, estado: "rechazado" } : p));
      setStats(prev => ({
        ...prev,
        pendientes: prev.pendientes - 1,
      }));
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto">

      {/* CABECERA */}
      <h1 className="text-2xl font-bold text-gray-900">Panel del propietario</h1>
      <p className="text-sm text-gray-500 mt-1">{propiedad?.nombre}</p>

      {/* TARJETAS DE ESTADISTICAS */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.confirmados}</p>
          <p className="text-[10px] text-gray-500 mt-1">Confirmados</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-500">{stats.pendientes}</p>
          <p className="text-[10px] text-gray-500 mt-1">Pendientes</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-emerald-700">${stats.total}</p>
          <p className="text-[10px] text-gray-500 mt-1">Total cobrado</p>
        </div>
      </div>

      {/* LISTA DE PAGOS */}
      <Link
        href="/nueva-propiedad"
        className="block w-full py-3 bg-emerald-700 text-white text-center rounded-xl font-semibold text-sm mt-4 hover:bg-emerald-800 transition-colors"
      >
        + Agregar propiedad
      </Link>
      {/* PROPIEDADES REGISTRADAS */}
      {propiedades.length > 0 && (
        <div className="mt-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Mis propiedades</h2>
          <div className="flex flex-col gap-2">
            {propiedades.map((prop) => (
              <div key={prop.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-900">{prop.nombre}</p>
                <p className="text-xs text-gray-500 mt-1">{prop.direccion}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs font-bold text-emerald-700">${prop.monto_mensual}/mes</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-1 rounded-md font-medium">Corte día {prop.dia_corte}</span>
                </div>
                {prop.fotos && prop.fotos.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {prop.fotos.map((foto, i) => (
                      <img key={i} src={foto} alt="Propiedad" className="w-16 h-16 object-cover rounded-lg" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-3">Pagos recibidos</h2>

      <div className="flex flex-col gap-3">
        {pagos.map((pago) => (
          <div key={pago.id} className="bg-white border border-gray-200 rounded-xl p-4">
            {/* INFO DEL PAGO */}
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  ${pago.monto} · {pago.metodo}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(pago.fecha_pago).toLocaleDateString("es-VE", {
                    day: "numeric", month: "long", year: "numeric"
                  })}
                </p>
                {pago.referencia && (
                  <p className="text-xs text-gray-400 mt-0.5">Ref: {pago.referencia}</p>
                )}
              </div>
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-md ${
                pago.estado === "confirmado"
                  ? "bg-emerald-100 text-emerald-800"
                  : pago.estado === "rechazado"
                  ? "bg-red-100 text-red-800"
                  : "bg-amber-100 text-amber-800"
              }`}>
                {pago.estado === "confirmado" ? "Confirmado" : pago.estado === "rechazado" ? "Rechazado" : "Pendiente"}
              </span>
            </div>

            {/* COMPROBANTE */}
            {pago.comprobante_url && (
              <div className="mt-3">
                <a
                  href={pago.comprobante_url}
                  target="_blank"
                  className="text-xs text-emerald-700 font-medium flex items-center gap-1"
                >
                  📎 Ver comprobante adjunto
                </a>
              </div>
            )}

            {/* BOTONES DE ACCION - solo si esta pendiente */}
            {pago.estado === "pendiente" && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => confirmarPago(pago.id)}
                  className="flex-1 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition-colors"
                >
                  Confirmar ✓
                </button>
                <button
                  onClick={() => rechazarPago(pago.id)}
                  className="flex-1 py-2 rounded-lg border border-red-200 text-red-500 text-xs font-semibold hover:bg-red-50 transition-colors"
                >
                  Rechazar ✗
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}

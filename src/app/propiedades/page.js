"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";

export default function Propiedades() {
  const router = useRouter();
  const [propiedades, setPropiedades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [fotoAmpliada, setFotoAmpliada] = useState(null);

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const { data } = await supabase
        .from("propiedades")
        .select("*")
        .order("created_at", { ascending: false });

      setPropiedades(data || []);
      setCargando(false);
    }
    cargar();
  }, []);

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Cargando propiedades...</p>
      </div>
    );
  }

  const propiedadesFiltradas = propiedades.filter((prop) => {
    const coincideBusqueda = prop.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      prop.direccion.toLowerCase().includes(busqueda.toLowerCase());

    if (filtro === "todas") return coincideBusqueda;
    if (filtro === "economica") return coincideBusqueda && prop.monto_mensual <= 100;
    if (filtro === "media") return coincideBusqueda && prop.monto_mensual > 100 && prop.monto_mensual <= 300;
    if (filtro === "premium") return coincideBusqueda && prop.monto_mensual > 300;
    return coincideBusqueda;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto">

      <h1 className="text-2xl font-bold text-gray-900">Propiedades</h1>
      <p className="text-sm text-gray-500 mt-1">
        {propiedades.length} disponibles en Venezuela
      </p>

      <div className="mt-4">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o dirección..."
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 bg-white"
        />
      </div>

      <div className="flex gap-2 mt-3 overflow-x-auto">
        {[
          { id: "todas", label: "Todas" },
          { id: "economica", label: "Hasta $100" },
          { id: "media", label: "$100 - $300" },
          { id: "premium", label: "Más de $300" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              filtro === f.id
                ? "bg-emerald-700 text-white"
                : "bg-white border border-gray-200 text-gray-600"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 mt-4">
        {propiedadesFiltradas.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">No se encontraron propiedades</p>
          </div>
        ) : (
          propiedadesFiltradas.map((prop) => (
            <div key={prop.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

              {prop.fotos && prop.fotos.length > 0 ? (
                <img
                  src={prop.fotos[0]}
                  alt={prop.nombre}
                  className="w-full h-40 object-cover cursor-pointer"
                  onClick={() => setFotoAmpliada(prop.fotos[0])}
                />
              ) : (
                <div className="w-full h-40 bg-gray-100 flex items-center justify-center">
                  <span className="text-4xl">🏠</span>
                </div>
              )}

              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{prop.nombre}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{prop.direccion}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-700">${prop.monto_mensual}</p>
                    <p className="text-[10px] text-gray-400">/mes</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                    Corte día {prop.dia_corte}
                  </span>
                  <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                    {prop.clausula_ajuste}
                  </span>
                </div>

                {prop.descripcion && (
                  <p className="text-xs text-gray-600 mt-3 leading-relaxed">{prop.descripcion}</p>
                )}

                {prop.requisitos && (
                  <div className="mt-3 p-3 bg-amber-50 rounded-lg">
                    <p className="text-[10px] font-semibold text-amber-800">Requisitos:</p>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">{prop.requisitos}</p>
                  </div>
                )}

                {prop.fotos && prop.fotos.length > 1 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto">
                    {prop.fotos.map((foto, i) => (
                      <img key={i} src={foto} alt={prop.nombre} className="w-20 h-20 object-cover rounded-lg flex-shrink-0 cursor-pointer" onClick={() => setFotoAmpliada(foto)} />
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-[10px] font-bold text-emerald-800">
                    {prop.propietario_nombre ? prop.propietario_nombre[0] : "P"}
                  </div>
                  <span className="text-xs text-gray-500">{prop.propietario_nombre}</span>
                </div>

                <a href={"https://wa.me/" + (prop.telefono || "") + "?text=Hola, vi tu propiedad " + prop.nombre + " en Rentto y me interesa."} target="_blank" className="block w-full py-2.5 mt-3 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 text-center">Contactar por WhatsApp</a>
              </div>
            </div>
          ))
        )}
      </div>

      {fotoAmpliada && (
        <div
          onClick={() => setFotoAmpliada(null)}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 cursor-pointer"
        >
          <div className="relative max-w-lg w-full">
            <img src={fotoAmpliada} alt="Foto ampliada" className="w-full rounded-2xl" />
            <button
              onClick={() => setFotoAmpliada(null)}
              className="absolute top-3 right-3 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center text-sm font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
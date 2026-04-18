"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";

export default function Vincular() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [propiedad, setPropiedad] = useState(null);

  async function buscarPropiedad() {
    setCargando(true);
    setMensaje("");

    if (!codigo.trim() || codigo.length < 6) {
      setMensaje("Ingresa un código válido de 6 caracteres");
      setCargando(false);
      return;
    }

    const { data: prop } = await supabase
      .from("propiedades")
      .select("*")
      .eq("codigo_invitacion", codigo.toUpperCase())
      .single();

    if (!prop) {
      setMensaje("Código no encontrado. Verifica con tu propietario.");
    } else {
      setPropiedad(prop);
    }
    setCargando(false);
  }

  async function confirmarVinculacion() {
    setCargando(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    const { error } = await supabase.from("vinculaciones").insert({
      propiedad_id: propiedad.id,
      inquilino_id: session.user.id,
    });

    if (error) {
      setMensaje("Error: " + error.message);
    } else {
      setMensaje("Vinculación exitosa");
      setTimeout(() => router.push("/dashboard"), 1500);
    }
    setCargando(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto">
      <Link href="/dashboard" className="text-sm text-gray-500 flex items-center gap-1 mb-4">← Volver</Link>

      <h1 className="text-xl font-bold text-gray-900">Vincular propiedad</h1>
      <p className="text-xs text-gray-500 mt-1">Ingresa el código que te dio tu propietario</p>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 mt-4">
        {!propiedad ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Código de invitación</label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="Ej: A3F2B1"
                maxLength="6"
                className="w-full px-4 py-4 border border-gray-200 rounded-xl text-center text-2xl font-bold tracking-widest focus:outline-none focus:border-emerald-500"
              />
            </div>
            {mensaje && <p className="text-xs text-center text-red-500">{mensaje}</p>}
            <button
              onClick={buscarPropiedad}
              disabled={cargando || codigo.length < 6}
              className={`w-full py-3 rounded-xl text-white font-semibold ${cargando || codigo.length < 6 ? "bg-gray-300" : "bg-emerald-700 hover:bg-emerald-800"}`}
            >
              {cargando ? "Buscando..." : "Buscar propiedad"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl mx-auto">🏠</div>
              <p className="text-sm font-semibold text-gray-900 mt-3">{propiedad.nombre}</p>
              <p className="text-xs text-gray-500 mt-1">{propiedad.direccion}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Propietario</span>
                <span className="font-medium text-gray-900">{propiedad.propietario_nombre}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Monto mensual</span>
                <span className="font-bold text-emerald-700">${propiedad.monto_mensual}/mes</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Día de corte</span>
                <span className="font-medium text-gray-900">Día {propiedad.dia_corte}</span>
              </div>
            </div>
            {mensaje && <p className={`text-xs text-center ${mensaje.includes("Error") ? "text-red-500" : "text-emerald-600"}`}>{mensaje}</p>}
            <button
              onClick={confirmarVinculacion}
              disabled={cargando}
              className={`w-full py-3 rounded-xl text-white font-semibold ${cargando ? "bg-gray-300" : "bg-emerald-700 hover:bg-emerald-800"}`}
            >
              {cargando ? "Vinculando..." : "Confirmar vinculación"}
            </button>
            <button
              onClick={() => { setPropiedad(null); setCodigo(""); }}
              className="w-full py-2 text-sm text-gray-500"
            >
              Buscar otro código
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
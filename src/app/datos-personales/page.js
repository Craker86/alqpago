"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";

export default function DatosPersonales() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      setEmail(session.user.email);

      const { data: perfil } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (perfil) {
        setNombre(perfil.nombre || "");
        setTelefono(perfil.telefono || "");
      }
      setCargando(false);
    }
    cargar();
  }, []);

  async function guardar() {
    setGuardando(true);
    setMensaje("");

    if (!nombre.trim()) {
      setMensaje("Ingresa tu nombre");
      setGuardando(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase
      .from("perfiles")
      .update({ nombre, telefono })
      .eq("id", session.user.id);

    if (error) {
      setMensaje("Error: " + error.message);
    } else {
      setMensaje("Datos actualizados correctamente");
    }
    setGuardando(false);
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
      <Link href="/perfil" className="text-sm text-gray-500 flex items-center gap-1 mb-4">
        ← Volver al perfil
      </Link>

      <h1 className="text-xl font-bold text-gray-900">Datos personales</h1>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 mt-4 space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Nombre completo</label>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Teléfono / WhatsApp</label>
          <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej: 04121234567" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Correo electrónico</label>
          <input type="email" value={email} disabled className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-400" />
          <p className="text-[10px] text-gray-400 mt-1">El correo no se puede cambiar</p>
        </div>

        {mensaje && (
          <p className={`text-xs text-center ${mensaje.includes("Error") ? "text-red-500" : "text-emerald-600"}`}>{mensaje}</p>
        )}

        <button onClick={guardar} disabled={guardando} className={`w-full py-3 rounded-xl text-white font-semibold transition-all ${guardando ? "bg-gray-300" : "bg-emerald-700 hover:bg-emerald-800"}`}>
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
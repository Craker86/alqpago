"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";

export default function NuevaPropiedad() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  // Estados para cada campo del formulario
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [monto, setMonto] = useState("");
  const [diaCorte, setDiaCorte] = useState("15");
  const [fechaFin, setFechaFin] = useState("");
  const [ajuste, setAjuste] = useState("Anclado al BCV");
  const [telefono, setTelefono] = useState("");
  const [fotos, setFotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [descripcion, setDescripcion] = useState("");
  const [requisitos, setRequisitos] = useState("");

  async function guardarPropiedad() {
    setCargando(true);
    setMensaje("");

    // Validaciones
    if (!nombre.trim()) {
      setMensaje("Ingresa el nombre de la propiedad");
      setCargando(false);
      return;
    }
    if (!direccion.trim()) {
      setMensaje("Ingresa la dirección");
      setCargando(false);
      return;
    }
    if (!monto || Number(monto) <= 0) {
      setMensaje("Ingresa un monto válido");
      setCargando(false);
      return;
    }

    // Obtener el usuario actual
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }

    // Obtener el nombre del propietario desde perfiles
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("nombre")
      .eq("id", session.user.id)
      .single();

    // Insertar la propiedad
    // Subir fotos si hay
    let fotosUrls = [];
    for (const foto of fotos) {
      const nombreArchivo = `${Date.now()}-${foto.name}`;
      const { error: uploadError } = await supabase.storage
        .from("comprobantes")
        .upload(`propiedades/${nombreArchivo}`, foto);
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("comprobantes")
          .getPublicUrl(`propiedades/${nombreArchivo}`);
        fotosUrls.push(urlData.publicUrl);
      }
    }   
    const { error } = await supabase.from("propiedades").insert({
      user_id: session.user.id,
      nombre: nombre,
      direccion: direccion,
      propietario_nombre: perfil?.nombre || "Propietario",
      propietario_email: session.user.email,
      monto_mensual: Number(monto),
      dia_corte: Number(diaCorte),
      fecha_fin_contrato: fechaFin || null,
    clausula_ajuste: ajuste,
      descripcion: descripcion,
      requisitos: requisitos,
      telefono: telefono,
      fotos: fotosUrls,
    });

    if (error) {
      setMensaje("Error: " + error.message);
    } else {
      setMensaje("Propiedad registrada exitosamente");
      setTimeout(() => router.push("/propietario"), 1500);
    }
    setCargando(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto">

      <Link href="/propietario" className="text-sm text-gray-500 flex items-center gap-1 mb-4">
        ← Volver al panel
      </Link>

      <h1 className="text-xl font-bold text-gray-900">Nueva propiedad</h1>
      <p className="text-xs text-gray-500 mt-1">Registra un inmueble para recibir pagos</p>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 mt-4 space-y-4">

        {/* NOMBRE */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">
            Nombre de la propiedad
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Apto 4B · Res. Los Samanes"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* DIRECCION */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">
            Dirección
          </label>
          <input
            type="text"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Ej: Av. Libertador, Chacao, Caracas"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        {/* TELEFONO */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">
            Tu WhatsApp (con código de país)
          </label>
          <input
            type="text"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Ej: 584121234567"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* MONTO */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">
            Monto mensual (USD)
          </label>
          <input
            type="number"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="Ej: 150"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* DIA DE CORTE */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">
            Día de corte (1-31)
          </label>
          <input
            type="number"
            value={diaCorte}
            onChange={(e) => setDiaCorte(e.target.value)}
            min="1"
            max="31"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* FECHA FIN CONTRATO */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">
            Fecha fin del contrato (opcional)
          </label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* CLAUSULA DE AJUSTE */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">
            Cláusula de ajuste
          </label>
          <select
            value={ajuste}
            onChange={(e) => setAjuste(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 bg-white"
          >
            <option value="Anclado al BCV">Anclado al BCV</option>
            <option value="Monto fijo en USD">Monto fijo en USD</option>
            <option value="Ajuste trimestral">Ajuste trimestral</option>
            <option value="Ajuste semestral">Ajuste semestral</option>
          </select>
        </div>
        {/* DESCRIPCION */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">
            Descripción de la propiedad
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej: Apartamento amplio de 2 habitaciones, 1 baño, cocina equipada, balcón con vista a la montaña. Incluye puesto de estacionamiento."
            rows="3"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 resize-none"
          />
        </div>

        {/* REQUISITOS */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">
            Requisitos para el inquilino
          </label>
          <textarea
            value={requisitos}
            onChange={(e) => setRequisitos(e.target.value)}
            placeholder="Ej: Persona sola o pareja sin mascotas. Depósito de 1 mes. Referencias personales. Contrato mínimo 6 meses."
            rows="3"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 resize-none"
          />
        </div>
        {/* FOTOS */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">
            Fotos de la propiedad (opcional)
          </label>
          <label className="flex flex-col items-center gap-2 cursor-pointer py-4 border border-dashed border-gray-300 rounded-xl hover:border-emerald-500 transition-colors">
            <span className="text-2xl">📷</span>
            <span className="text-xs text-gray-500">Toca para agregar fotos</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const archivos = Array.from(e.target.files);
                setFotos([...fotos, ...archivos]);
                archivos.forEach((file) => {
                  const reader = new FileReader();
                  reader.onload = (ev) => setPreviews((prev) => [...prev, ev.target.result]);
                  reader.readAsDataURL(file);
                });
              }}
              className="hidden"
            />
          </label>
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {previews.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} alt="Foto" className="w-full h-20 object-cover rounded-lg" />
                  <button
                    onClick={() => {
                      setFotos(fotos.filter((_, idx) => idx !== i));
                      setPreviews(previews.filter((_, idx) => idx !== i));
                    }}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MENSAJE */}
        {mensaje && (
          <p className={`text-xs text-center ${mensaje.includes("Error") || !mensaje.includes("exitosamente") ? "text-red-500" : "text-emerald-600"}`}>
            {mensaje}
          </p>
        )}

        {/* BOTON GUARDAR */}
        <button
          onClick={guardarPropiedad}
          disabled={cargando}
          className={`w-full py-3 rounded-xl text-white font-semibold transition-all ${
            cargando ? "bg-gray-300 cursor-not-allowed" : "bg-emerald-700 hover:bg-emerald-800"
          }`}
        >
          {cargando ? "Guardando..." : "Registrar propiedad"}
        </button>

      </div>
    </div>
  );
}
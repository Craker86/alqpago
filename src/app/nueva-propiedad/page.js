"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { ArrowLeft, Camera, X } from "lucide-react";

export default function NuevaPropiedad() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

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

    if (!nombre.trim()) { setMensaje("Ingresa el nombre de la propiedad"); setCargando(false); return; }
    if (!direccion.trim()) { setMensaje("Ingresa la dirección"); setCargando(false); return; }
    if (!monto || Number(monto) <= 0) { setMensaje("Ingresa un monto válido"); setCargando(false); return; }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    const { data: perfil } = await supabase
      .from("perfiles")
      .select("nombre")
      .eq("id", session.user.id)
      .single();

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
      nombre,
      direccion,
      propietario_nombre: perfil?.nombre || "Propietario",
      propietario_email: session.user.email,
      monto_mensual: Number(monto),
      dia_corte: Number(diaCorte),
      fecha_fin_contrato: fechaFin || null,
      clausula_ajuste: ajuste,
      descripcion,
      requisitos,
      telefono,
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

  const inputClass = "w-full px-4 py-3 border border-stroke bg-surface rounded-xl text-sm placeholder:text-fg-subtle focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200 transition";

  return (
    <div className="min-h-screen bg-surface-muted pb-24">
      <div className="max-w-[480px] mx-auto px-5">
        <Link
          href="/propietario"
          className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mt-5 mb-2 transition"
        >
          <ArrowLeft size={14} strokeWidth={2.25} /> Volver al panel
        </Link>

        <h1 className="text-2xl font-bold text-fg">Nueva propiedad</h1>
        <p className="text-sm text-fg-muted mt-1">Registra un inmueble para recibir pagos</p>

        <div className="bg-surface border border-stroke rounded-card shadow-card p-5 mt-4 space-y-4">
          <Field label="Nombre de la propiedad">
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Apto 4B · Res. Los Samanes" className={inputClass} />
          </Field>

          <Field label="Dirección">
            <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)}
              placeholder="Ej: Av. Libertador, Chacao, Caracas" className={inputClass} />
          </Field>

          <Field label="Tu WhatsApp (con código de país)">
            <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej: 584121234567" className={inputClass} />
          </Field>

          <Field label="Monto mensual (USD)">
            <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)}
              placeholder="Ej: 150" className={inputClass} />
          </Field>

          <Field label="Día de corte (1-31)">
            <input type="number" value={diaCorte} onChange={(e) => setDiaCorte(e.target.value)}
              min="1" max="31" className={inputClass} />
          </Field>

          <Field label="Fecha fin del contrato (opcional)">
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className={inputClass} />
          </Field>

          <Field label="Cláusula de ajuste">
            <select value={ajuste} onChange={(e) => setAjuste(e.target.value)} className={inputClass}>
              <option value="Anclado al BCV">Anclado al BCV</option>
              <option value="Monto fijo en USD">Monto fijo en USD</option>
              <option value="Ajuste trimestral">Ajuste trimestral</option>
              <option value="Ajuste semestral">Ajuste semestral</option>
            </select>
          </Field>

          <Field label="Descripción de la propiedad">
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Apartamento amplio de 2 habitaciones, cocina equipada, estacionamiento."
              rows="3"
              className={`${inputClass} resize-none`}
            />
          </Field>

          <Field label="Requisitos para el inquilino">
            <textarea
              value={requisitos}
              onChange={(e) => setRequisitos(e.target.value)}
              placeholder="Ej: Pareja sin mascotas. Depósito de 1 mes. Contrato mínimo 6 meses."
              rows="3"
              className={`${inputClass} resize-none`}
            />
          </Field>

          <Field label="Fotos de la propiedad (opcional)">
            <label className="flex flex-col items-center gap-2 cursor-pointer py-5 border border-dashed border-stroke-strong rounded-card hover:border-brand-700 hover:bg-brand-50 transition">
              <div className="w-10 h-10 bg-brand-50 rounded-pill flex items-center justify-center">
                <Camera size={18} className="text-brand-700" strokeWidth={2.25} />
              </div>
              <span className="text-xs text-fg-muted">Toca para agregar fotos</span>
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
                      aria-label="Quitar"
                      className="absolute top-1 right-1 w-5 h-5 bg-danger-600 text-white rounded-pill flex items-center justify-center shadow-card hover:bg-danger-600/90 transition"
                    >
                      <X size={10} strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Field>

          {mensaje && (
            <p className={`text-xs text-center font-semibold ${
              mensaje.includes("exitosamente") ? "text-success-600" : "text-danger-600"
            }`}>
              {mensaje}
            </p>
          )}

          <button
            onClick={guardarPropiedad}
            disabled={cargando}
            className={`w-full py-3.5 rounded-pill text-fg-inverse font-semibold text-sm transition ${
              cargando ? "bg-surface-subtle text-fg-subtle cursor-not-allowed" : "bg-brand-800 hover:bg-brand-900 shadow-card"
            }`}
          >
            {cargando ? "Guardando…" : "Registrar propiedad"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-semibold text-fg-muted block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

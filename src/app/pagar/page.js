"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import {
  ArrowLeft,
  Smartphone,
  DollarSign,
  Landmark,
  CreditCard,
  Upload,
  FileText,
  Check,
  X,
  ArrowRight,
} from "lucide-react";

export default function Pagar() {
  const router = useRouter();
  const [metodoSeleccionado, setMetodoSeleccionado] = useState(null);
  const [propiedad, setPropiedad] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [pagoExitoso, setPagoExitoso] = useState(false);
  const [referencia, setReferencia] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [previsualizacion, setPrevisualizacion] = useState(null);
  const [refPago, setRefPago] = useState("");
  const [bancoOrigen, setBancoOrigen] = useState("");
  const [cedulaPago, setCedulaPago] = useState("");

  const metodos = [
    { id: "pago-movil", nombre: "Pago móvil", detalle: "Banesco · 0412-XXX-XX45", tag: "Instantáneo", tagTone: "success", Icon: Smartphone },
    { id: "zelle", nombre: "Zelle", detalle: "maria@gmail.com", tag: "USD", tagTone: "brand", Icon: DollarSign },
    { id: "transferencia", nombre: "Transferencia bancaria", detalle: "Banco de Venezuela · Cta. 0102", tag: "Instantáneo", tagTone: "success", Icon: Landmark },
    { id: "binance", nombre: "Binance Pay / USDT", detalle: "Wallet vinculada", tag: "Cripto", tagTone: "warning", Icon: CreditCard },
  ];

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const { data: prop } = await supabase
        .from("propiedades").select("*").limit(1).single();
      setPropiedad(prop);
      setCargando(false);
    }
    cargar();
  }, []);

  function handleArchivo(e) {
    const file = e.target.files[0];
    if (!file) return;
    setArchivo(file);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPrevisualizacion(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setPrevisualizacion(null);
    }
  }

  async function confirmarPago() {
    if (!metodoSeleccionado || !propiedad) return;
    if (!archivo) {
      alert("Por favor adjunta el comprobante de pago");
      return;
    }
    setEnviando(true);

    let comprobanteUrl = null;

    if (archivo) {
      const nombreArchivo = `${Date.now()}-${archivo.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("comprobantes")
        .upload(nombreArchivo, archivo);

      if (uploadError) {
        alert("Error al subir comprobante: " + uploadError.message);
        setEnviando(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("comprobantes")
        .getPublicUrl(nombreArchivo);
      comprobanteUrl = urlData.publicUrl;
    }

    const metodo = metodos.find(m => m.id === metodoSeleccionado);

    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("pagos").insert({
      propiedad_id: propiedad.id,
      user_id: session.user.id,
      monto: propiedad.monto_mensual,
      monto_bs: propiedad.monto_mensual * 45.20,
      metodo: metodo.nombre,
      referencia: refPago || "REF-" + Date.now(),
      estado: "pendiente",
      fecha_pago: new Date().toISOString().split("T")[0],
      comprobante_url: comprobanteUrl,
      notas: metodoSeleccionado === "pago-movil" ? "Banco: " + bancoOrigen + " | Cédula: " + cedulaPago : null,
    });

    if (error) {
      alert("Error al registrar el pago: " + error.message);
    } else {
      await fetch("/api/notificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monto: propiedad.monto_mensual,
          metodo: metodo.nombre,
          fecha: new Date().toLocaleDateString("es-VE"),
          emailPropietario: "jesusalcala86@gmail.com",
        }),
      });
      setReferencia("ALQ-" + Date.now().toString().slice(-8));
      setPagoExitoso(true);
    }
    setEnviando(false);
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center">
        <p className="text-fg-subtle text-sm">Cargando…</p>
      </div>
    );
  }

  if (pagoExitoso) {
    return (
      <div className="min-h-screen bg-surface-muted pb-24">
        <div className="max-w-[480px] mx-auto px-5 pt-10">
          <div className="bg-surface rounded-card shadow-card p-8 text-center">
            <div className="w-16 h-16 bg-success-100 rounded-pill flex items-center justify-center mx-auto">
              <Check size={32} className="text-success-600" strokeWidth={2.5} />
            </div>
            <h2 className="text-xl font-bold text-fg mt-4">Pago registrado</h2>
            <p className="text-sm text-fg-muted mt-2 leading-relaxed">
              Tu pago de <span className="font-semibold text-brand-700">${propiedad.monto_mensual}</span> fue enviado. El propietario será notificado y confirmará en minutos.
            </p>

            <div className="bg-surface-subtle rounded-card p-4 mt-4 text-left space-y-2.5">
              <InfoRow label="Referencia" value={`#${referencia}`} valueClass="text-fg" />
              <InfoRow label="Fecha" value={new Date().toLocaleDateString("es-VE")} valueClass="text-fg" />
              <InfoRow
                label="Comprobante"
                value={archivo ? "Adjuntado ✓" : "No adjuntado"}
                valueClass={archivo ? "text-success-600" : "text-fg-subtle"}
              />
              <InfoRow label="Estado" value="Pendiente de confirmación" valueClass="text-warning-700" />
            </div>

            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 w-full py-3.5 mt-6 bg-brand-800 text-fg-inverse rounded-pill font-semibold text-sm shadow-card hover:bg-brand-900 transition"
            >
              Volver al inicio <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-muted pb-24">
      <div className="max-w-[480px] mx-auto px-5">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mt-5 mb-2 transition"
        >
          <ArrowLeft size={14} strokeWidth={2.25} /> Volver
        </Link>

        <header className="text-center pt-2">
          <h1 className="text-2xl font-bold text-fg">Pagar alquiler</h1>
          {propiedad?.nombre && (
            <p className="text-xs text-fg-muted mt-1">{propiedad.nombre}</p>
          )}
        </header>

        <section className="bg-brand-800 text-fg-inverse rounded-card p-5 mt-4 text-center shadow-elevated">
          <p className="text-[11px] uppercase tracking-wide opacity-80">Total a pagar</p>
          <p className="text-4xl font-bold mt-1">${propiedad?.monto_mensual}</p>
          <p className="text-xs opacity-70 mt-1">
            Bs. {(propiedad?.monto_mensual * 45.20).toLocaleString("es-VE", { maximumFractionDigits: 2 })} · Tasa BCV
          </p>
        </section>

        <h2 className="text-sm font-semibold text-fg mt-6 mb-3">Selecciona el método</h2>

        <div className="flex flex-col gap-2">
          {metodos.map((metodo) => (
            <MetodoButton
              key={metodo.id}
              metodo={metodo}
              selected={metodoSeleccionado === metodo.id}
              onClick={() => setMetodoSeleccionado(metodo.id)}
            />
          ))}
        </div>

        {metodoSeleccionado === "pago-movil" && (
          <PagoMovilForm
            refPago={refPago} setRefPago={setRefPago}
            bancoOrigen={bancoOrigen} setBancoOrigen={setBancoOrigen}
            cedulaPago={cedulaPago} setCedulaPago={setCedulaPago}
          />
        )}

        <h2 className="text-sm font-semibold text-fg mt-6 mb-3">Adjuntar comprobante</h2>

        <div className="bg-surface border border-stroke rounded-card p-4 shadow-card">
          {!archivo ? (
            <label className="flex flex-col items-center gap-2 cursor-pointer py-4">
              <div className="w-12 h-12 bg-brand-50 rounded-pill flex items-center justify-center">
                <Upload size={20} className="text-brand-700" strokeWidth={2.25} />
              </div>
              <p className="text-sm text-fg font-semibold">Toca para subir foto o PDF</p>
              <p className="text-xs text-fg-muted text-center leading-relaxed max-w-[240px]">
                Captura de pago móvil, transferencia o Zelle
              </p>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleArchivo}
                className="hidden"
              />
            </label>
          ) : (
            <div className="flex items-center gap-3">
              {previsualizacion ? (
                <img src={previsualizacion} alt="Comprobante" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText size={20} className="text-brand-700" strokeWidth={2} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-fg truncate">{archivo.name}</p>
                <p className="text-xs text-fg-muted">{(archivo.size / 1024).toFixed(0)} KB</p>
              </div>
              <button
                onClick={() => { setArchivo(null); setPrevisualizacion(null); }}
                aria-label="Quitar archivo"
                className="w-8 h-8 rounded-pill text-danger-600 hover:bg-danger-100 flex items-center justify-center transition flex-shrink-0"
              >
                <X size={16} strokeWidth={2.25} />
              </button>
            </div>
          )}
        </div>

        <button
          onClick={confirmarPago}
          disabled={!metodoSeleccionado || enviando}
          className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-pill text-fg-inverse font-semibold text-sm mt-6 transition ${
            metodoSeleccionado && !enviando
              ? "bg-brand-800 hover:bg-brand-900 shadow-card"
              : "bg-surface-subtle text-fg-subtle cursor-not-allowed"
          }`}
        >
          {enviando ? "Subiendo comprobante…" : "Confirmar pago"}
          {!enviando && metodoSeleccionado && <ArrowRight size={14} strokeWidth={2.5} />}
        </button>
      </div>
    </div>
  );
}

function MetodoButton({ metodo, selected, onClick }) {
  const { Icon, nombre, detalle, tag, tagTone } = metodo;
  const tagStyles = {
    success: "bg-success-100 text-success-600",
    brand: "bg-brand-50 text-brand-700",
    warning: "bg-warning-100 text-warning-700",
  }[tagTone] || "bg-surface-subtle text-fg-muted";

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-4 rounded-card border text-left transition-all ${
        selected
          ? "border-brand-700 bg-brand-50 shadow-card"
          : "border-stroke bg-surface hover:border-brand-300"
      }`}
    >
      <div className={`w-5 h-5 rounded-pill border-2 flex items-center justify-center flex-shrink-0 transition ${
        selected ? "border-brand-700 bg-brand-700" : "border-stroke-strong"
      }`}>
        {selected && <div className="w-2 h-2 rounded-pill bg-white" />}
      </div>
      <div className="w-9 h-9 bg-brand-50 rounded-pill flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-brand-700" strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-fg truncate">{nombre}</p>
        <p className="text-xs text-fg-muted truncate">{detalle}</p>
      </div>
      <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-pill flex-shrink-0 ${tagStyles}`}>
        {tag}
      </span>
    </button>
  );
}

function PagoMovilForm({
  refPago, setRefPago,
  bancoOrigen, setBancoOrigen,
  cedulaPago, setCedulaPago,
}) {
  const inputClass = "w-full px-4 py-3 border border-stroke bg-surface rounded-xl text-sm placeholder:text-fg-subtle focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200 transition";
  return (
    <div className="bg-surface border border-stroke rounded-card p-4 mt-4 space-y-3 shadow-card">
      <h3 className="text-sm font-semibold text-fg">Datos del pago móvil</h3>
      <div>
        <label className="text-xs font-semibold text-fg-muted block mb-1.5">Últimos 4 dígitos de la referencia</label>
        <input
          type="text"
          value={refPago}
          onChange={(e) => setRefPago(e.target.value)}
          maxLength="4"
          placeholder="Ej: 3045"
          className={inputClass}
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-fg-muted block mb-1.5">Banco origen</label>
        <select
          value={bancoOrigen}
          onChange={(e) => setBancoOrigen(e.target.value)}
          className={inputClass}
        >
          <option value="">Selecciona tu banco</option>
          <option value="Banco de Venezuela">Banco de Venezuela</option>
          <option value="Banesco">Banesco</option>
          <option value="Mercantil">Mercantil</option>
          <option value="Provincial">Provincial</option>
          <option value="BNC">Banco Nacional de Crédito</option>
          <option value="Bancamiga">Bancamiga</option>
          <option value="Bancaribe">Bancaribe</option>
          <option value="Exterior">Banco Exterior</option>
          <option value="Venezuela">Banco Venezolano de Crédito</option>
          <option value="Bicentenario">Bicentenario</option>
          <option value="Otro">Otro</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-fg-muted block mb-1.5">Cédula de identidad</label>
        <input
          type="text"
          value={cedulaPago}
          onChange={(e) => setCedulaPago(e.target.value)}
          placeholder="Ej: V-25432108"
          className={inputClass}
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value, valueClass = "text-fg" }) {
  return (
    <div className="flex justify-between items-center gap-3">
      <span className="text-xs text-fg-muted">{label}</span>
      <span className={`text-xs font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

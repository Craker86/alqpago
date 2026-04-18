"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Pagar() {
  const router = useRouter();
  const [metodoSeleccionado, setMetodoSeleccionado] = useState(null);
  const [propiedad, setPropiedad] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [pagoExitoso, setPagoExitoso] = useState(false);
  const [referencia, setReferencia] = useState("");
  // NUEVO: estado para el archivo del comprobante
  const [archivo, setArchivo] = useState(null);
  const [previsualizacion, setPrevisualizacion] = useState(null);
  const [refPago, setRefPago] = useState("");
  const [bancoOrigen, setBancoOrigen] = useState("");
  const [cedulaPago, setCedulaPago] = useState("");

  const metodos = [
    { id: "pago-movil", nombre: "Pago móvil", detalle: "Banesco · 0412-XXX-XX45", tag: "Instantáneo", tagColor: "bg-emerald-100 text-emerald-800" },
    { id: "zelle", nombre: "Zelle", detalle: "maria@gmail.com", tag: "USD", tagColor: "bg-purple-100 text-purple-800" },
    { id: "transferencia", nombre: "Transferencia bancaria", detalle: "Banco de Venezuela · Cta. 0102", tag: "Instantáneo", tagColor: "bg-emerald-100 text-emerald-800" },
    { id: "binance", nombre: "Binance Pay / USDT", detalle: "Wallet vinculada", tag: "Cripto", tagColor: "bg-purple-100 text-purple-800" },
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

  // NUEVO: funcion que se ejecuta cuando el usuario selecciona un archivo
  function handleArchivo(e) {
    const file = e.target.files[0];
    if (!file) return;
    setArchivo(file);

    // Si es una imagen, mostrar previsualizacion
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPrevisualizacion(e.target.result);
      reader.readAsDataURL(file);
    } else {
      // Si es PDF u otro, solo mostrar el nombre
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

    // NUEVO: si hay un archivo, subirlo a Supabase Storage
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

      // Obtener la URL publica del archivo subido
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
      // Enviar notificacion al propietario
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  if (pagoExitoso) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto flex flex-col items-center justify-center">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center w-full">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-3xl mx-auto">
            ✓
          </div>
          <h2 className="text-xl font-bold text-gray-900 mt-4">Pago registrado</h2>
          <p className="text-sm text-gray-500 mt-2">
            Tu pago de ${propiedad.monto_mensual} fue enviado. El propietario será notificado y confirmará en minutos.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mt-4 text-left space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Referencia</span>
              <span className="font-semibold text-gray-900">#{referencia}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Fecha</span>
              <span className="font-semibold text-gray-900">{new Date().toLocaleDateString("es-VE")}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Comprobante</span>
              <span className="font-semibold text-emerald-600">
                {archivo ? "Adjuntado ✓" : "No adjuntado"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Estado</span>
              <span className="font-semibold text-amber-500">Pendiente de confirmación</span>
            </div>
          </div>
          <Link href="/" className="block w-full py-3 rounded-xl bg-emerald-700 text-white font-semibold mt-6 text-center hover:bg-emerald-800">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto">

      <Link href="/" className="text-sm text-gray-500 flex items-center gap-1 mb-4">
        ← Volver
      </Link>

      <h1 className="text-xl font-bold text-gray-900 text-center">Pagar alquiler</h1>
      <p className="text-xs text-gray-500 text-center mt-1">{propiedad?.nombre}</p>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 mt-4 text-center">
        <p className="text-xs text-gray-500">Total a pagar</p>
        <p className="text-4xl font-bold text-emerald-800 mt-1">${propiedad?.monto_mensual}</p>
        <p className="text-xs text-gray-400 mt-1">Tasa BCV del día</p>
      </div>

      <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-3">Selecciona el método</h2>

      <div className="flex flex-col gap-2">
        {metodos.map((metodo) => (
          <button
            key={metodo.id}
            onClick={() => setMetodoSeleccionado(metodo.id)}
            className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
              metodoSeleccionado === metodo.id ? "border-emerald-500 bg-emerald-50" : "border-gray-200 bg-white"
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              metodoSeleccionado === metodo.id ? "border-emerald-600 bg-emerald-600" : "border-gray-300"
            }`}>
              {metodoSeleccionado === metodo.id && <div className="w-2 h-2 rounded-full bg-white"></div>}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{metodo.nombre}</p>
              <p className="text-xs text-gray-500">{metodo.detalle}</p>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-1 rounded-md ${metodo.tagColor}`}>{metodo.tag}</span>
          </button>
        ))}
      </div>

      {/* NUEVO: SECCION DE COMPROBANTE */}
      {/* DATOS DEL PAGO MOVIL */}
      {metodoSeleccionado === "pago-movil" && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Datos del pago móvil</h2>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Últimos 4 dígitos de la referencia</label>
            <input type="text" value={refPago} onChange={(e) => setRefPago(e.target.value)} maxLength="4" placeholder="Ej:3045" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Banco origen</label>
            <select value={bancoOrigen} onChange={(e) => setBancoOrigen(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 bg-white">
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
            <label className="text-xs font-medium text-gray-700 block mb-1">Cédula de identidad</label>
            <input type="text" value={cedulaPago} onChange={(e) => setCedulaPago(e.target.value)} placeholder="Ej: V-25432108" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
          </div>
        </div>
      )}
      <h2 className="text-sm font-semibold text-gray-900 mt-6 mb-3">Adjuntar comprobante</h2>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        {!archivo ? (
          <label className="flex flex-col items-center gap-2 cursor-pointer py-4">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">
              📎
            </div>
            <p className="text-sm text-gray-600 font-medium">Toca para subir foto o PDF</p>
            <p className="text-xs text-gray-400">Captura de pago móvil, transfer o Zelle</p>
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
              <img src={previsualizacion} alt="Comprobante" className="w-16 h-16 rounded-lg object-cover" />
            ) : (
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">📄</div>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{archivo.name}</p>
              <p className="text-xs text-gray-500">{(archivo.size / 1024).toFixed(0)} KB</p>
            </div>
            <button
              onClick={() => { setArchivo(null); setPrevisualizacion(null); }}
              className="text-xs text-red-500 font-medium"
            >
              Quitar
            </button>
          </div>
        )}
      </div>

      <button
        onClick={confirmarPago}
        disabled={!metodoSeleccionado || enviando}
        className={`w-full py-4 rounded-xl text-white font-semibold mt-6 transition-all ${
          metodoSeleccionado && !enviando ? "bg-emerald-700 hover:bg-emerald-800" : "bg-gray-300 cursor-not-allowed"
        }`}
      >
        {enviando ? "Subiendo comprobante..." : "Confirmar pago →"}
      </button>

    </div>
  );
}

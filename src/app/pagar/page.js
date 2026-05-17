"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { enviarNotificacion } from "../lib/notificar";
import { formatBs, formatUsd, formatTasa, tiempoRelativo } from "../lib/format";
import { METODOS, getMetodoMeta, obtenerMetodosCobroActivos } from "../lib/metodosCobro";
import {
  ArrowLeft,
  Smartphone,
  DollarSign,
  Landmark,
  CreditCard,
  Banknote,
  Upload,
  FileText,
  Check,
  Copy,
  X,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

const ICONOS = {
  Smartphone, DollarSign, Landmark, CreditCard, Banknote,
};

export default function Pagar() {
  const router = useRouter();
  const [metodoSeleccionado, setMetodoSeleccionado] = useState(null);
  const [propiedad, setPropiedad] = useState(null);
  const [propietarioNombre, setPropietarioNombre] = useState(null);
  const [metodosDisponibles, setMetodosDisponibles] = useState([]); // los del propietario
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [pagoExitoso, setPagoExitoso] = useState(false);
  const [refPago, setRefPago] = useState(""); // referencia del banco (últimos 4 dígitos)
  const [bancoOrigen, setBancoOrigen] = useState("");
  const [cedulaPago, setCedulaPago] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [previsualizacion, setPrevisualizacion] = useState(null);
  const [tasa, setTasa] = useState(0);
  const [tasaActualizada, setTasaActualizada] = useState(null);
  const [codigoRentto, setCodigoRentto] = useState(""); // generado al cargar
  const [codigoUsado, setCodigoUsado] = useState(""); // el que terminó usándose (puede regenerarse)

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      // Propiedad vinculada al inquilino
      const { data: vinculacion } = await supabase
        .from("vinculaciones")
        .select("*, propiedades(*)")
        .eq("inquilino_id", session.user.id)
        .eq("estado", "activo")
        .limit(1)
        .maybeSingle();
      const prop = vinculacion?.propiedades || null;
      setPropiedad(prop);

      if (prop?.user_id) {
        // Métodos de cobro activos del propietario
        try {
          const m = await obtenerMetodosCobroActivos(prop.user_id);
          setMetodosDisponibles(m);
        } catch {
          setMetodosDisponibles([]);
        }

        // Nombre del propietario para humanizar
        const { data: dueno } = await supabase
          .from("perfiles")
          .select("nombre")
          .eq("id", prop.user_id)
          .maybeSingle();
        setPropietarioNombre(dueno?.nombre || null);
      }

      // Última tasa BCV
      const { data: tasaData } = await supabase
        .from("tasa_bcv")
        .select("tasa, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (tasaData) {
        setTasa(tasaData.tasa);
        setTasaActualizada(tasaData.created_at);
      }

      // Código de pago Rentto — generado por Postgres para garantizar unicidad
      const { data: codigo } = await supabase.rpc("generar_codigo_pago");
      if (codigo) setCodigoRentto(codigo);

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
      alert("Por favor adjuntá el comprobante de pago");
      return;
    }
    setEnviando(true);

    let comprobanteUrl = null;
    if (archivo) {
      const nombreArchivo = `${Date.now()}-${archivo.name}`;
      const { error: uploadError } = await supabase.storage
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

    const metodoMeta = getMetodoMeta(metodoSeleccionado);
    const { data: { session } } = await supabase.auth.getSession();
    const { data: nuevoPago, error } = await supabase.from("pagos").insert({
      propiedad_id: propiedad.id,
      user_id: session.user.id,
      monto: propiedad.monto_mensual,
      monto_bs: tasa > 0 ? propiedad.monto_mensual * tasa : null,
      metodo: metodoMeta?.nombre || metodoSeleccionado,
      referencia: refPago || null, // últimos 4 dígitos del banco (opcional)
      codigo_rentto: codigoRentto || null, // si null, el trigger lo asigna
      estado: "pendiente",
      fecha_pago: new Date().toISOString().split("T")[0],
      comprobante_url: comprobanteUrl,
      notas: metodoSeleccionado === "pago_movil"
        ? `Banco: ${bancoOrigen} | Cédula: ${cedulaPago}`
        : null,
    }).select().single();

    if (error) {
      alert("Error al registrar el pago: " + error.message);
      setEnviando(false);
      return;
    }

    setCodigoUsado(nuevoPago?.codigo_rentto || codigoRentto);

    // Email al propietario (mismo flujo que antes)
    if (propiedad.propietario_email && propiedad.user_id) {
      const { data: propPerfil } = await supabase
        .from("perfiles")
        .select("notif_prefs")
        .eq("id", propiedad.user_id)
        .single();
      const emailOk = propPerfil?.notif_prefs?.pago_recibido?.email ?? true;
      if (emailOk) {
        enviarNotificacion({
          tipo: "pago_creado",
          email: propiedad.propietario_email,
          data: {
            monto: propiedad.monto_mensual,
            metodo: metodoMeta?.nombre || metodoSeleccionado,
            fecha: new Date().toLocaleDateString("es-VE"),
            codigo: nuevoPago?.codigo_rentto || codigoRentto,
          },
        }).catch(() => {});
      }
    }

    setPagoExitoso(true);
    setEnviando(false);
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center">
        <p className="text-fg-subtle text-sm">Cargando…</p>
      </div>
    );
  }

  if (!propiedad) {
    return (
      <div className="min-h-screen bg-surface-muted pb-24">
        <div className="max-w-[480px] mx-auto px-5">
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mt-5 mb-2 transition">
            <ArrowLeft size={14} strokeWidth={2.25} /> Volver
          </Link>
          <div className="bg-surface rounded-card shadow-card p-8 text-center mt-4">
            <div className="w-14 h-14 bg-brand-50 rounded-pill flex items-center justify-center mx-auto">
              <ArrowLeft size={22} className="text-brand-300" strokeWidth={1.75} />
            </div>
            <h1 className="text-lg font-bold text-fg mt-4">Sin propiedad</h1>
            <p className="text-xs text-fg-muted mt-1 max-w-[280px] mx-auto leading-relaxed">
              Para pagar necesitás vincularte a una propiedad con el código de tu propietario.
            </p>
            <Link
              href="/vincular"
              className="inline-flex items-center justify-center gap-2 mt-5 px-5 py-2.5 bg-brand-800 text-fg-inverse rounded-pill text-xs font-semibold shadow-card hover:bg-brand-900 transition"
            >
              Vincular ahora <ArrowRight size={12} strokeWidth={2.5} />
            </Link>
          </div>
        </div>
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
              Tu pago de <span className="font-semibold text-brand-700">{formatUsd(propiedad.monto_mensual)}</span> fue enviado. El propietario será notificado y confirmará en minutos.
            </p>

            <div className="bg-surface-subtle rounded-card p-4 mt-4 text-left space-y-2.5">
              <InfoRow label="Código" value={codigoUsado || "—"} valueClass="text-fg font-mono tracking-wider" />
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

  const sinMetodos = metodosDisponibles.length === 0;
  const metodoActual = metodoSeleccionado ? metodosDisponibles.find((m) => m.tipo === metodoSeleccionado) : null;
  const metaActual = metodoActual ? getMetodoMeta(metodoActual.tipo) : null;

  return (
    <div className="min-h-screen bg-surface-muted pb-24">
      <div className="max-w-[480px] mx-auto px-5">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mt-5 mb-2 transition">
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
          <p className="text-4xl font-bold mt-1 tracking-tight">
            {formatUsd(propiedad?.monto_mensual)}
          </p>
          {tasa > 0 && (
            <p className="text-sm opacity-85 mt-1">
              {formatBs(propiedad?.monto_mensual * tasa)}
            </p>
          )}
          {tasa > 0 && (
            <p className="text-[10px] opacity-60 mt-0.5">
              1 USD = Bs. {formatTasa(tasa)}
              {tasaActualizada && ` · BCV ${tiempoRelativo(tasaActualizada)}`}
            </p>
          )}
        </section>

        {/* Código Rentto — clave del flujo: el inquilino lo pega en el concepto */}
        {codigoRentto && (
          <CodigoBox codigo={codigoRentto} />
        )}

        {sinMetodos ? (
          <div className="bg-warning-100 text-warning-700 rounded-card p-4 mt-6 flex items-start gap-3">
            <AlertCircle size={18} strokeWidth={2.25} className="flex-shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <p className="font-semibold">
                {propietarioNombre || "El propietario"} no configuró métodos de cobro
              </p>
              <p className="opacity-90 mt-0.5">
                Pedile que cargue al menos uno en su panel para que puedas pagar desde acá.
              </p>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-sm font-semibold text-fg mt-6 mb-3">Elegí el método</h2>
            <div className="flex flex-col gap-2">
              {metodosDisponibles.map((m) => {
                const meta = getMetodoMeta(m.tipo);
                if (!meta) return null;
                const Icon = ICONOS[meta.icono];
                return (
                  <MetodoButton
                    key={m.tipo}
                    nombre={meta.nombre}
                    detalle={resumenMetodo(m, meta)}
                    Icon={Icon}
                    selected={metodoSeleccionado === m.tipo}
                    onClick={() => setMetodoSeleccionado(m.tipo)}
                  />
                );
              })}
            </div>

            {metodoActual && metaActual && (
              <DatosPropietarioBox metodo={metodoActual} meta={metaActual} codigo={codigoRentto} />
            )}

            {metodoSeleccionado === "pago_movil" && (
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
                  <input type="file" accept="image/*,.pdf" onChange={handleArchivo} className="hidden" />
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
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================

function resumenMetodo(g, meta) {
  // Preview corto del método guardado (mismo helper que en /metodos-pago)
  const parts = [];
  for (const c of meta.campos) {
    const v = g[c.key];
    if (!v || c.key === "nota") continue;
    parts.push(v);
  }
  return parts.join(" · ") || meta.detalle;
}

function CodigoBox({ codigo }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {}
  }
  return (
    <section className="bg-surface border-2 border-dashed border-brand-300 rounded-card p-4 mt-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-brand-700">
            Código del pago
          </p>
          <p className="text-2xl font-bold text-brand-800 font-mono tracking-[0.15em] mt-1">
            {codigo}
          </p>
          <p className="text-[11px] text-fg-muted mt-2 leading-relaxed">
            Pegá este código en el <strong>concepto</strong> de la transferencia. Así tu propietario lo encuentra al instante.
          </p>
        </div>
        <button
          onClick={copiar}
          aria-label={copiado ? "Copiado" : "Copiar código"}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-pill text-xs font-semibold transition flex-shrink-0 ${
            copiado
              ? "bg-success-100 text-success-600"
              : "bg-brand-50 text-brand-700 hover:bg-brand-100"
          }`}
        >
          {copiado ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} strokeWidth={2.25} />}
          {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>
    </section>
  );
}

function DatosPropietarioBox({ metodo, meta, codigo }) {
  const [copiadoTodo, setCopiadoTodo] = useState(false);

  // Solo mostramos campos con valor (y "nota" si existe)
  const filas = meta.campos
    .map((c) => ({ label: c.label, valor: metodo[c.key] }))
    .filter((f) => f.valor && f.valor.trim());

  // Texto que se copia: "Banco: X | Teléfono: Y | Cédula: Z | Código: R-AAAA"
  const textoCompleto = [
    ...filas.map((f) => `${f.label}: ${f.valor}`),
    codigo ? `Código: ${codigo}` : null,
  ].filter(Boolean).join(" | ");

  async function copiarTodo() {
    try {
      await navigator.clipboard.writeText(textoCompleto);
      setCopiadoTodo(true);
      setTimeout(() => setCopiadoTodo(false), 1500);
    } catch {}
  }

  async function copiarValor(v) {
    try { await navigator.clipboard.writeText(v); } catch {}
  }

  return (
    <section className="bg-surface border border-stroke rounded-card p-4 mt-3 shadow-card">
      <p className="text-[11px] uppercase tracking-wide font-semibold text-fg-muted">
        Datos del propietario
      </p>
      <p className="text-[11px] text-fg-muted mt-1 mb-3 leading-relaxed">
        {meta.instruccionInquilino}
      </p>

      <div className="space-y-2">
        {filas.map((f) => (
          <button
            key={f.label}
            onClick={() => copiarValor(f.valor)}
            className="w-full flex items-center justify-between gap-2 p-2.5 bg-surface-subtle hover:bg-brand-50 rounded-xl transition group text-left"
          >
            <div className="min-w-0">
              <p className="text-[10px] text-fg-subtle uppercase tracking-wide">{f.label}</p>
              <p className="text-sm text-fg font-medium truncate">{f.valor}</p>
            </div>
            <Copy size={12} strokeWidth={2.25} className="text-fg-subtle group-hover:text-brand-700 flex-shrink-0" />
          </button>
        ))}
      </div>

      <button
        onClick={copiarTodo}
        className={`w-full inline-flex items-center justify-center gap-2 mt-3 py-2.5 rounded-pill text-xs font-semibold transition ${
          copiadoTodo
            ? "bg-success-100 text-success-600"
            : "bg-brand-800 text-fg-inverse hover:bg-brand-900 shadow-card"
        }`}
      >
        {copiadoTodo ? <><Check size={12} strokeWidth={2.5} /> Copiado</> : <><Copy size={12} strokeWidth={2.25} /> Copiar todo</>}
      </button>
    </section>
  );
}

function MetodoButton({ nombre, detalle, Icon, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-4 rounded-card border text-left transition-all ${
        selected ? "border-brand-700 bg-brand-50 shadow-card" : "border-stroke bg-surface hover:border-brand-300"
      }`}
    >
      <div className={`w-5 h-5 rounded-pill border-2 flex items-center justify-center flex-shrink-0 transition ${
        selected ? "border-brand-700 bg-brand-700" : "border-stroke-strong"
      }`}>
        {selected && <div className="w-2 h-2 rounded-pill bg-white" />}
      </div>
      <div className="w-9 h-9 bg-brand-50 rounded-pill flex items-center justify-center flex-shrink-0">
        {Icon && <Icon size={16} className="text-brand-700" strokeWidth={2.25} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-fg truncate">{nombre}</p>
        <p className="text-xs text-fg-muted truncate">{detalle}</p>
      </div>
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
      <h3 className="text-sm font-semibold text-fg">Tus datos del pago</h3>
      <p className="text-[11px] text-fg-muted -mt-2">Ayudan al propietario a identificarte si el comprobante no llega claro.</p>
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
        <select value={bancoOrigen} onChange={(e) => setBancoOrigen(e.target.value)} className={inputClass}>
          <option value="">Seleccioná tu banco</option>
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

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import {
  ArrowLeft,
  Camera,
  CreditCard,
  FileImage,
  Briefcase,
  UserCheck,
  Home as HomeIcon,
  FileText,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import LiveSelfieCapture from "./LiveSelfieCapture";

// Tipos de documento por rol. Cada uno define { key, label, descripcion, icon, captureMode }
// captureMode: "user" = cámara frontal (selfie), "environment" = cámara trasera (docs), null = cualquier archivo
const DOCS_INQUILINO = [
  { key: "cedula_frente", label: "Cédula — frente", desc: "Foto clara del frente de tu cédula", Icon: CreditCard, capture: "environment" },
  { key: "cedula_dorso", label: "Cédula — dorso", desc: "Foto del dorso de tu cédula", Icon: CreditCard, capture: "environment" },
  { key: "selfie", label: "Selfie en vivo", desc: "Activamos tu cámara y te pedimos un gesto rápido para verificar que sos vos en este momento", Icon: Camera, live: true },
  { key: "referencia_laboral", label: "Referencia laboral", desc: "Foto de tu carnet de trabajo o constancia de empleo", Icon: Briefcase, capture: "environment" },
];

const DOCS_PROPIETARIO = [
  { key: "cedula_frente", label: "Cédula — frente", desc: "Foto clara del frente de tu cédula", Icon: CreditCard, capture: "environment" },
  { key: "cedula_dorso", label: "Cédula — dorso", desc: "Foto del dorso de tu cédula", Icon: CreditCard, capture: "environment" },
  { key: "selfie", label: "Selfie en vivo", desc: "Activamos tu cámara y te pedimos un gesto rápido para verificar que sos vos en este momento", Icon: Camera, live: true },
  { key: "comprobante_domicilio", label: "Comprobante de domicilio", desc: "Recibo de CANTV, Movistar, agua o luz a tu nombre (últimos 3 meses)", Icon: HomeIcon, capture: "environment" },
  { key: "documento_propiedad", label: "Documento de propiedad", desc: "Foto del documento que acredita que eres dueño (escritura, contrato, recibo de condominio a tu nombre)", Icon: FileText, capture: "environment" },
];

export default function Verificar() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [userId, setUserId] = useState(null);
  const [rol, setRol] = useState(null);
  const [verif, setVerif] = useState(null); // fila existente (si hay)
  const [archivos, setArchivos] = useState({}); // { [key]: { file, previewUrl, path } }
  const [cedulaNumero, setCedulaNumero] = useState("");
  const [refNombre, setRefNombre] = useState("");
  const [refTel, setRefTel] = useState("");
  const [consentimiento, setConsentimiento] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setUserId(session.user.id);

      const { data: perfil } = await supabase
        .from("perfiles")
        .select("rol")
        .eq("id", session.user.id)
        .single();
      if (!perfil) { router.push("/dashboard"); return; }
      setRol(perfil.rol);

      const { data: existente } = await supabase
        .from("verificaciones")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (existente) {
        setVerif(existente);
        setCedulaNumero(existente.cedula_numero || "");
        setRefNombre(existente.referencia_personal_nombre || "");
        setRefTel(existente.referencia_personal_telefono || "");
        setConsentimiento(existente.consentimiento);
      }

      setCargando(false);
    }
    cargar();
  }, []);

  const docs = rol === "propietario" ? DOCS_PROPIETARIO : DOCS_INQUILINO;
  const editable = !verif || verif.estado === "rechazada" || verif.estado === "requiere_reenvio";

  function onArchivoSeleccionado(key, file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imágenes (JPG, PNG, HEIC).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("La imagen debe pesar menos de 8 MB.");
      return;
    }
    setError("");
    const previewUrl = URL.createObjectURL(file);
    setArchivos((prev) => ({ ...prev, [key]: { file, previewUrl } }));
  }

  function removerArchivo(key) {
    setArchivos((prev) => {
      const next = { ...prev };
      if (next[key]?.previewUrl) URL.revokeObjectURL(next[key].previewUrl);
      delete next[key];
      return next;
    });
  }

  function normalizarCedula(raw) {
    // Acepta formatos: V12345678, V-12345678, 12345678 (asume V), v-12345678
    const limpio = raw.trim().toUpperCase().replace(/[^VEJ0-9]/g, "");
    if (!limpio) return "";
    const letra = /^[VEJ]/.test(limpio) ? limpio[0] : "V";
    const numeros = limpio.replace(/^[VEJ]/, "").replace(/\D/g, "");
    return numeros ? `${letra}-${numeros}` : "";
  }

  async function enviar() {
    setError("");

    // Validaciones
    if (!consentimiento) {
      setError("Debes aceptar el consentimiento para enviar tus documentos.");
      return;
    }
    if (!cedulaNumero.trim()) {
      setError("Escribe tu número de cédula.");
      return;
    }
    const cedulaNorm = normalizarCedula(cedulaNumero);
    if (!cedulaNorm || !/^[VEJ]-\d{6,9}$/.test(cedulaNorm)) {
      setError("El formato de cédula no es válido. Ejemplo: V-12345678");
      return;
    }
    // Documentos faltantes (solo los que no existen ya en BD)
    const faltantes = docs.filter((d) => !archivos[d.key] && !verif?.[`${d.key}_path`]);
    if (faltantes.length > 0) {
      setError(`Falta subir: ${faltantes.map((d) => d.label).join(", ")}`);
      return;
    }
    // Referencia personal (solo inquilino)
    if (rol !== "propietario") {
      if (!refNombre.trim() || !refTel.trim()) {
        setError("Completa el nombre y teléfono de tu referencia personal.");
        return;
      }
    }

    setEnviando(true);

    try {
      // 1. Subir cada archivo nuevo a Storage
      const paths = {};
      for (const doc of docs) {
        const a = archivos[doc.key];
        if (!a) continue; // ya estaba subido en BD, no lo cambia
        const ext = (a.file.name.split(".").pop() || "jpg").toLowerCase();
        const ts = Date.now();
        const path = `${userId}/${doc.key}/${ts}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("verificaciones")
          .upload(path, a.file, { contentType: a.file.type, upsert: false });
        if (upErr) throw new Error(`Error subiendo ${doc.label}: ${upErr.message}`);
        paths[`${doc.key}_path`] = path;
      }

      // 2. Construir payload upsert
      const payload = {
        user_id: userId,
        rol: rol === "propietario" ? "propietario" : "inquilino",
        estado: "pendiente",
        cedula_numero: cedulaNorm,
        consentimiento: true,
        nota_revisor: null, // limpia nota anterior si era requiere_reenvio
        ...paths,
      };
      if (rol !== "propietario") {
        payload.referencia_personal_nombre = refNombre.trim();
        payload.referencia_personal_telefono = refTel.trim();
      }

      // 3. Upsert
      const { error: dbErr } = await supabase
        .from("verificaciones")
        .upsert(payload, { onConflict: "user_id" });
      if (dbErr) throw new Error(`Error guardando: ${dbErr.message}`);

      // 4. Refrescar y limpiar previews locales
      Object.values(archivos).forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
      setArchivos({});
      const { data: refreshed } = await supabase
        .from("verificaciones")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      setVerif(refreshed);
    } catch (e) {
      setError(e.message || "Error inesperado al enviar.");
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center">
        <p className="text-fg-subtle text-sm">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-muted pb-24">
      <div className="max-w-[480px] mx-auto px-5">
        <Link
          href="/perfil"
          className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mt-5 mb-2 transition"
        >
          <ArrowLeft size={14} strokeWidth={2.25} /> Volver al perfil
        </Link>

        <header className="mt-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={22} className="text-brand-700" strokeWidth={2.25} />
            <h1 className="text-2xl font-bold text-fg">Verifica tu identidad</h1>
          </div>
          <p className="text-sm text-fg-muted mt-1">
            Documentos requeridos para que propietarios e inquilinos confíen en ti.
          </p>
        </header>

        <EstadoBanner verif={verif} />

        <ConsentimientoCard
          aceptado={consentimiento}
          onChange={setConsentimiento}
          disabled={!editable || enviando}
        />

        <DatosPersonales
          cedulaNumero={cedulaNumero}
          onCedulaChange={setCedulaNumero}
          rol={rol}
          refNombre={refNombre}
          refTel={refTel}
          onRefNombreChange={setRefNombre}
          onRefTelChange={setRefTel}
          disabled={!editable || enviando}
        />

        <section className="mt-6">
          <h2 className="text-sm font-semibold text-fg mb-3">Documentos</h2>
          <div className="flex flex-col gap-3">
            {docs.map((d) => (
              <DocCard
                key={d.key}
                doc={d}
                userId={userId}
                archivoLocal={archivos[d.key]}
                pathRemoto={verif?.[`${d.key}_path`]}
                onSeleccionar={(file) => onArchivoSeleccionado(d.key, file)}
                onRemover={() => removerArchivo(d.key)}
                disabled={!editable || enviando}
              />
            ))}
          </div>
        </section>

        {error && (
          <div className="mt-4 bg-danger-100 text-danger-600 rounded-card p-3 text-xs flex items-start gap-2">
            <AlertTriangle size={14} strokeWidth={2.25} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {editable && (
          <button
            onClick={enviar}
            disabled={enviando}
            className={`w-full mt-5 py-3.5 rounded-pill text-fg-inverse font-semibold text-sm transition shadow-card flex items-center justify-center gap-2 ${
              enviando
                ? "bg-surface-subtle text-fg-subtle cursor-not-allowed"
                : "bg-brand-800 hover:bg-brand-900"
            }`}
          >
            {enviando ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Enviando…
              </>
            ) : verif ? (
              "Reenviar para verificación"
            ) : (
              "Enviar para verificación"
            )}
          </button>
        )}

        {!editable && (
          <p className="text-xs text-fg-muted text-center mt-5 leading-relaxed">
            Tus documentos están en revisión. Te avisaremos por correo y por la
            campanita en cuanto haya un cambio de estado.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Componentes
// ============================================================================

function EstadoBanner({ verif }) {
  if (!verif) return null;

  const config = {
    pendiente: {
      Icon: Clock,
      tone: "warning",
      titulo: "En revisión",
      cuerpo: "Tu solicitud está siendo revisada por el equipo Rentto. Suele tomar entre 1 y 24 horas.",
    },
    aprobada: {
      Icon: CheckCircle2,
      tone: "success",
      titulo: "Identidad verificada",
      cuerpo: "Tu identidad fue confirmada. Ya puedes vincularte a propiedades en cualquier modo.",
    },
    rechazada: {
      Icon: XCircle,
      tone: "danger",
      titulo: "Verificación rechazada",
      cuerpo: verif.nota_revisor || "Por favor revisa tus documentos y vuelve a enviarlos.",
    },
    requiere_reenvio: {
      Icon: AlertTriangle,
      tone: "warning",
      titulo: "Necesitamos que reenvíes algo",
      cuerpo: verif.nota_revisor || "Algunos documentos no se ven con claridad. Por favor reenvíalos.",
    },
  }[verif.estado];

  if (!config) return null;

  const styles = {
    success: "bg-success-100 text-success-600 border-success-600/20",
    warning: "bg-warning-100 text-warning-700 border-warning-600/20",
    danger: "bg-danger-100 text-danger-600 border-danger-600/20",
  }[config.tone];

  return (
    <div className={`mt-4 rounded-card border p-4 shadow-card ${styles}`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-white/40 rounded-pill flex items-center justify-center flex-shrink-0">
          <config.Icon size={18} strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">{config.titulo}</p>
          <p className="text-xs opacity-90 mt-0.5 leading-relaxed">{config.cuerpo}</p>
        </div>
      </div>
    </div>
  );
}

function ConsentimientoCard({ aceptado, onChange, disabled }) {
  return (
    <label className={`block bg-surface border border-stroke rounded-card p-4 mt-5 shadow-card ${disabled ? "opacity-70" : "cursor-pointer hover:border-brand-300"} transition`}>
      <div className="flex gap-3">
        <input
          type="checkbox"
          checked={aceptado}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="mt-0.5 h-4 w-4 accent-brand-700 flex-shrink-0"
        />
        <div className="flex-1">
          <p className="text-xs font-semibold text-fg">Acepto procesar mis documentos</p>
          <p className="text-[11px] text-fg-muted mt-1 leading-relaxed">
            Autorizo a Rentto a almacenar y revisar mi cédula y los demás documentos enviados con
            el único fin de verificar mi identidad. Las imágenes se guardan en almacenamiento
            privado y se borran <strong>90 días después de la aprobación</strong>. Detalles
            completos en nuestra{" "}
            <a
              href="/privacidad"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-700 font-semibold hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              política de privacidad
            </a>.
          </p>
        </div>
      </div>
    </label>
  );
}

function DatosPersonales({
  cedulaNumero,
  onCedulaChange,
  rol,
  refNombre,
  refTel,
  onRefNombreChange,
  onRefTelChange,
  disabled,
}) {
  return (
    <section className="bg-surface border border-stroke rounded-card p-4 mt-4 shadow-card space-y-4">
      <div>
        <label className="text-xs font-semibold text-fg-muted block mb-1.5">
          Número de cédula
        </label>
        <input
          type="text"
          value={cedulaNumero}
          onChange={(e) => onCedulaChange(e.target.value)}
          placeholder="V-12345678"
          disabled={disabled}
          className="w-full px-3 py-2.5 border border-stroke bg-surface rounded-xl text-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200 transition disabled:opacity-60"
        />
      </div>

      {rol !== "propietario" && (
        <>
          <div className="border-t border-stroke pt-3">
            <p className="text-xs font-semibold text-fg-muted mb-2 inline-flex items-center gap-1.5">
              <UserCheck size={12} strokeWidth={2.25} />
              Referencia personal
            </p>
            <p className="text-[11px] text-fg-subtle mb-2 leading-relaxed">
              Persona de contacto que pueda confirmar tu identidad. No debe ser familiar directo.
            </p>
            <input
              type="text"
              value={refNombre}
              onChange={(e) => onRefNombreChange(e.target.value)}
              placeholder="Nombre completo"
              disabled={disabled}
              className="w-full px-3 py-2.5 border border-stroke bg-surface rounded-xl text-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200 transition disabled:opacity-60 mb-2"
            />
            <input
              type="tel"
              value={refTel}
              onChange={(e) => onRefTelChange(e.target.value)}
              placeholder="0414-1234567"
              disabled={disabled}
              className="w-full px-3 py-2.5 border border-stroke bg-surface rounded-xl text-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200 transition disabled:opacity-60"
            />
          </div>
        </>
      )}
    </section>
  );
}

function DocCard({ doc, userId, archivoLocal, pathRemoto, onSeleccionar, onRemover, disabled }) {
  const inputRef = useRef(null);
  const [previewRemoto, setPreviewRemoto] = useState(null);
  const [liveAbierto, setLiveAbierto] = useState(false);

  // Si hay path remoto, generar URL firmada (5 min)
  useEffect(() => {
    let activo = true;
    async function cargar() {
      if (!pathRemoto || archivoLocal) {
        setPreviewRemoto(null);
        return;
      }
      const { data } = await supabase.storage
        .from("verificaciones")
        .createSignedUrl(pathRemoto, 300);
      if (activo && data?.signedUrl) setPreviewRemoto(data.signedUrl);
    }
    cargar();
    return () => { activo = false; };
  }, [pathRemoto, archivoLocal]);

  const preview = archivoLocal?.previewUrl || previewRemoto;
  const tieneAlgo = !!preview;
  const esLive = !!doc.live;

  function activar() {
    if (esLive) setLiveAbierto(true);
    else inputRef.current?.click();
  }

  function onLiveCapture(file) {
    setLiveAbierto(false);
    onSeleccionar(file);
  }

  const labelBoton = esLive
    ? tieneAlgo ? "Repetir selfie" : "Tomar selfie en vivo"
    : tieneAlgo ? "Cambiar foto" : "Tomar foto / Subir";

  return (
    <>
      <div className="bg-surface border border-stroke rounded-card p-3 shadow-card">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-brand-50 rounded-pill flex items-center justify-center flex-shrink-0">
            <doc.Icon size={18} className="text-brand-700" strokeWidth={2.25} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold text-fg">{doc.label}</p>
              {esLive && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-danger-100 text-danger-600 px-1.5 py-0.5 rounded-pill uppercase tracking-wide">
                  <span className="w-1 h-1 rounded-pill bg-danger-600 animate-pulse" />
                  En vivo
                </span>
              )}
            </div>
            <p className="text-[11px] text-fg-muted mt-0.5 leading-relaxed">{doc.desc}</p>

            {preview && (
              <div className="relative mt-2 rounded-xl overflow-hidden bg-surface-subtle border border-stroke">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt={doc.label}
                  className="w-full max-h-48 object-contain"
                />
                {archivoLocal && !disabled && (
                  <button
                    type="button"
                    onClick={onRemover}
                    className="absolute top-2 right-2 w-7 h-7 bg-surface/90 backdrop-blur rounded-pill flex items-center justify-center text-danger-600 shadow-card hover:bg-danger-100 transition"
                    aria-label="Quitar imagen"
                  >
                    <Trash2 size={14} strokeWidth={2.25} />
                  </button>
                )}
              </div>
            )}

            {!esLive && (
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture={doc.capture || undefined}
                onChange={(e) => onSeleccionar(e.target.files?.[0])}
                disabled={disabled}
                className="hidden"
              />
            )}

            {!disabled && (
              <button
                type="button"
                onClick={activar}
                className={`mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-pill border transition ${
                  tieneAlgo
                    ? "border-stroke text-fg-muted hover:bg-surface-subtle"
                    : "border-brand-700 text-brand-700 hover:bg-brand-50"
                }`}
              >
                {esLive ? <Camera size={12} strokeWidth={2.25} /> : <FileImage size={12} strokeWidth={2.25} />}
                {labelBoton}
              </button>
            )}
          </div>
        </div>
      </div>

      {liveAbierto && (
        <LiveSelfieCapture
          onCapture={onLiveCapture}
          onCancel={() => setLiveAbierto(false)}
        />
      )}
    </>
  );
}

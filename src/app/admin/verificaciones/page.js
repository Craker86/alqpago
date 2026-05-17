"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { enviarNotificacion } from "../../lib/notificar";
import {
  ArrowLeft,
  ShieldCheck,
  Clock,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  Phone,
} from "lucide-react";

// Documentos que se muestran en el detalle, según rol
const DOCS_INQUILINO = [
  { key: "selfie_path", label: "Selfie" },
  { key: "cedula_frente_path", label: "Cédula — frente" },
  { key: "cedula_dorso_path", label: "Cédula — dorso" },
  { key: "referencia_laboral_path", label: "Referencia laboral" },
];

const DOCS_PROPIETARIO = [
  { key: "selfie_path", label: "Selfie" },
  { key: "cedula_frente_path", label: "Cédula — frente" },
  { key: "cedula_dorso_path", label: "Cédula — dorso" },
  { key: "comprobante_domicilio_path", label: "Comprobante de domicilio" },
  { key: "documento_propiedad_path", label: "Documento de propiedad" },
];

const TABS = [
  { id: "pendiente", label: "Pendientes", tone: "warning" },
  { id: "requiere_reenvio", label: "Reenvío", tone: "warning" },
  { id: "aprobada", label: "Aprobadas", tone: "success" },
  { id: "rechazada", label: "Rechazadas", tone: "danger" },
];

export default function AdminVerificaciones() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [tab, setTab] = useState("pendiente");
  const [filas, setFilas] = useState([]);
  const [expandido, setExpandido] = useState(null);
  const [counts, setCounts] = useState({});

  async function cargarTodo() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    const { data: perfil } = await supabase
      .from("perfiles")
      .select("es_admin")
      .eq("id", session.user.id)
      .single();
    if (!perfil?.es_admin) { router.push("/dashboard"); return; }
    setAutorizado(true);

    // Counts por estado (para badges en tabs)
    const { data: todas } = await supabase
      .from("verificaciones")
      .select("estado");
    const c = { pendiente: 0, requiere_reenvio: 0, aprobada: 0, rechazada: 0 };
    (todas || []).forEach((v) => {
      if (v.estado in c) c[v.estado] += 1;
    });
    setCounts(c);
  }

  async function cargarPorTab(estadoTab) {
    const { data: verifs } = await supabase
      .from("verificaciones")
      .select("*")
      .eq("estado", estadoTab)
      .order("created_at", { ascending: estadoTab === "pendiente" });

    const ids = (verifs || []).map((v) => v.user_id);
    let perfilesPorId = {};
    if (ids.length > 0) {
      const { data: perfiles } = await supabase
        .from("perfiles")
        .select("id, nombre, telefono, email, rol")
        .in("id", ids);
      (perfiles || []).forEach((p) => { perfilesPorId[p.id] = p; });
    }

    const enriquecidas = (verifs || []).map((v) => ({
      ...v,
      perfil: perfilesPorId[v.user_id] || null,
    }));
    setFilas(enriquecidas);
  }

  useEffect(() => {
    (async () => {
      await cargarTodo();
      await cargarPorTab(tab);
      setCargando(false);
    })();
  }, []);

  useEffect(() => {
    if (!autorizado) return;
    cargarPorTab(tab);
    setExpandido(null);
  }, [tab, autorizado]);

  async function decidir(verifId, nuevoEstado, nota) {
    const { data: { session } } = await supabase.auth.getSession();

    // 1. UPDATE estado (trigger SQL crea notif inbox)
    const { error: updErr } = await supabase
      .from("verificaciones")
      .update({
        estado: nuevoEstado,
        nota_revisor: nota || null,
        revisada_por: session.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", verifId);

    if (updErr) {
      alert("Error al guardar: " + updErr.message);
      return;
    }

    // 2. Email al usuario (respetando notif_prefs.email)
    const fila = filas.find((f) => f.id === verifId);
    if (fila?.perfil?.email) {
      const tipoEvento =
        nuevoEstado === "aprobada" ? "verificacion_aprobada" :
        nuevoEstado === "rechazada" ? "verificacion_rechazada" :
        "verificacion_requiere_reenvio";

      const { data: destPerfil } = await supabase
        .from("perfiles")
        .select("notif_prefs")
        .eq("id", fila.user_id)
        .single();
      const emailOk = destPerfil?.notif_prefs?.[tipoEvento]?.email ?? true;

      if (emailOk) {
        enviarNotificacion({
          tipo: tipoEvento,
          email: fila.perfil.email,
          data: { nota: nota || "" },
        }).catch(() => {});
      }
    }

    // 3. Refrescar lista y contadores
    await cargarTodo();
    await cargarPorTab(tab);
    setExpandido(null);
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center">
        <p className="text-fg-subtle text-sm">Cargando…</p>
      </div>
    );
  }

  if (!autorizado) return null;

  return (
    <div className="min-h-screen bg-surface-muted pb-24">
      <div className="max-w-[480px] mx-auto px-5">
        <Link
          href="/perfil"
          className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mt-5 mb-2 transition"
        >
          <ArrowLeft size={14} strokeWidth={2.25} /> Volver
        </Link>

        <header className="mt-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={22} className="text-brand-700" strokeWidth={2.25} />
            <h1 className="text-2xl font-bold text-fg">Verificaciones</h1>
          </div>
          <p className="text-sm text-fg-muted mt-1">
            Revisa solicitudes y aprueba o rechaza con una nota.
          </p>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto -mx-5 px-5 pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-pill border transition ${
                tab === t.id
                  ? "bg-brand-800 text-fg-inverse border-brand-800 shadow-card"
                  : "bg-surface text-fg-muted border-stroke hover:border-brand-300"
              }`}
            >
              {t.label}
              <span className={`text-[10px] font-bold px-1.5 rounded-pill ${
                tab === t.id
                  ? "bg-white/20"
                  : "bg-surface-subtle text-fg-subtle"
              }`}>
                {counts[t.id] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {filas.length === 0 ? (
          <div className="bg-surface rounded-card shadow-card p-10 text-center mt-3">
            <p className="text-sm text-fg-muted">
              {tab === "pendiente"
                ? "No hay solicitudes pendientes — buen trabajo."
                : "Sin resultados en esta categoría."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-3">
            {filas.map((v) => (
              <SolicitudCard
                key={v.id}
                verif={v}
                abierto={expandido === v.id}
                onToggle={() => setExpandido(expandido === v.id ? null : v.id)}
                onDecidir={decidir}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================

function SolicitudCard({ verif, abierto, onToggle, onDecidir }) {
  const { perfil, estado } = verif;
  const nombre = perfil?.nombre || "Sin nombre";
  const inicial = (nombre[0] || "U").toUpperCase();

  const docs = verif.rol === "propietario" ? DOCS_PROPIETARIO : DOCS_INQUILINO;

  const estadoStyles = {
    pendiente: { bg: "bg-warning-100", txt: "text-warning-700", Icon: Clock, label: "Pendiente" },
    aprobada: { bg: "bg-success-100", txt: "text-success-600", Icon: CheckCircle2, label: "Aprobada" },
    rechazada: { bg: "bg-danger-100", txt: "text-danger-600", Icon: XCircle, label: "Rechazada" },
    requiere_reenvio: { bg: "bg-warning-100", txt: "text-warning-700", Icon: AlertTriangle, label: "Reenvío" },
  }[estado];

  const cuando = new Date(verif.created_at).toLocaleDateString("es-VE", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <article className="bg-surface rounded-card shadow-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 text-left hover:bg-surface-subtle transition"
      >
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 bg-brand-100 text-brand-800 rounded-pill flex items-center justify-center font-bold text-sm flex-shrink-0">
            {inicial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-fg truncate">{nombre}</h3>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-pill flex-shrink-0 ${estadoStyles.bg} ${estadoStyles.txt}`}>
                <estadoStyles.Icon size={10} strokeWidth={2.5} />
                {estadoStyles.label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-fg-muted mt-0.5">
              <span className="capitalize">{verif.rol}</span>
              <span>·</span>
              <span>{verif.cedula_numero || "—"}</span>
              <span>·</span>
              <span>{cuando}</span>
            </div>
          </div>
          <div className="flex-shrink-0 self-center text-fg-subtle">
            {abierto ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
      </button>

      {abierto && (
        <Detalle verif={verif} docs={docs} onDecidir={onDecidir} />
      )}
    </article>
  );
}

function Detalle({ verif, docs, onDecidir }) {
  const { perfil } = verif;

  return (
    <div className="px-4 pb-4 border-t border-stroke pt-3 space-y-4">
      {/* Datos de la persona */}
      <div className="bg-surface-subtle rounded-card p-3 text-xs space-y-1.5">
        <Row label="Email" value={perfil?.email || "—"} />
        <Row label="Teléfono" value={perfil?.telefono || "—"} icon={Phone} />
        <Row label="Cédula" value={verif.cedula_numero || "—"} />
        {verif.rol === "inquilino" && (
          <>
            <Row label="Ref. personal" value={verif.referencia_personal_nombre || "—"} />
            <Row label="Tel. ref. personal" value={verif.referencia_personal_telefono || "—"} />
          </>
        )}
      </div>

      {/* Documentos lado a lado */}
      <div>
        <p className="text-xs font-semibold text-fg-muted mb-2">Documentos</p>
        <div className="grid grid-cols-2 gap-2">
          {docs.map((d) => (
            <DocPreview
              key={d.key}
              path={verif[d.key]}
              label={d.label}
            />
          ))}
        </div>
      </div>

      {verif.estado !== "aprobada" && (
        <Acciones
          verif={verif}
          onDecidir={onDecidir}
        />
      )}

      {verif.nota_revisor && (
        <div className="text-[11px] text-fg-muted bg-surface-subtle rounded-card p-2.5 leading-relaxed">
          <span className="font-semibold">Nota anterior: </span>
          {verif.nota_revisor}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, icon: Icon }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-fg-muted inline-flex items-center gap-1">
        {Icon && <Icon size={11} strokeWidth={2} className="text-fg-subtle" />}
        {label}
      </span>
      <span className="text-fg font-medium text-right truncate">{value}</span>
    </div>
  );
}

function DocPreview({ path, label }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(false);
  const [openLightbox, setOpenLightbox] = useState(false);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      if (!path) { setError(true); return; }
      const { data, error: e } = await supabase.storage
        .from("verificaciones")
        .createSignedUrl(path, 600); // 10 min
      if (!activo) return;
      if (e) { setError(true); return; }
      setUrl(data?.signedUrl || null);
    }
    cargar();
    return () => { activo = false; };
  }, [path]);

  return (
    <>
      <button
        type="button"
        onClick={() => url && setOpenLightbox(true)}
        className="bg-surface-subtle rounded-xl border border-stroke overflow-hidden text-left hover:border-brand-300 transition group"
      >
        <div className="aspect-square bg-fg/5 flex items-center justify-center overflow-hidden">
          {error || !path ? (
            <span className="text-[10px] text-fg-subtle px-2 text-center">No subido</span>
          ) : url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={label}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <Loader2 size={14} className="animate-spin text-fg-subtle" />
          )}
        </div>
        <div className="px-2 py-1.5 flex items-center justify-between gap-1">
          <span className="text-[10px] font-semibold text-fg truncate">{label}</span>
          {url && <Eye size={11} strokeWidth={2.25} className="text-fg-subtle flex-shrink-0" />}
        </div>
      </button>

      {openLightbox && url && (
        <div
          onClick={() => setOpenLightbox(false)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 cursor-zoom-out"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={label}
            className="max-w-full max-h-full object-contain rounded-card"
          />
          <p className="absolute top-4 right-4 text-white/80 text-xs">Tap para cerrar</p>
        </div>
      )}
    </>
  );
}

function Acciones({ verif, onDecidir }) {
  const [accion, setAccion] = useState(null); // 'aprobada' | 'rechazada' | 'requiere_reenvio'
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function confirmar() {
    if ((accion === "rechazada" || accion === "requiere_reenvio") && !nota.trim()) {
      alert("Por favor escribe una nota explicando el motivo.");
      return;
    }
    setEnviando(true);
    await onDecidir(verif.id, accion, nota.trim());
    setEnviando(false);
    setAccion(null);
    setNota("");
  }

  if (accion) {
    const labelAccion = {
      aprobada: "Aprobar verificación",
      rechazada: "Rechazar verificación",
      requiere_reenvio: "Pedir reenvío",
    }[accion];
    const colorBtn = {
      aprobada: "bg-success-600 hover:bg-success-600/90",
      rechazada: "bg-danger-600 hover:bg-danger-600/90",
      requiere_reenvio: "bg-warning-600 hover:bg-warning-700",
    }[accion];

    return (
      <div className="space-y-2">
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder={
            accion === "aprobada"
              ? "Nota interna opcional…"
              : "Indícale al usuario qué tiene que corregir o por qué se rechaza…"
          }
          rows={3}
          className="w-full px-3 py-2 border border-stroke bg-surface rounded-xl text-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200 transition"
        />
        <div className="flex gap-2">
          <button
            onClick={() => { setAccion(null); setNota(""); }}
            disabled={enviando}
            className="flex-1 py-2.5 rounded-pill text-xs font-semibold text-fg-muted border border-stroke hover:bg-surface-subtle transition"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={enviando}
            className={`flex-1 py-2.5 rounded-pill text-xs font-semibold text-fg-inverse transition shadow-card ${colorBtn} disabled:opacity-60`}
          >
            {enviando ? "Guardando…" : labelAccion}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <button
        onClick={() => setAccion("aprobada")}
        className="inline-flex items-center justify-center gap-1 py-2.5 bg-success-100 text-success-600 rounded-pill text-xs font-bold hover:bg-success-100/80 transition"
      >
        <CheckCircle2 size={12} strokeWidth={2.5} /> Aprobar
      </button>
      <button
        onClick={() => setAccion("requiere_reenvio")}
        className="inline-flex items-center justify-center gap-1 py-2.5 bg-warning-100 text-warning-700 rounded-pill text-xs font-bold hover:bg-warning-100/80 transition"
      >
        <AlertTriangle size={12} strokeWidth={2.5} /> Reenvío
      </button>
      <button
        onClick={() => setAccion("rechazada")}
        className="inline-flex items-center justify-center gap-1 py-2.5 bg-danger-100 text-danger-600 rounded-pill text-xs font-bold hover:bg-danger-100/80 transition"
      >
        <XCircle size={12} strokeWidth={2.5} /> Rechazar
      </button>
    </div>
  );
}

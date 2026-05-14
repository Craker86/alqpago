"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { formatUsd } from "../lib/format";
import {
  ArrowLeft,
  Check,
  X,
  Paperclip,
  Banknote,
  Inbox,
  ShieldCheck,
  Phone,
  Home,
  Calendar,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function Cobros() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [pendientes, setPendientes] = useState([]);
  const [recientes, setRecientes] = useState([]); // confirmados/rechazados de hoy
  const [accionando, setAccionando] = useState(null); // pago_id en proceso

  async function cargar() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    const { data: perfil } = await supabase
      .from("perfiles")
      .select("rol")
      .eq("id", session.user.id)
      .single();
    if (perfil?.rol !== "propietario") {
      router.push("/dashboard");
      return;
    }

    // Propiedades del propietario
    const { data: props } = await supabase
      .from("propiedades")
      .select("id, nombre, direccion")
      .eq("user_id", session.user.id);
    const propIds = (props || []).map((p) => p.id);
    const propsMap = Object.fromEntries((props || []).map((p) => [p.id, p]));

    if (propIds.length === 0) {
      setPendientes([]);
      setRecientes([]);
      setCargando(false);
      return;
    }

    // Pagos pendientes
    const { data: pendData } = await supabase
      .from("pagos")
      .select("*")
      .in("propiedad_id", propIds)
      .eq("estado", "pendiente")
      .order("fecha_pago", { ascending: true });

    // Pagos confirmados/rechazados recientes (últimas 24h)
    const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recData } = await supabase
      .from("pagos")
      .select("*")
      .in("propiedad_id", propIds)
      .in("estado", ["confirmado", "rechazado"])
      .gte("updated_at", desde)
      .order("updated_at", { ascending: false })
      .limit(10);

    // Enriquecer con datos del inquilino + verificación + propiedad
    const userIds = [
      ...new Set([
        ...(pendData || []).map((p) => p.user_id),
        ...(recData || []).map((p) => p.user_id),
      ]),
    ];

    let perfilesPorId = {};
    let verifPorId = {};
    if (userIds.length > 0) {
      const { data: perfiles } = await supabase
        .from("perfiles")
        .select("id, nombre, telefono, email")
        .in("id", userIds);
      (perfiles || []).forEach((p) => { perfilesPorId[p.id] = p; });

      const { data: verifs } = await supabase
        .from("verificaciones")
        .select("user_id, estado")
        .in("user_id", userIds);
      (verifs || []).forEach((v) => { verifPorId[v.user_id] = v; });
    }

    const enriquecer = (pago) => ({
      ...pago,
      inquilino: perfilesPorId[pago.user_id] || null,
      verificacion: verifPorId[pago.user_id] || null,
      propiedad: propsMap[pago.propiedad_id] || null,
    });

    setPendientes((pendData || []).map(enriquecer));
    setRecientes((recData || []).map(enriquecer));
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function decidir(pagoId, nuevoEstado) {
    setAccionando(pagoId);
    const { error } = await supabase
      .from("pagos")
      .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
      .eq("id", pagoId);
    if (error) {
      alert("Error: " + error.message);
      setAccionando(null);
      return;
    }

    // Email al inquilino respetando notif_prefs
    const pago = pendientes.find((p) => p.id === pagoId);
    if (pago?.inquilino?.email) {
      const tipo = nuevoEstado === "confirmado" ? "pago_confirmado" : "pago_rechazado";
      const { data: prefs } = await supabase
        .from("perfiles")
        .select("notif_prefs")
        .eq("id", pago.user_id)
        .single();
      const emailOk = prefs?.notif_prefs?.[tipo]?.email ?? true;
      if (emailOk) {
        fetch("/api/notificar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo,
            email: pago.inquilino.email,
            data: { monto: pago.monto, metodo: pago.metodo },
          }),
        }).catch(() => {});
      }
    }

    await cargar();
    setAccionando(null);
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
          href="/propietario"
          className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mt-5 mb-2 transition"
        >
          <ArrowLeft size={14} strokeWidth={2.25} /> Volver al panel
        </Link>

        <header className="mt-2 pb-4">
          <div className="flex items-center gap-2">
            <Banknote size={22} className="text-brand-700" strokeWidth={2.25} />
            <h1 className="text-2xl font-bold text-fg">Cobros</h1>
          </div>
          <p className="text-sm text-fg-muted mt-1">
            {pendientes.length === 0
              ? "Al día. Sin pendientes."
              : `${pendientes.length} ${pendientes.length === 1 ? "pendiente" : "pendientes"}`}
          </p>
        </header>

        {pendientes.length === 0 ? (
          <EmptyState recientes={recientes} />
        ) : (
          <div className="flex flex-col gap-3">
            {pendientes.map((pago) => (
              <CobroCard
                key={pago.id}
                pago={pago}
                accionando={accionando === pago.id}
                onConfirmar={() => decidir(pago.id, "confirmado")}
                onRechazar={() => decidir(pago.id, "rechazado")}
              />
            ))}
          </div>
        )}

        {recientes.length > 0 && pendientes.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-fg mb-3">
              Procesados
            </h2>
            <div className="flex flex-col gap-2">
              {recientes.map((pago) => (
                <RecienteRow key={pago.id} pago={pago} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ============================================================================

function CobroCard({ pago, accionando, onConfirmar, onRechazar }) {
  const inquilino = pago.inquilino;
  const nombre = inquilino?.nombre || "Inquilino sin nombre";
  const inicial = (nombre[0] || "I").toUpperCase();
  const verificado = pago.verificacion?.estado === "aprobada";

  const fechaTexto = new Date(pago.fecha_pago).toLocaleDateString("es-VE", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <article className="bg-surface rounded-card shadow-card overflow-hidden">
      {/* Header con quién paga */}
      <header className="p-4 border-b border-stroke flex items-start gap-3">
        <div className="w-11 h-11 bg-brand-100 text-brand-800 rounded-pill flex items-center justify-center font-bold text-sm flex-shrink-0">
          {inicial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-fg truncate">{nombre}</p>
            {verificado && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-success-100 text-success-600 px-2 py-0.5 rounded-pill">
                <ShieldCheck size={10} strokeWidth={2.5} />
                Verificado
              </span>
            )}
          </div>
          <p className="text-xs text-fg-muted mt-0.5 inline-flex items-center gap-1">
            <Home size={11} strokeWidth={2} className="text-fg-subtle" />
            {pago.propiedad?.nombre || "—"}
          </p>
        </div>
      </header>

      {/* Datos del pago */}
      <div className="p-4 space-y-2 bg-surface-subtle">
        <Row label="Monto" value={formatUsd(pago.monto)} valueClass="text-brand-700 font-bold text-base" />
        <Row label="Método" value={pago.metodo || "—"} />
        <Row label="Fecha" value={fechaTexto} icon={Calendar} />
        {pago.referencia && (
          <Row label="Referencia" value={pago.referencia} />
        )}
        {inquilino?.telefono && (
          <Row label="Teléfono" value={inquilino.telefono} icon={Phone} />
        )}
        {pago.notas && (
          <div className="bg-surface rounded-xl p-2.5 mt-2">
            <p className="text-[10px] uppercase tracking-wide text-fg-subtle font-semibold">Nota del inquilino</p>
            <p className="text-xs text-fg mt-1 leading-relaxed">{pago.notas}</p>
          </div>
        )}
      </div>

      {/* Comprobante */}
      {pago.comprobante_url && (
        <div className="p-4 border-t border-stroke">
          <p className="text-[10px] uppercase tracking-wide text-fg-subtle font-semibold mb-2">
            Comprobante
          </p>
          <a
            href={pago.comprobante_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl overflow-hidden border border-stroke bg-fg/5 hover:border-brand-300 transition"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pago.comprobante_url}
              alt="Comprobante"
              className="w-full max-h-72 object-contain"
            />
            <div className="px-3 py-2 inline-flex items-center gap-1.5 text-[11px] text-fg-muted">
              <Paperclip size={11} strokeWidth={2.25} />
              Ver completo
            </div>
          </a>
        </div>
      )}

      {/* Acciones */}
      <div className="p-4 border-t border-stroke flex gap-2">
        <button
          onClick={onRechazar}
          disabled={accionando}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 border border-danger-600/30 text-danger-600 rounded-pill text-sm font-semibold hover:bg-danger-100 transition disabled:opacity-60"
        >
          {accionando ? <Loader2 size={14} className="animate-spin" /> : <X size={14} strokeWidth={2.5} />}
          Rechazar
        </button>
        <button
          onClick={onConfirmar}
          disabled={accionando}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 bg-brand-800 text-fg-inverse rounded-pill text-sm font-semibold shadow-card hover:bg-brand-900 transition disabled:opacity-60"
        >
          {accionando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2.5} />}
          Confirmar
        </button>
      </div>
    </article>
  );
}

function Row({ label, value, valueClass = "text-fg font-medium text-sm", icon: Icon }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-xs text-fg-muted inline-flex items-center gap-1">
        {Icon && <Icon size={11} strokeWidth={2} className="text-fg-subtle" />}
        {label}
      </span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

function EmptyState({ recientes }) {
  return (
    <>
      <div className="bg-surface rounded-card shadow-card p-10 text-center">
        <div className="w-14 h-14 bg-success-100 rounded-pill flex items-center justify-center mx-auto">
          <Inbox size={24} className="text-success-600" strokeWidth={1.75} />
        </div>
        <p className="text-sm font-semibold text-fg mt-4">Al día</p>
        <p className="text-xs text-fg-muted mt-1 max-w-[240px] mx-auto">
          Los nuevos pagos van a aparecer acá.
        </p>
      </div>

      {recientes.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-fg mb-3">
            Procesados
          </h2>
          <div className="flex flex-col gap-2">
            {recientes.map((pago) => (
              <RecienteRow key={pago.id} pago={pago} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function RecienteRow({ pago }) {
  const ok = pago.estado === "confirmado";
  const Icon = ok ? CheckCircle2 : XCircle;
  const tone = ok ? "text-success-600" : "text-danger-600";
  const nombre = pago.inquilino?.nombre || "—";

  return (
    <div className="bg-surface rounded-card border border-stroke p-3 flex items-center gap-3">
      <Icon size={18} className={`${tone} flex-shrink-0`} strokeWidth={2.25} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-fg truncate">
          {nombre} · {formatUsd(pago.monto)}
        </p>
        <p className="text-[10px] text-fg-muted truncate">
          {pago.propiedad?.nombre || "—"} · {pago.metodo}
        </p>
      </div>
      <span className={`text-[10px] font-bold ${tone}`}>
        {ok ? "Confirmado" : "Rechazado"}
      </span>
    </div>
  );
}

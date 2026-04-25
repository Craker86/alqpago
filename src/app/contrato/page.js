"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { Trophy, TrendingUp, Home, Calendar, User, FileText, AlertCircle } from "lucide-react";
import { calcularScore, CRITERIOS, toneDeModo } from "../lib/scoring";
import { getModo, calcularComisiones, toneDeModo as toneDeModoProp } from "../lib/modos";
import { Shield, ShieldCheck, ShieldPlus } from "lucide-react";

export default function Contrato() {
  const router = useRouter();
  const [rol, setRol] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [propiedad, setPropiedad] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [scoring, setScoring] = useState(null);
  const [historial, setHistorial] = useState([]);

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const { data: perfil } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      const currentRol = perfil?.rol || "inquilino";
      setRol(currentRol);

      if (currentRol === "propietario") {
        const { data: props } = await supabase
          .from("propiedades")
          .select("*, vinculaciones(*)")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        const todas = (props || []).flatMap((p) =>
          (p.vinculaciones || []).map((v) => ({ ...v, propiedad: p }))
        );

        const ids = [...new Set(todas.map((v) => v.inquilino_id))];
        let inquilinosPorId = {};
        if (ids.length > 0) {
          const { data: perfiles } = await supabase
            .from("perfiles")
            .select("id, nombre")
            .in("id", ids);
          (perfiles || []).forEach((p) => { inquilinosPorId[p.id] = p; });
        }
        setContratos(todas.map((v) => ({ ...v, inquilino: inquilinosPorId[v.inquilino_id] || null })));
      } else {
        // Propiedad vinculada al inquilino (o null)
        const { data: vinculacion } = await supabase
          .from("vinculaciones")
          .select("*, propiedades(*)")
          .eq("inquilino_id", session.user.id)
          .eq("estado", "activo")
          .limit(1)
          .maybeSingle();
        const prop = vinculacion?.propiedades || null;
        setPropiedad(prop);

        // Pagos solo del inquilino actual
        const { data: pagosData } = await supabase
          .from("pagos")
          .select("*")
          .eq("user_id", session.user.id);
        setPagos(pagosData || []);

        // Historial de eventos de score (poblado por el trigger en Supabase)
        const pagosIds = (pagosData || []).map((p) => p.id);
        if (pagosIds.length > 0) {
          const { data: historialData } = await supabase
            .from("score_historial")
            .select("*")
            .in("pago_id", pagosIds)
            .order("created_at", { ascending: false });
          setHistorial(historialData || []);
        }

        setScoring(
          calcularScore({
            perfil,
            user: { email: session.user.email, created_at: session.user.created_at },
            pagos: pagosData || [],
          })
        );
      }

      setCargando(false);
    }
    cargar();
  }, []);

  if (cargando) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center">
        <p className="text-fg-subtle text-sm">Cargando…</p>
      </div>
    );
  }

  if (rol === "propietario") {
    return <VistaPropietario contratos={contratos} />;
  }

  return <VistaInquilino propiedad={propiedad} pagos={pagos} scoring={scoring} historial={historial} />;
}

function VistaPropietario({ contratos }) {
  const activos = contratos.filter((c) => c.estado === "activo");

  return (
    <div className="min-h-screen bg-surface-muted pb-24">
      <div className="max-w-[480px] mx-auto px-5">
        <header className="pt-6 pb-4">
          <h1 className="text-2xl font-bold text-fg">Contratos</h1>
          <p className="text-sm text-fg-muted mt-1">
            {contratos.length} {contratos.length === 1 ? "contrato" : "contratos"} · {activos.length} {activos.length === 1 ? "activo" : "activos"}
          </p>
        </header>

        {contratos.length === 0 ? (
          <div className="bg-surface rounded-card shadow-card p-10 text-center">
            <div className="w-14 h-14 bg-brand-50 rounded-pill flex items-center justify-center mx-auto">
              <FileText size={24} className="text-brand-300" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-semibold text-fg mt-4">
              No hay contratos aún
            </p>
            <p className="text-xs text-fg-muted mt-1 max-w-[260px] mx-auto leading-relaxed">
              Cuando un inquilino se vincule a una de tus propiedades, aparecerá aquí.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {contratos.map((c) => (
              <ContratoCardPropietario key={c.id} contrato={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ContratoCardPropietario({ contrato }) {
  const { propiedad, inquilino, estado, inquilino_id, created_at } = contrato;
  const inquilinoNombre = inquilino?.nombre || `Inquilino ${inquilino_id.substring(0, 6)}…`;

  const statusStyles = {
    activo: "bg-success-100 text-success-600",
    pendiente: "bg-warning-100 text-warning-700",
    inactivo: "bg-surface-subtle text-fg-muted",
  }[estado] || "bg-surface-subtle text-fg-muted";

  return (
    <article className="bg-surface rounded-card shadow-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-fg truncate">{propiedad?.nombre || "—"}</h3>
          <p className="text-xs text-fg-muted mt-0.5 truncate">{propiedad?.direccion || "—"}</p>
        </div>
        <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-pill flex-shrink-0 ${statusStyles}`}>
          {estado}
        </span>
      </div>

      <div className="mt-3 pt-3 border-t border-stroke space-y-2">
        <Row icon={<User size={14} strokeWidth={2} />} label="Inquilino" value={inquilinoNombre} />
        <Row
          icon={<Home size={14} strokeWidth={2} />}
          label="Renta"
          value={propiedad?.monto_mensual ? `$${propiedad.monto_mensual} / mes` : "—"}
          valueClass="text-brand-700 font-semibold"
        />
        <Row
          icon={<Calendar size={14} strokeWidth={2} />}
          label="Desde"
          value={created_at ? new Date(created_at).toLocaleDateString("es-VE", { day: "numeric", month: "long", year: "numeric" }) : "—"}
        />
        <Row
          icon={<FileText size={14} strokeWidth={2} />}
          label="Cláusula"
          value={propiedad?.clausula_ajuste || "—"}
        />
      </div>
    </article>
  );
}

function ModoResumen({ propiedad }) {
  const modo = getModo(propiedad.modo);
  const tone = toneDeModoProp(modo.id);
  const comisiones = calcularComisiones(modo.id, propiedad.monto_mensual);
  const Icon = modo.id === "premium" ? ShieldPlus : modo.id === "protegido" ? ShieldCheck : Shield;

  const heroStyles = {
    brand: "bg-brand-800 text-fg-inverse",
    success: "bg-success-600 text-fg-inverse",
    warning: "bg-warning-600 text-fg-inverse",
  }[tone] || "bg-fg text-fg-inverse";

  return (
    <div className={`${heroStyles} rounded-card p-4 mt-3 shadow-elevated`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-pill flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
          <Icon size={20} strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wide opacity-80 font-semibold">Modo de Rentto</p>
          <p className="text-lg font-bold">{modo.label}</p>
          <p className="text-[11px] opacity-85">{modo.descripcion}</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-white/20 space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="opacity-80">Renta</span>
          <span className="font-semibold">${Number(propiedad.monto_mensual).toLocaleString("es-VE")}</span>
        </div>
        {comisiones.mensualInq > 0 && (
          <div className="flex justify-between text-xs">
            <span className="opacity-80">Comisión Rentto ({modo.inquilino.mensual}%)</span>
            <span className="font-semibold">+${comisiones.mensualInq.toFixed(0)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm pt-1.5 border-t border-white/20">
          <span className="font-semibold">Total que pagas</span>
          <span className="font-bold">${comisiones.totalMensualInq.toFixed(0)}/mes</span>
        </div>
      </div>

      {modo.coberturaMeses > 0 && (
        <p className="text-[11px] opacity-85 mt-3 pt-3 border-t border-white/20">
          🛡️ Rentto cubre hasta {modo.coberturaMeses} {modo.coberturaMeses === 1 ? "mes" : "meses"} de impago
        </p>
      )}
    </div>
  );
}

function Row({ icon, label, value, valueClass = "text-fg" }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
        <span className="text-fg-subtle">{icon}</span>
        {label}
      </span>
      <span className={`text-xs font-medium text-right truncate ${valueClass}`}>{value}</span>
    </div>
  );
}

function VistaInquilino({ propiedad, pagos, scoring, historial }) {
  const score = scoring?.score ?? 0;
  const modo = scoring?.modo ?? "En construcción";
  const desglose = scoring?.desglose ?? {};
  const pagosConfirmados = pagos.filter((p) => p.estado === "confirmado").length;
  const modoTone = toneDeModo(modo);
  const modoStyles = {
    brand: "bg-brand-100 text-brand-800",
    success: "bg-success-100 text-success-600",
    warning: "bg-warning-100 text-warning-700",
    neutral: "bg-surface-subtle text-fg-muted",
  }[modoTone];

  return (
    <div className="min-h-screen bg-surface-muted pb-24">
      <div className="max-w-[480px] mx-auto px-5">
        <header className="pt-6 pb-4">
          <h1 className="text-2xl font-bold text-fg">Mi alquiler</h1>
          <div className="inline-flex items-center gap-2 bg-success-100 text-success-600 px-3 py-1 rounded-pill text-xs font-semibold mt-3">
            <span className="w-1.5 h-1.5 rounded-pill bg-success-600" />
            Contrato activo
          </div>
        </header>

        {propiedad && (
          <>
            <div className="bg-surface rounded-card shadow-card p-4">
              <p className="font-semibold text-fg">{propiedad.nombre}</p>
              <div className="mt-3 pt-3 border-t border-stroke space-y-2">
                <Row icon={<Home size={14} strokeWidth={2} />} label="Dirección" value={propiedad.direccion} />
                <Row icon={<User size={14} strokeWidth={2} />} label="Propietario" value={propiedad.propietario_nombre || "—"} />
                <Row
                  icon={<FileText size={14} strokeWidth={2} />}
                  label="Monto mensual"
                  value={`$${propiedad.monto_mensual} / mes`}
                  valueClass="text-brand-700 font-semibold"
                />
                <Row icon={<Calendar size={14} strokeWidth={2} />} label="Día de corte" value={`${propiedad.dia_corte} de cada mes`} />
                <Row
                  icon={<Calendar size={14} strokeWidth={2} />}
                  label="Contrato hasta"
                  value={propiedad.fecha_fin_contrato
                    ? new Date(propiedad.fecha_fin_contrato).toLocaleDateString("es-VE", { month: "long", year: "numeric" })
                    : "Sin fecha"}
                />
                <Row icon={<AlertCircle size={14} strokeWidth={2} />} label="Cláusula de ajuste" value={propiedad.clausula_ajuste || "—"} />
              </div>
            </div>

            <ModoResumen propiedad={propiedad} />
          </>
        )}

        <h2 className="text-sm font-semibold text-fg mt-6 mb-3">Reputación de pago</h2>

        <div className="bg-surface rounded-card shadow-card p-4 flex items-center gap-4">
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-surface-subtle)" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-brand-600)" strokeWidth="3"
                strokeDasharray={`${score} 100`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-brand-800">{score}</span>
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-brand-800">{score} / 100</p>
              <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-pill ${modoStyles}`}>
                {modo}
              </span>
            </div>
            <p className="text-xs text-fg-muted mt-0.5">
              {pagosConfirmados} {pagosConfirmados === 1 ? "pago confirmado" : "pagos confirmados"}
            </p>
            <p className="text-xs text-brand-600 font-semibold mt-1">
              6 criterios, 100 puntos en total
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-card shadow-card p-4 mt-3">
          <h3 className="text-sm font-semibold text-fg">Desglose</h3>
          <div className="mt-3 space-y-3">
            {CRITERIOS.map((c) => {
              const valor = desglose[c.key] || 0;
              const pct = (valor / c.max) * 100;
              return (
                <div key={c.key}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-fg">{c.label}</p>
                    <span className="text-[11px] font-semibold text-fg-muted">
                      {valor} / {c.max}
                    </span>
                  </div>
                  <p className="text-[11px] text-fg-muted mt-0.5">{c.desc}</p>
                  <div className="mt-1.5 h-1.5 w-full bg-surface-subtle rounded-pill overflow-hidden">
                    <div
                      className={`h-full rounded-pill transition-all ${
                        valor === c.max ? "bg-success-600" : valor > 0 ? "bg-brand-600" : "bg-stroke"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {historial && historial.length > 0 && (
          <div className="bg-surface rounded-card shadow-card p-4 mt-3">
            <h3 className="text-sm font-semibold text-fg">Historial de score</h3>
            <p className="text-xs text-fg-muted mt-0.5">
              Eventos automáticos por cada pago confirmado o rechazado
            </p>
            <ol className="mt-3 space-y-2.5">
              {historial.slice(0, 10).map((ev) => {
                const positivo = ev.puntos > 0;
                return (
                  <li key={ev.id} className="flex items-start gap-2.5">
                    <span
                      className={`inline-flex items-center justify-center text-[11px] font-bold w-12 flex-shrink-0 px-2 py-0.5 rounded-pill ${
                        positivo
                          ? "bg-success-100 text-success-600"
                          : "bg-danger-100 text-danger-600"
                      }`}
                    >
                      {positivo ? "+" : ""}{ev.puntos}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-fg">{ev.motivo}</p>
                      <p className="text-[10px] text-fg-subtle">
                        {new Date(ev.created_at).toLocaleDateString("es-VE", {
                          day: "numeric", month: "long", year: "numeric",
                        })}
                        {" · Total: "}
                        <span className="font-semibold text-fg-muted">{ev.score_total} pts</span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
            {historial.length > 10 && (
              <p className="text-[10px] text-fg-subtle text-center mt-3">
                Mostrando 10 de {historial.length} eventos
              </p>
            )}
          </div>
        )}

        {score >= 70 && (
          <div className="bg-surface rounded-card shadow-card p-4 mt-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-warning-100 rounded-pill flex items-center justify-center flex-shrink-0">
              <Trophy size={18} className="text-warning-700" strokeWidth={2.25} />
            </div>
            <div>
              <p className="text-sm font-semibold text-fg">Beneficio desbloqueado</p>
              <p className="text-xs text-fg-muted mt-0.5">
                Calificás para modo <span className="font-semibold">{modo}</span> — acceso a tasas preferenciales
              </p>
            </div>
          </div>
        )}

        <div className="bg-surface rounded-card shadow-card p-4 mt-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 rounded-pill flex items-center justify-center flex-shrink-0">
            <TrendingUp size={18} className="text-brand-700" strokeWidth={2.25} />
          </div>
          <div>
            <p className="text-sm font-semibold text-fg">
              {score >= 85 ? "Score máximo alcanzado" : "Tu score está subiendo"}
            </p>
            <p className="text-xs text-fg-muted mt-0.5">
              {score >= 85
                ? "Mantén tus pagos puntuales para conservar tu nivel"
                : score >= 70
                  ? `Te faltan ${85 - score} pts para modo Premium`
                  : score >= 50
                    ? `Te faltan ${70 - score} pts para modo Protegido`
                    : `Te faltan ${50 - score} pts para calificar a modo Básico`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

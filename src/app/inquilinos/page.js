"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import {
  MessageCircle,
  Home,
  UserX,
  ChevronDown,
  ChevronUp,
  Phone,
  Calendar,
  FileText,
} from "lucide-react";
import { calcularScore, toneDeModo } from "../lib/scoring";

export default function Inquilinos() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [filas, setFilas] = useState([]);
  const [expandido, setExpandido] = useState(null);

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const { data: perfil } = await supabase
        .from("perfiles")
        .select("rol")
        .eq("id", session.user.id)
        .single();
      if (!perfil || perfil.rol !== "propietario") {
        router.push("/dashboard");
        return;
      }

      const { data: props } = await supabase
        .from("propiedades")
        .select("*, vinculaciones(*)")
        .order("created_at", { ascending: false });

      const todas = (props || []).flatMap((p) =>
        (p.vinculaciones || []).map((v) => ({
          ...v,
          propiedad: { nombre: p.nombre, direccion: p.direccion, monto_mensual: p.monto_mensual },
        }))
      );

      const ids = [...new Set(todas.map((v) => v.inquilino_id))];
      let inquilinosPorId = {};
      let pagosPorInquilino = {};
      if (ids.length > 0) {
        const { data: perfiles } = await supabase
          .from("perfiles")
          .select("id, nombre, telefono, created_at")
          .in("id", ids);
        (perfiles || []).forEach((p) => { inquilinosPorId[p.id] = p; });

        const { data: pagosData } = await supabase
          .from("pagos")
          .select("*")
          .in("user_id", ids);
        (pagosData || []).forEach((p) => {
          if (!pagosPorInquilino[p.user_id]) pagosPorInquilino[p.user_id] = [];
          pagosPorInquilino[p.user_id].push(p);
        });
      }

      const enriquecidas = todas.map((v) => {
        const inquilino = inquilinosPorId[v.inquilino_id] || null;
        const pagosDeEste = pagosPorInquilino[v.inquilino_id] || [];
        return {
          ...v,
          inquilino,
          scoring: calcularScore({ perfil: inquilino, pagos: pagosDeEste }),
        };
      });

      setFilas(enriquecidas);
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

  const activos = filas.filter((v) => v.estado === "activo").length;

  return (
    <div className="min-h-screen bg-surface-muted pb-24">
      <div className="max-w-[480px] mx-auto px-5">
        <header className="pt-6 pb-4">
          <h1 className="text-2xl font-bold text-fg">Inquilinos</h1>
          <p className="text-sm text-fg-muted mt-1">
            {filas.length} {filas.length === 1 ? "vinculación" : "vinculaciones"} · {activos} {activos === 1 ? "activa" : "activas"}
          </p>
        </header>

        {filas.length === 0 ? (
          <div className="bg-surface rounded-card shadow-card p-10 text-center">
            <div className="w-14 h-14 bg-brand-50 rounded-pill flex items-center justify-center mx-auto">
              <UserX size={24} className="text-brand-300" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-semibold text-fg mt-4">
              Aún no tienes inquilinos vinculados
            </p>
            <p className="text-xs text-fg-muted mt-1 max-w-[260px] mx-auto leading-relaxed">
              Comparte el código de invitación de tu propiedad para que un inquilino se vincule.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filas.map((v) => (
              <InquilinoCard
                key={v.id}
                vinculacion={v}
                abierto={expandido === v.id}
                onToggle={() => setExpandido(expandido === v.id ? null : v.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InquilinoCard({ vinculacion, abierto, onToggle }) {
  const { inquilino, propiedad, estado, inquilino_id, created_at, scoring } = vinculacion;
  const nombre = inquilino?.nombre || `Inquilino ${inquilino_id.substring(0, 6)}…`;
  const inicial = (nombre[0] || "I").toUpperCase();
  const tel = inquilino?.telefono;

  const statusStyles = {
    activo: "bg-success-100 text-success-600",
    pendiente: "bg-warning-100 text-warning-700",
    inactivo: "bg-surface-subtle text-fg-muted",
  }[estado] || "bg-surface-subtle text-fg-muted";

  const score = scoring?.score ?? 0;
  const modo = scoring?.modo ?? "En construcción";
  const modoTone = toneDeModo(modo);
  const modoStyles = {
    brand: "bg-brand-100 text-brand-800",
    success: "bg-success-100 text-success-600",
    warning: "bg-warning-100 text-warning-700",
    neutral: "bg-surface-subtle text-fg-muted",
  }[modoTone];

  const waHref = tel
    ? `https://wa.me/${tel.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hola ${inquilino?.nombre || ""}, soy tu propietario vía Rentto.`
      )}`
    : null;

  const fechaVinculo = created_at
    ? new Date(created_at).toLocaleDateString("es-VE", { day: "numeric", month: "long", year: "numeric" })
    : "—";

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
              <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-pill flex-shrink-0 ${statusStyles}`}>
                {estado}
              </span>
            </div>
            <p className="inline-flex items-center gap-1 text-xs text-fg-muted mt-1">
              <Home size={12} strokeWidth={2} className="text-fg-subtle" />
              {propiedad?.nombre || "—"}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-pill ${modoStyles}`}>
                {modo}
              </span>
              <span className="text-[10px] font-semibold text-fg-muted">Score {score}/100</span>
            </div>
          </div>
          <div className="flex-shrink-0 self-center text-fg-subtle">
            {abierto ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
      </button>

      {abierto && (
        <div className="px-4 pb-4 border-t border-stroke pt-3 space-y-2.5">
          <DetailRow
            icon={<Home size={14} strokeWidth={2} />}
            label="Dirección"
            value={propiedad?.direccion || "—"}
          />
          <DetailRow
            icon={<FileText size={14} strokeWidth={2} />}
            label="Renta"
            value={propiedad?.monto_mensual ? `$${propiedad.monto_mensual} / mes` : "—"}
          />
          <DetailRow
            icon={<Calendar size={14} strokeWidth={2} />}
            label="Vinculado desde"
            value={fechaVinculo}
          />
          <DetailRow
            icon={<Phone size={14} strokeWidth={2} />}
            label="Teléfono"
            value={tel || "No registrado"}
          />

          <div className="flex gap-2 pt-1">
            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-brand-800 text-fg-inverse rounded-pill text-xs font-semibold shadow-card hover:bg-brand-900 transition"
              >
                <MessageCircle size={14} strokeWidth={2.5} />
                WhatsApp
              </a>
            ) : (
              <span className="flex-1 inline-flex items-center justify-center py-2.5 bg-surface-subtle text-fg-subtle rounded-pill text-xs font-semibold cursor-not-allowed">
                Sin teléfono
              </span>
            )}
            <a
              href="/recibos"
              className="flex-1 inline-flex items-center justify-center py-2.5 border border-stroke text-fg-muted rounded-pill text-xs font-semibold hover:bg-surface-subtle transition"
            >
              Ver pagos
            </a>
          </div>
        </div>
      )}
    </article>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
        <span className="text-fg-subtle">{icon}</span>
        {label}
      </span>
      <span className="text-xs font-medium text-fg text-right truncate">{value}</span>
    </div>
  );
}

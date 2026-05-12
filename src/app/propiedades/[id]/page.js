"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import {
  ArrowLeft,
  Heart,
  Share2,
  MapPin,
  Shield,
  ShieldCheck,
  ShieldPlus,
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
  Calendar,
  Building2,
} from "lucide-react";
import { getModo, toneDeModo } from "../../lib/modos";
import { calcularScore } from "../../lib/scoring";
import PhotoCarousel from "../PhotoCarousel";

const STORAGE_KEY = "rentto_favoritos";

export default function PropiedadDetalle() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [cargando, setCargando] = useState(true);
  const [prop, setProp] = useState(null);
  const [host, setHost] = useState(null);
  const [hostVerificado, setHostVerificado] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [esInquilino, setEsInquilino] = useState(true);
  const [fav, setFav] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      setFav(saved.includes(id));
    } catch {}
  }, [id]);

  useEffect(() => {
    if (!id) return;
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const { data: propData } = await supabase
        .from("propiedades")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!propData) {
        setProp(null);
        setCargando(false);
        return;
      }
      setProp(propData);

      // Host info (perfil + verificación)
      if (propData.user_id) {
        const [{ data: hostPerfil }, { data: hostVerif }] = await Promise.all([
          supabase
            .from("perfiles")
            .select("id, nombre, telefono, created_at")
            .eq("id", propData.user_id)
            .maybeSingle(),
          supabase
            .from("verificaciones")
            .select("estado")
            .eq("user_id", propData.user_id)
            .maybeSingle(),
        ]);
        setHost(hostPerfil);
        setHostVerificado(hostVerif?.estado === "aprobada");
      }

      // Score del usuario actual
      const { data: perfil } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      setEsInquilino(perfil?.rol !== "propietario");

      if (perfil?.rol !== "propietario") {
        const { data: pagosData } = await supabase
          .from("pagos")
          .select("*")
          .eq("user_id", session.user.id);
        const { data: verif } = await supabase
          .from("verificaciones")
          .select("estado")
          .eq("user_id", session.user.id)
          .maybeSingle();
        const { score } = calcularScore({
          perfil,
          user: { email: session.user.email, created_at: session.user.created_at },
          pagos: pagosData || [],
          verificacion: verif,
        });
        setMyScore(score);
      }

      setCargando(false);
    }
    cargar();
  }, [id]);

  function toggleFav() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const set = new Set(saved);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
      setFav(set.has(id));
    } catch {}
  }

  async function compartir() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: prop?.nombre || "Propiedad Rentto",
          text: `${prop?.nombre} · $${prop?.monto_mensual}/mes`,
          url,
        });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert("Link copiado");
      } catch {}
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-fg-subtle text-sm">Cargando…</p>
      </div>
    );
  }

  if (!prop) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-5">
        <div className="text-center">
          <Building2 size={32} className="text-fg-subtle mx-auto" strokeWidth={1.5} />
          <p className="text-sm text-fg-muted mt-3">Propiedad no encontrada</p>
          <Link
            href="/propiedades"
            className="inline-flex items-center gap-1 text-sm text-brand-700 font-semibold mt-4 hover:underline"
          >
            <ArrowLeft size={14} strokeWidth={2.25} /> Explorar otras
          </Link>
        </div>
      </div>
    );
  }

  const modo = getModo(prop.modo);
  const requerido = modo.scoreMinimo;
  const calificas = esInquilino ? myScore >= requerido : null;

  const waHref = host?.telefono
    ? `https://wa.me/${host.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hola, vi ${prop.nombre} en Rentto y me interesa.`
      )}`
    : null;

  return (
    <div className="min-h-screen bg-surface pb-32">
      <div className="max-w-[480px] mx-auto">
        {/* Top bar over hero */}
        <div className="relative">
          <PhotoCarousel
            fotos={prop.fotos}
            alt={prop.nombre}
            aspect="aspect-square"
            rounded="rounded-none"
          />
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <button
              onClick={() => router.back()}
              aria-label="Volver"
              className="w-9 h-9 bg-white rounded-pill flex items-center justify-center shadow-card hover:bg-surface-subtle transition"
            >
              <ArrowLeft size={16} strokeWidth={2.5} />
            </button>
            <div className="flex gap-2">
              <button
                onClick={compartir}
                aria-label="Compartir"
                className="w-9 h-9 bg-white rounded-pill flex items-center justify-center shadow-card hover:bg-surface-subtle transition"
              >
                <Share2 size={16} strokeWidth={2.25} />
              </button>
              <button
                onClick={toggleFav}
                aria-label={fav ? "Quitar de favoritos" : "Guardar"}
                className="w-9 h-9 bg-white rounded-pill flex items-center justify-center shadow-card hover:bg-surface-subtle transition"
              >
                <Heart
                  size={16}
                  strokeWidth={2.25}
                  className={fav ? "text-danger-600 fill-danger-600" : "text-fg"}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 pt-5">
          {/* Title */}
          <h1 className="text-2xl font-bold text-fg">{prop.nombre}</h1>
          <p className="text-sm text-fg-muted mt-1 inline-flex items-center gap-1">
            <MapPin size={12} strokeWidth={2} className="text-fg-subtle" />
            {prop.direccion}
          </p>

          {/* Price + modo */}
          <div className="flex items-baseline gap-2 mt-4">
            <p className="text-3xl font-bold text-fg">${prop.monto_mensual}</p>
            <p className="text-sm text-fg-muted">/ mes</p>
          </div>

          {/* Modo banner */}
          <div className="mt-4">
            <ModoBanner modo={modo} />
          </div>

          {/* Score check (solo inquilinos) */}
          {esInquilino && (
            <div className="mt-3">
              <ScoreCheck calificas={calificas} myScore={myScore} requerido={requerido} modo={modo} />
            </div>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <Meta
              Icon={Calendar}
              label="Día de corte"
              value={`Día ${prop.dia_corte}`}
            />
            {prop.clausula_ajuste && (
              <Meta
                label="Ajuste"
                value={prop.clausula_ajuste}
              />
            )}
          </div>

          {/* Descripción */}
          {prop.descripcion && (
            <section className="mt-7 pt-6 border-t border-stroke">
              <h2 className="text-sm font-bold text-fg mb-2">Descripción</h2>
              <p className="text-sm text-fg-muted leading-relaxed whitespace-pre-line">
                {prop.descripcion}
              </p>
            </section>
          )}

          {/* Requisitos */}
          {prop.requisitos && (
            <section className="mt-6">
              <h2 className="text-sm font-bold text-fg mb-2">Requisitos</h2>
              <div className="bg-warning-100 rounded-card p-3">
                <p className="text-sm text-warning-700 leading-relaxed whitespace-pre-line">
                  {prop.requisitos}
                </p>
              </div>
            </section>
          )}

          {/* Host */}
          {host && (
            <section className="mt-7 pt-6 border-t border-stroke">
              <h2 className="text-sm font-bold text-fg mb-3">Propietario</h2>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-brand-100 text-brand-800 rounded-pill flex items-center justify-center font-bold text-base flex-shrink-0">
                  {host.nombre ? host.nombre[0].toUpperCase() : "P"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-fg truncate">
                      {host.nombre || "Propietario"}
                    </p>
                    {hostVerificado && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-success-100 text-success-600 px-2 py-0.5 rounded-pill">
                        <ShieldCheck size={10} strokeWidth={2.5} />
                        Verificado
                      </span>
                    )}
                  </div>
                  {host.created_at && (
                    <p className="text-xs text-fg-muted mt-0.5">
                      Miembro desde {new Date(host.created_at).toLocaleDateString("es-VE", { month: "long", year: "numeric" })}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Bottom sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-stroke z-30">
        <div className="max-w-[480px] mx-auto px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <p className="text-base font-bold text-fg leading-none">${prop.monto_mensual}</p>
              <p className="text-[10px] text-fg-muted">/ mes</p>
            </div>
            <div className="flex-1 flex gap-2">
              {waHref && (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-11 h-11 border border-stroke rounded-pill text-fg hover:bg-surface-subtle transition"
                  aria-label="WhatsApp"
                >
                  <MessageCircle size={16} strokeWidth={2.25} />
                </a>
              )}
              {esInquilino ? (
                <Link
                  href={
                    calificas && prop.codigo_invitacion
                      ? `/vincular?codigo=${prop.codigo_invitacion}`
                      : "/vincular"
                  }
                  className={`flex-1 inline-flex items-center justify-center py-3 rounded-pill text-sm font-bold shadow-card transition ${
                    calificas
                      ? "bg-brand-800 text-fg-inverse hover:bg-brand-900"
                      : "bg-surface-subtle text-fg-muted cursor-not-allowed pointer-events-none"
                  }`}
                  aria-disabled={!calificas}
                >
                  {calificas ? "Vincular" : `Te faltan ${requerido - myScore} pts`}
                </Link>
              ) : (
                <span className="flex-1 inline-flex items-center justify-center py-3 rounded-pill text-sm font-semibold bg-surface-subtle text-fg-muted">
                  Solo inquilinos
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================

function Meta({ Icon, label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-fg-subtle font-semibold inline-flex items-center gap-1">
        {Icon && <Icon size={10} strokeWidth={2} />}
        {label}
      </p>
      <p className="text-sm font-semibold text-fg mt-0.5">{value}</p>
    </div>
  );
}

function ModoBanner({ modo }) {
  const tone = toneDeModo(modo.id);
  const Icon = modo.id === "premium" ? ShieldPlus : modo.id === "protegido" ? ShieldCheck : Shield;
  const styles = {
    brand: "bg-brand-800 text-fg-inverse",
    success: "bg-success-600 text-fg-inverse",
    warning: "bg-warning-600 text-fg-inverse",
  }[tone] || "bg-fg text-fg-inverse";

  return (
    <div className={`${styles} rounded-card p-3 flex items-center gap-3`}>
      <div className="w-9 h-9 bg-white/20 rounded-pill flex items-center justify-center flex-shrink-0">
        <Icon size={16} strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold">Rentto {modo.label}</p>
        <p className="text-[11px] opacity-90">{modo.descripcion}</p>
      </div>
    </div>
  );
}

function ScoreCheck({ calificas, myScore, requerido, modo }) {
  if (calificas) {
    return (
      <div className="inline-flex items-center gap-2 bg-success-100 text-success-600 rounded-card px-3 py-2 text-xs font-semibold">
        <CheckCircle2 size={14} strokeWidth={2.25} />
        Calificas para modo {modo.label} · Score {myScore}
      </div>
    );
  }
  const faltan = requerido - myScore;
  return (
    <div className="inline-flex items-center gap-2 bg-warning-100 text-warning-700 rounded-card px-3 py-2 text-xs font-semibold">
      <AlertTriangle size={14} strokeWidth={2.25} />
      Te faltan {faltan} pts · Necesitás {requerido}
    </div>
  );
}

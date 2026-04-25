"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { Search, Building2, X, MessageCircle, Shield, ShieldCheck, ShieldPlus, CheckCircle2, AlertTriangle } from "lucide-react";
import { getModo, toneDeModo } from "../lib/modos";
import { calcularScore } from "../lib/scoring";

export default function Propiedades() {
  const router = useRouter();
  const [propiedades, setPropiedades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const [myScore, setMyScore] = useState(0);
  const [esInquilino, setEsInquilino] = useState(true);

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const [propsRes, perfilRes, pagosRes] = await Promise.all([
        supabase.from("propiedades").select("*").order("created_at", { ascending: false }),
        supabase.from("perfiles").select("*").eq("id", session.user.id).single(),
        supabase.from("pagos").select("*").eq("user_id", session.user.id),
      ]);

      setPropiedades(propsRes.data || []);

      const perfil = perfilRes.data;
      setEsInquilino(perfil?.rol !== "propietario");

      // Score solo importa para inquilinos buscando casa
      if (perfil?.rol !== "propietario") {
        const { score } = calcularScore({
          perfil,
          user: { email: session.user.email, created_at: session.user.created_at },
          pagos: pagosRes.data || [],
        });
        setMyScore(score);
      }

      setCargando(false);
    }
    cargar();
  }, []);

  if (cargando) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center">
        <p className="text-fg-subtle text-sm">Cargando propiedades…</p>
      </div>
    );
  }

  const propiedadesFiltradas = propiedades.filter((prop) => {
    const coincideBusqueda =
      prop.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      prop.direccion.toLowerCase().includes(busqueda.toLowerCase());

    if (filtro === "todas") return coincideBusqueda;
    if (filtro === "economica") return coincideBusqueda && prop.monto_mensual <= 100;
    if (filtro === "media") return coincideBusqueda && prop.monto_mensual > 100 && prop.monto_mensual <= 300;
    if (filtro === "premium") return coincideBusqueda && prop.monto_mensual > 300;
    return coincideBusqueda;
  });

  const filtros = [
    { id: "todas", label: "Todas" },
    { id: "economica", label: "Hasta $100" },
    { id: "media", label: "$100 – $300" },
    { id: "premium", label: "Más de $300" },
  ];

  return (
    <div className="min-h-screen bg-surface-muted pb-24">
      <div className="max-w-[480px] mx-auto px-5">
        <header className="pt-6 pb-4">
          <h1 className="text-2xl font-bold text-fg">Explorar</h1>
          <p className="text-sm text-fg-muted mt-1">
            {propiedades.length} {propiedades.length === 1 ? "propiedad disponible" : "propiedades disponibles"} en Venezuela
          </p>
        </header>

        <div className="relative">
          <Search
            size={18}
            strokeWidth={2}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none"
          />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o dirección…"
            className="w-full rounded-xl border border-stroke bg-surface pl-11 pr-4 py-3.5 text-base placeholder:text-fg-subtle focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200 transition"
          />
        </div>

        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {filtros.map((f) => {
            const active = filtro === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className={`px-4 py-2 rounded-pill text-xs font-semibold whitespace-nowrap transition ${
                  active
                    ? "bg-brand-800 text-fg-inverse shadow-card"
                    : "bg-surface border border-stroke text-fg-muted hover:border-brand-300"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-4 mt-5">
          {propiedadesFiltradas.length === 0 ? (
            <div className="bg-surface rounded-card shadow-card p-10 text-center">
              <Building2 size={32} className="text-brand-300 mx-auto" strokeWidth={1.5} />
              <p className="text-sm text-fg-muted mt-3">No se encontraron propiedades</p>
            </div>
          ) : (
            propiedadesFiltradas.map((prop) => (
              <PropiedadCard
                key={prop.id}
                prop={prop}
                onPhotoClick={setFotoAmpliada}
                myScore={myScore}
                esInquilino={esInquilino}
              />
            ))
          )}
        </div>
      </div>

      {fotoAmpliada && (
        <div
          onClick={() => setFotoAmpliada(null)}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 cursor-zoom-out"
        >
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <img src={fotoAmpliada} alt="Foto ampliada" className="w-full rounded-2xl shadow-pop" />
            <button
              onClick={() => setFotoAmpliada(null)}
              aria-label="Cerrar"
              className="absolute top-3 right-3 w-9 h-9 bg-black/60 text-white rounded-pill flex items-center justify-center hover:bg-black/80 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ModoBadge({ modoId }) {
  const modo = getModo(modoId);
  const tone = toneDeModo(modo.id);
  const Icon = modo.id === "premium" ? ShieldPlus : modo.id === "protegido" ? ShieldCheck : Shield;
  const styles = {
    brand: "bg-brand-100 text-brand-800",
    success: "bg-success-100 text-success-600",
    warning: "bg-warning-100 text-warning-700",
  }[tone] || "bg-surface-subtle text-fg-muted";

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-pill w-fit ${styles}`}>
      <Icon size={11} strokeWidth={2.5} />
      Rentto {modo.label}
      {modo.coberturaMeses > 0 && (
        <span className="opacity-80 font-semibold">· Cubre {modo.coberturaMeses}m</span>
      )}
    </span>
  );
}

function ScoreCheck({ prop, myScore }) {
  const modo = getModo(prop.modo);
  const requerido = modo.scoreMinimo;
  const calificas = myScore >= requerido;

  if (calificas) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-success-100 text-success-600 px-2 py-1 rounded-pill w-fit">
        <CheckCircle2 size={11} strokeWidth={2.5} />
        Calificas (score {myScore})
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-warning-100 text-warning-700 px-2 py-1 rounded-pill w-fit">
      <AlertTriangle size={11} strokeWidth={2.5} />
      Te faltan {requerido - myScore} pts (necesitas {requerido})
    </span>
  );
}

function PropiedadCard({ prop, onPhotoClick, myScore, esInquilino }) {
  const waHref = `https://wa.me/${prop.telefono || ""}?text=${encodeURIComponent(
    `Hola, vi tu propiedad ${prop.nombre} en Rentto y me interesa.`
  )}`;

  return (
    <article className="bg-surface rounded-card shadow-card overflow-hidden">
      {prop.fotos && prop.fotos.length > 0 ? (
        <img
          src={prop.fotos[0]}
          alt={prop.nombre}
          className="w-full h-44 object-cover cursor-zoom-in"
          onClick={() => onPhotoClick(prop.fotos[0])}
        />
      ) : (
        <div className="w-full h-44 bg-brand-50 flex items-center justify-center">
          <Building2 className="text-brand-300" size={48} strokeWidth={1.5} />
        </div>
      )}

      <div className="p-4 space-y-3">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-fg truncate">{prop.nombre}</h3>
            <p className="text-xs text-fg-muted mt-0.5 truncate">{prop.direccion}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-brand-700 leading-none">${prop.monto_mensual}</p>
            <p className="text-[10px] text-fg-subtle mt-0.5">/ mes</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <ModoBadge modoId={prop.modo} />
          {esInquilino && <ScoreCheck prop={prop} myScore={myScore} />}
        </div>

        <div className="flex gap-2 flex-wrap">
          <span className="inline-flex items-center text-[11px] bg-brand-50 text-brand-700 px-2.5 py-1 rounded-pill font-semibold">
            Corte día {prop.dia_corte}
          </span>
          {prop.clausula_ajuste && (
            <span className="inline-flex items-center text-[11px] bg-brand-50 text-brand-700 px-2.5 py-1 rounded-pill font-semibold">
              {prop.clausula_ajuste}
            </span>
          )}
        </div>

        {prop.descripcion && (
          <p className="text-xs text-fg-muted leading-relaxed">{prop.descripcion}</p>
        )}

        {prop.requisitos && (
          <div className="bg-warning-100 rounded-lg p-3">
            <p className="text-[10px] font-semibold text-warning-700 uppercase tracking-wide">
              Requisitos
            </p>
            <p className="text-xs text-warning-700 mt-1 leading-relaxed">{prop.requisitos}</p>
          </div>
        )}

        {prop.fotos && prop.fotos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {prop.fotos.map((foto, i) => (
              <img
                key={i}
                src={foto}
                alt=""
                className="w-20 h-20 object-cover rounded-lg flex-shrink-0 cursor-zoom-in"
                onClick={() => onPhotoClick(foto)}
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 pt-3 border-t border-stroke">
          <div className="w-7 h-7 bg-brand-100 rounded-pill flex items-center justify-center text-xs font-bold text-brand-800">
            {prop.propietario_nombre ? prop.propietario_nombre[0].toUpperCase() : "P"}
          </div>
          <span className="text-xs text-fg-muted">{prop.propietario_nombre}</span>
        </div>

        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 bg-brand-800 text-fg-inverse rounded-pill text-xs font-semibold shadow-card hover:bg-brand-900 transition"
        >
          <MessageCircle size={14} strokeWidth={2.5} />
          Contactar por WhatsApp
        </a>
      </div>
    </article>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import {
  Search,
  Heart,
  MapPin,
  Shield,
  ShieldCheck,
  ShieldPlus,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { getModo, toneDeModo } from "../lib/modos";
import { calcularScore } from "../lib/scoring";
import PhotoCarousel from "./PhotoCarousel";

const FILTROS = [
  { id: "todas", label: "Todas" },
  { id: "economica", label: "Hasta $100" },
  { id: "media", label: "$100–300" },
  { id: "premium", label: "Más de $300" },
];

const STORAGE_KEY = "rentto_favoritos";

export default function Propiedades() {
  const router = useRouter();
  const [propiedades, setPropiedades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [myScore, setMyScore] = useState(0);
  const [esInquilino, setEsInquilino] = useState(true);
  const [favoritos, setFavoritos] = useState(new Set());

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      setFavoritos(new Set(saved));
    } catch {}
  }, []);

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const [propsRes, perfilRes, pagosRes] = await Promise.all([
        supabase
          .from("propiedades")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("perfiles")
          .select("*")
          .eq("id", session.user.id)
          .single(),
        supabase
          .from("pagos")
          .select("*")
          .eq("user_id", session.user.id),
      ]);

      setPropiedades(propsRes.data || []);
      const perfil = perfilRes.data;
      setEsInquilino(perfil?.rol !== "propietario");

      if (perfil?.rol !== "propietario") {
        const { data: verif } = await supabase
          .from("verificaciones")
          .select("estado")
          .eq("user_id", session.user.id)
          .maybeSingle();
        const { score } = calcularScore({
          perfil,
          user: { email: session.user.email, created_at: session.user.created_at },
          pagos: pagosRes.data || [],
          verificacion: verif,
        });
        setMyScore(score);
      }

      setCargando(false);
    }
    cargar();
  }, []);

  function toggleFavorito(id, e) {
    e.preventDefault();
    e.stopPropagation();
    const next = new Set(favoritos);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFavoritos(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-fg-subtle text-sm">Cargando…</p>
      </div>
    );
  }

  const propsFiltradas = propiedades.filter((p) => {
    const q = busqueda.toLowerCase();
    const matchBusq =
      !q ||
      p.nombre?.toLowerCase().includes(q) ||
      p.direccion?.toLowerCase().includes(q);
    if (!matchBusq) return false;
    if (filtro === "economica") return p.monto_mensual <= 100;
    if (filtro === "media") return p.monto_mensual > 100 && p.monto_mensual <= 300;
    if (filtro === "premium") return p.monto_mensual > 300;
    return true;
  });

  return (
    <div className="min-h-screen bg-surface pb-24">
      <div className="max-w-[480px] mx-auto px-5">
        <header className="pt-6 pb-3">
          <h1 className="text-2xl font-bold text-fg">Explorar</h1>
          <p className="text-sm text-fg-muted mt-1">
            {propiedades.length} {propiedades.length === 1 ? "propiedad" : "propiedades"}
          </p>
        </header>

        <div className="relative">
          <Search
            size={16}
            strokeWidth={2}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none"
          />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por zona…"
            className="w-full rounded-pill border border-stroke bg-surface pl-10 pr-4 py-3 text-sm placeholder:text-fg-subtle focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200 transition"
          />
        </div>

        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-5 px-5">
          {FILTROS.map((f) => {
            const active = filtro === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className={`px-3.5 py-1.5 rounded-pill text-xs font-semibold whitespace-nowrap transition ${
                  active
                    ? "bg-fg text-fg-inverse"
                    : "bg-surface border border-stroke text-fg-muted hover:border-fg-muted"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-6 mt-5">
          {propsFiltradas.length === 0 ? (
            <p className="text-sm text-fg-muted text-center py-10">
              Nada por aquí. Probá otro filtro.
            </p>
          ) : (
            propsFiltradas.map((prop) => (
              <PropiedadCard
                key={prop.id}
                prop={prop}
                fav={favoritos.has(prop.id)}
                onToggleFav={(e) => toggleFavorito(prop.id, e)}
                myScore={myScore}
                esInquilino={esInquilino}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================

function PropiedadCard({ prop, fav, onToggleFav, myScore, esInquilino }) {
  const modo = getModo(prop.modo);
  const calificas = esInquilino ? myScore >= modo.scoreMinimo : null;

  return (
    <Link
      href={`/propiedades/${prop.id}`}
      className="block group"
    >
      <div className="relative">
        <PhotoCarousel
          fotos={prop.fotos}
          alt={prop.nombre}
          aspect="aspect-[4/3]"
          rounded="rounded-2xl"
        />
        <button
          type="button"
          onClick={onToggleFav}
          aria-label={fav ? "Quitar de favoritos" : "Agregar a favoritos"}
          className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center group/heart"
        >
          <Heart
            size={26}
            strokeWidth={2}
            className={
              fav
                ? "text-danger-600 fill-danger-600 drop-shadow-md"
                : "text-white fill-black/30 group-hover/heart:scale-110 transition drop-shadow-md"
            }
          />
        </button>
        {esInquilino && (
          <div className="absolute bottom-3 left-3">
            <ModoChip modo={modo} compact />
          </div>
        )}
      </div>

      <div className="mt-3 px-0.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-fg truncate group-hover:underline">
              {prop.nombre}
            </p>
            <p className="text-sm text-fg-muted truncate inline-flex items-center gap-1 mt-0.5">
              <MapPin size={11} strokeWidth={2} className="text-fg-subtle flex-shrink-0" />
              {prop.direccion}
            </p>
          </div>
          {esInquilino && (
            <CalificaDot calificas={calificas} />
          )}
        </div>

        <p className="text-[15px] text-fg mt-1">
          <span className="font-bold">${prop.monto_mensual}</span>
          <span className="text-fg-muted"> /mes</span>
        </p>
      </div>
    </Link>
  );
}

function ModoChip({ modo, compact = false }) {
  const tone = toneDeModo(modo.id);
  const Icon = modo.id === "premium" ? ShieldPlus : modo.id === "protegido" ? ShieldCheck : Shield;
  const styles = {
    brand: "bg-brand-800 text-fg-inverse",
    success: "bg-success-600 text-fg-inverse",
    warning: "bg-warning-600 text-fg-inverse",
  }[tone] || "bg-fg text-fg-inverse";

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-pill shadow-card ${styles}`}>
      <Icon size={10} strokeWidth={2.5} />
      {compact ? modo.label : `Rentto ${modo.label}`}
    </span>
  );
}

function CalificaDot({ calificas }) {
  if (calificas === null) return null;
  return (
    <span
      title={calificas ? "Calificas" : "No calificas todavía"}
      className={`flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-bold ${
        calificas ? "text-success-600" : "text-warning-700"
      }`}
    >
      {calificas ? <CheckCircle2 size={12} strokeWidth={2.5} /> : <AlertTriangle size={12} strokeWidth={2.5} />}
    </span>
  );
}

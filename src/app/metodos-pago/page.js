"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import {
  ArrowLeft,
  Smartphone,
  DollarSign,
  Landmark,
  CreditCard,
  Banknote,
  Check,
  X,
  Pencil,
  Plus,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import {
  METODOS,
  obtenerMisMetodosCobro,
  upsertMetodoCobro,
  toggleMetodoCobro,
  borrarMetodoCobro,
} from "../lib/metodosCobro";

const ICONOS = {
  Smartphone, DollarSign, Landmark, CreditCard, Banknote,
};

export default function MetodosCobro() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [rol, setRol] = useState(null);
  const [metodosGuardados, setMetodosGuardados] = useState([]);
  const [editando, setEditando] = useState(null); // tipo en edición
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    const { data: perfil } = await supabase
      .from("perfiles").select("rol").eq("id", session.user.id).single();
    setRol(perfil?.rol || "inquilino");

    if (perfil?.rol === "propietario") {
      const mios = await obtenerMisMetodosCobro();
      setMetodosGuardados(mios);
    }
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []);

  if (cargando) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center">
        <p className="text-fg-subtle text-sm">Cargando…</p>
      </div>
    );
  }

  // Vista para inquilino: informativa
  if (rol !== "propietario") {
    return (
      <div className="min-h-screen bg-surface-muted pb-24">
        <div className="max-w-[480px] mx-auto px-5">
          <Link href="/perfil" className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mt-5 mb-2 transition">
            <ArrowLeft size={14} strokeWidth={2.25} /> Volver al perfil
          </Link>
          <h1 className="text-2xl font-bold text-fg">Métodos aceptados</h1>
          <p className="text-sm text-fg-muted mt-1">
            Cinco rails. El propietario elige cuáles ofrece.
          </p>
          <div className="bg-surface rounded-card shadow-card mt-4 divide-y divide-stroke overflow-hidden">
            {METODOS.map((m) => {
              const Icon = ICONOS[m.icono];
              return (
                <div key={m.id} className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 bg-brand-50 rounded-pill flex items-center justify-center flex-shrink-0">
                    {Icon && <Icon size={18} className="text-brand-700" strokeWidth={2.25} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-fg truncate">{m.nombre}</p>
                    <p className="text-xs text-fg-muted truncate">{m.detalle}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Vista para propietario: CRUD
  const metodosPorTipo = Object.fromEntries(metodosGuardados.map((m) => [m.tipo, m]));

  async function guardar(tipo, datos) {
    setGuardando(true);
    try {
      await upsertMetodoCobro({ tipo, ...datos });
      await cargar();
      setEditando(null);
    } catch (e) {
      alert("Error al guardar: " + e.message);
    } finally {
      setGuardando(false);
    }
  }

  async function togglearActivo(metodo) {
    try {
      await toggleMetodoCobro(metodo.id, !metodo.activo);
      await cargar();
    } catch (e) {
      alert("Error: " + e.message);
    }
  }

  async function borrar(metodo) {
    if (!window.confirm(`¿Eliminar tu configuración de ${getMetodoNombre(metodo.tipo)}?`)) return;
    try {
      await borrarMetodoCobro(metodo.id);
      await cargar();
    } catch (e) {
      alert("Error: " + e.message);
    }
  }

  const configurados = metodosGuardados.length;
  const activos = metodosGuardados.filter((m) => m.activo).length;

  return (
    <div className="min-h-screen bg-surface-muted pb-24">
      <div className="max-w-[480px] mx-auto px-5">
        <Link href="/perfil" className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mt-5 mb-2 transition">
          <ArrowLeft size={14} strokeWidth={2.25} /> Volver al perfil
        </Link>

        <header className="pt-2 pb-2">
          <h1 className="text-2xl font-bold text-fg">Cómo cobrás</h1>
          <p className="text-sm text-fg-muted mt-1">
            {configurados === 0
              ? "Configurá los métodos por los que aceptás cobrar"
              : `${activos} de ${configurados} activos`}
          </p>
        </header>

        {configurados === 0 && (
          <div className="bg-warning-100 text-warning-700 rounded-card p-4 mb-4 flex items-start gap-3">
            <ShieldCheck size={18} strokeWidth={2.25} className="flex-shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <p className="font-semibold">Sin métodos configurados</p>
              <p className="opacity-90 mt-0.5">Tus inquilinos no pueden pagar hasta que cargues al menos uno. Empezá por el que más usás.</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {METODOS.map((meta) => {
            const Icon = ICONOS[meta.icono];
            const guardado = metodosPorTipo[meta.id];
            const enEdicion = editando === meta.id;

            if (enEdicion) {
              return (
                <FormMetodo
                  key={meta.id}
                  meta={meta}
                  Icon={Icon}
                  valoresIniciales={guardado || {}}
                  onSave={(datos) => guardar(meta.id, datos)}
                  onCancel={() => setEditando(null)}
                  guardando={guardando}
                />
              );
            }

            return (
              <CardMetodo
                key={meta.id}
                meta={meta}
                Icon={Icon}
                guardado={guardado}
                onEdit={() => setEditando(meta.id)}
                onToggle={() => togglearActivo(guardado)}
                onDelete={() => borrar(guardado)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================

function getMetodoNombre(tipo) {
  return METODOS.find((m) => m.id === tipo)?.nombre || tipo;
}

function CardMetodo({ meta, Icon, guardado, onEdit, onToggle, onDelete }) {
  const configurado = !!guardado;
  const activo = guardado?.activo;

  return (
    <article className={`bg-surface rounded-card shadow-card overflow-hidden ${!configurado ? "border border-dashed border-stroke" : ""}`}>
      <div className="flex items-center gap-3 p-4">
        <div className={`w-10 h-10 rounded-pill flex items-center justify-center flex-shrink-0 ${configurado ? "bg-brand-50" : "bg-surface-subtle"}`}>
          {Icon && <Icon size={18} className={configurado ? "text-brand-700" : "text-fg-subtle"} strokeWidth={2.25} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-fg truncate">{meta.nombre}</p>
          <p className="text-xs text-fg-muted truncate">
            {configurado ? resumirMetodo(guardado, meta) : meta.detalle}
          </p>
        </div>
        {configurado ? (
          <button
            onClick={onToggle}
            aria-pressed={activo}
            className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-pill transition ${
              activo
                ? "bg-success-100 text-success-600 hover:bg-success-100/80"
                : "bg-surface-subtle text-fg-subtle hover:bg-surface-muted"
            }`}
          >
            {activo ? "Activo" : "Pausado"}
          </button>
        ) : (
          <span className="text-[10px] text-fg-subtle">Sin configurar</span>
        )}
      </div>

      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={onEdit}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 border border-stroke text-fg-muted rounded-pill text-xs font-semibold hover:bg-surface-subtle transition"
        >
          {configurado ? <><Pencil size={12} strokeWidth={2.25} /> Editar</> : <><Plus size={12} strokeWidth={2.5} /> Configurar</>}
        </button>
        {configurado && (
          <button
            onClick={onDelete}
            aria-label="Eliminar"
            className="w-9 h-9 rounded-pill flex items-center justify-center text-danger-600 hover:bg-danger-100 transition"
          >
            <X size={14} strokeWidth={2.25} />
          </button>
        )}
      </div>
    </article>
  );
}

function resumirMetodo(g, meta) {
  // Devuelve un preview corto del método guardado.
  const parts = [];
  for (const c of meta.campos) {
    const v = g[c.key];
    if (!v || c.key === "nota") continue;
    parts.push(v);
  }
  return parts.join(" · ") || meta.detalle;
}

function FormMetodo({ meta, Icon, valoresIniciales, onSave, onCancel, guardando }) {
  const [valores, setValores] = useState(() => {
    const init = {};
    for (const c of meta.campos) init[c.key] = valoresIniciales[c.key] || "";
    init.activo = valoresIniciales.activo ?? true;
    return init;
  });

  const inputClass = "w-full px-3 py-2.5 border border-stroke bg-surface rounded-xl text-sm placeholder:text-fg-subtle focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200 transition";

  const requeridosFaltantes = meta.campos
    .filter((c) => c.required)
    .some((c) => !valores[c.key]?.trim());

  return (
    <article className="bg-surface rounded-card shadow-card overflow-hidden">
      <header className="flex items-center gap-3 p-4 border-b border-stroke">
        <div className="w-10 h-10 bg-brand-50 rounded-pill flex items-center justify-center flex-shrink-0">
          {Icon && <Icon size={18} className="text-brand-700" strokeWidth={2.25} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-fg">{meta.nombre}</p>
          <p className="text-xs text-fg-muted">{meta.detalle}</p>
        </div>
      </header>

      <div className="p-4 space-y-3">
        {meta.campos.map((c) => (
          <div key={c.key}>
            <label className="text-xs font-semibold text-fg-muted block mb-1.5">
              {c.label}
              {c.required && <span className="text-danger-600 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={valores[c.key] || ""}
              onChange={(e) => setValores({ ...valores, [c.key]: e.target.value })}
              placeholder={c.placeholder}
              className={inputClass}
            />
          </div>
        ))}

        <div className="flex items-center justify-between bg-surface-subtle rounded-xl p-3 mt-2">
          <div>
            <p className="text-xs font-semibold text-fg">¿Activo para los inquilinos?</p>
            <p className="text-[10px] text-fg-muted">Solo los activos aparecen en /pagar</p>
          </div>
          <button
            onClick={() => setValores({ ...valores, activo: !valores.activo })}
            aria-pressed={valores.activo}
            className={`inline-flex items-center text-[10px] font-bold px-2 py-1 rounded-pill transition ${
              valores.activo
                ? "bg-success-100 text-success-600"
                : "bg-surface text-fg-subtle border border-stroke"
            }`}
          >
            {valores.activo ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={onCancel}
          disabled={guardando}
          className="flex-1 py-2.5 border border-stroke text-fg-muted rounded-pill text-xs font-semibold hover:bg-surface-subtle transition disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          onClick={() => onSave(valores)}
          disabled={guardando || requeridosFaltantes}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-pill text-xs font-semibold transition ${
            !guardando && !requeridosFaltantes
              ? "bg-brand-800 text-fg-inverse hover:bg-brand-900 shadow-card"
              : "bg-surface-subtle text-fg-subtle cursor-not-allowed"
          }`}
        >
          {guardando ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={2.5} />}
          Guardar
        </button>
      </div>
    </article>
  );
}

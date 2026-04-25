"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import Link from "next/link";
import {
  Pencil,
  Check,
  X,
  Paperclip,
  Users,
  KeyRound,
  FileText,
  Receipt,
  AlertCircle,
  CalendarClock,
  ArrowRight,
  Shield,
  ShieldCheck,
  ShieldPlus,
} from "lucide-react";
import { MODOS_LISTA, getModo, toneDeModo as toneDeModoProp } from "../lib/modos";

export default function Propietario() {
  const router = useRouter();
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [propiedades, setPropiedades] = useState([]);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const [editando, setEditando] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editDireccion, setEditDireccion] = useState("");
  const [editMonto, setEditMonto] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");
  const [editRequisitos, setEditRequisitos] = useState("");
  const [editModo, setEditModo] = useState("basico");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", session.user.id).single();
      if (!perfil || perfil.rol !== "propietario") { router.push("/dashboard"); return; }

      // Propiedades del propietario actual
      const { data: propsData } = await supabase
        .from("propiedades")
        .select("*, vinculaciones(*)")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      setPropiedades(propsData || []);

      // Pagos filtrados a las propiedades del propietario
      const myPropIds = (propsData || []).map((p) => p.id);
      const { data: pagosData } = myPropIds.length > 0
        ? await supabase
            .from("pagos")
            .select("*")
            .in("propiedad_id", myPropIds)
            .order("fecha_pago", { ascending: false })
        : { data: [] };
      setPagos(pagosData || []);

      setCargando(false);
    }
    cargar();
  }, []);

  async function confirmarPago(pagoId) {
    const { error } = await supabase.from("pagos").update({ estado: "confirmado" }).eq("id", pagoId);
    if (!error) setPagos(pagos.map(p => p.id === pagoId ? { ...p, estado: "confirmado" } : p));
  }

  async function rechazarPago(pagoId) {
    const { error } = await supabase.from("pagos").update({ estado: "rechazado" }).eq("id", pagoId);
    if (!error) setPagos(pagos.map(p => p.id === pagoId ? { ...p, estado: "rechazado" } : p));
  }

  function iniciarEdicion(prop) {
    setEditando(prop.id);
    setEditNombre(prop.nombre);
    setEditDireccion(prop.direccion);
    setEditMonto(prop.monto_mensual);
    setEditDescripcion(prop.descripcion || "");
    setEditRequisitos(prop.requisitos || "");
    setEditModo(prop.modo || "basico");
  }

  async function guardarEdicion() {
    setGuardando(true);
    const { error } = await supabase.from("propiedades").update({
      nombre: editNombre,
      direccion: editDireccion,
      monto_mensual: Number(editMonto),
      descripcion: editDescripcion,
      requisitos: editRequisitos,
      modo: editModo,
    }).eq("id", editando);
    if (!error) {
      setPropiedades(propiedades.map(p => p.id === editando ? {
        ...p, nombre: editNombre, direccion: editDireccion, monto_mensual: Number(editMonto),
        descripcion: editDescripcion, requisitos: editRequisitos, modo: editModo,
      } : p));
      setEditando(null);
    }
    setGuardando(false);
  }

  async function quitarFoto(propId, fotoUrl) {
    if (!window.confirm("¿Quitar esta foto de la propiedad?")) return;
    const prop = propiedades.find((p) => p.id === propId);
    if (!prop) return;
    const nuevasFotos = (prop.fotos || []).filter((f) => f !== fotoUrl);
    const { error } = await supabase
      .from("propiedades")
      .update({ fotos: nuevasFotos })
      .eq("id", propId);
    if (error) {
      window.alert("Error al quitar la foto: " + error.message);
      return;
    }
    setPropiedades(propiedades.map((p) =>
      p.id === propId ? { ...p, fotos: nuevasFotos } : p
    ));
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center">
        <p className="text-fg-subtle text-sm">Cargando…</p>
      </div>
    );
  }

  const hoy = new Date();
  const mesActualPagos = pagos.filter((p) => {
    const f = new Date(p.fecha_pago);
    return f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear();
  });
  const cobradoMes = mesActualPagos
    .filter((p) => p.estado === "confirmado")
    .reduce((s, p) => s + Number(p.monto), 0);

  const propiedadesOcupadas = propiedades.filter((p) =>
    (p.vinculaciones || []).some((v) => v.estado === "activo")
  );
  const esperadoMes = propiedadesOcupadas.reduce((s, p) => s + Number(p.monto_mensual || 0), 0);
  const porcentaje = esperadoMes > 0 ? Math.min(100, (cobradoMes / esperadoMes) * 100) : 0;

  const pendientes = pagos.filter((p) => p.estado === "pendiente");
  const confirmados = pagos.filter((p) => p.estado === "confirmado");
  const rechazados = pagos.filter((p) => p.estado === "rechazado");

  const proximosCobros = calcularProximosCobros(propiedadesOcupadas, hoy);

  return (
    <div className="min-h-screen bg-surface-muted pb-24">
      <div className="max-w-[480px] mx-auto px-5">
        <header className="pt-6 pb-4">
          <h1 className="text-2xl font-bold text-fg">Panel del propietario</h1>
          <p className="text-sm text-fg-muted mt-1">
            {propiedadesOcupadas.length} de {propiedades.length} {propiedades.length === 1 ? "propiedad ocupada" : "propiedades ocupadas"}
          </p>
        </header>

        <section className="bg-brand-800 text-fg-inverse rounded-card p-5 shadow-elevated">
          <p className="text-xs opacity-80 uppercase tracking-wide">
            {hoy.toLocaleDateString("es-VE", { month: "long", year: "numeric" })}
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-3xl font-bold">${cobradoMes.toLocaleString("es-VE")}</p>
            <p className="text-sm opacity-70">/ ${esperadoMes.toLocaleString("es-VE")} esperado</p>
          </div>
          <div className="mt-3 h-2 w-full rounded-pill bg-white/15 overflow-hidden">
            <div
              className="h-full bg-white rounded-pill transition-all"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2 text-xs">
            <span className="opacity-70">
              {porcentaje.toFixed(0)}% cobrado
            </span>
            <span className="font-semibold">
              ${Math.max(0, esperadoMes - cobradoMes).toLocaleString("es-VE")} pendiente
            </span>
          </div>
        </section>

        {pendientes.length > 0 && (
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("pendientes");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="w-full text-left flex items-center gap-3 bg-warning-100 text-warning-700 rounded-card p-4 mt-4 shadow-card hover:brightness-95 transition"
          >
            <div className="w-10 h-10 bg-warning-100 border border-warning-600/30 rounded-pill flex items-center justify-center flex-shrink-0">
              <AlertCircle size={18} strokeWidth={2.25} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">
                {pendientes.length} {pendientes.length === 1 ? "pago por confirmar" : "pagos por confirmar"}
              </p>
              <p className="text-xs opacity-85">
                Revisa y acepta o rechaza cada transferencia
              </p>
            </div>
            <ArrowRight size={16} strokeWidth={2.5} className="flex-shrink-0" />
          </button>
        )}

        <section className="grid grid-cols-3 gap-2 mt-4">
          <QuickAction href="/inquilinos" Icon={Users} label="Inquilinos" />
          <QuickAction href="/contrato" Icon={FileText} label="Contratos" />
          <QuickAction href="/recibos" Icon={Receipt} label="Ingresos" />
        </section>

        {proximosCobros.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-fg mb-3">Próximos cobros</h2>
            <div className="flex flex-col gap-2">
              {proximosCobros.map((c) => (
                <article key={c.id} className="bg-surface rounded-card shadow-card p-3 flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-50 rounded-pill flex items-center justify-center flex-shrink-0">
                    <CalendarClock size={16} className="text-brand-700" strokeWidth={2.25} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-fg truncate">{c.nombre}</p>
                    <p className="text-xs text-fg-muted">
                      Vence en {c.diasRestantes} {c.diasRestantes === 1 ? "día" : "días"}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-brand-700 flex-shrink-0">${c.monto}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {propiedades.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-fg mb-3">Mis propiedades</h2>
            <div className="flex flex-col gap-3">
              {propiedades.map((prop) => (
                <article key={prop.id} className="bg-surface rounded-card shadow-card p-4">
                  {editando === prop.id ? (
                    <EditForm
                      editNombre={editNombre} setEditNombre={setEditNombre}
                      editDireccion={editDireccion} setEditDireccion={setEditDireccion}
                      editMonto={editMonto} setEditMonto={setEditMonto}
                      editDescripcion={editDescripcion} setEditDescripcion={setEditDescripcion}
                      editRequisitos={editRequisitos} setEditRequisitos={setEditRequisitos}
                      editModo={editModo} setEditModo={setEditModo}
                      guardando={guardando}
                      onSave={guardarEdicion}
                      onCancel={() => setEditando(null)}
                    />
                  ) : (
                    <PropiedadView
                      prop={prop}
                      onEdit={() => iniciarEdicion(prop)}
                      onPhotoClick={setFotoAmpliada}
                      onRemovePhoto={quitarFoto}
                    />
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {pendientes.length > 0 && (
          <section id="pendientes" className="mt-6 scroll-mt-20">
            <h2 className="text-sm font-semibold text-fg mb-3">
              Pagos pendientes de confirmar
            </h2>
            <div className="flex flex-col gap-3">
              {pendientes.map((pago) => (
                <PagoCard
                  key={pago.id}
                  pago={pago}
                  onConfirm={() => confirmarPago(pago.id)}
                  onReject={() => rechazarPago(pago.id)}
                />
              ))}
            </div>
          </section>
        )}

        {(confirmados.length > 0 || rechazados.length > 0) && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-fg mb-3">Historial</h2>
            <div className="flex flex-col gap-3">
              {[...confirmados, ...rechazados].slice(0, 10).map((pago) => (
                <PagoCard key={pago.id} pago={pago} onConfirm={() => {}} onReject={() => {}} />
              ))}
            </div>
          </section>
        )}
      </div>

      {fotoAmpliada && (
        <div onClick={() => setFotoAmpliada(null)} className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 cursor-zoom-out">
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

function calcularProximosCobros(propiedadesOcupadas, hoy) {
  return propiedadesOcupadas
    .map((p) => {
      const dia = p.dia_corte;
      if (!dia) return null;
      let proximo = new Date(hoy.getFullYear(), hoy.getMonth(), dia);
      if (proximo < hoy) {
        proximo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, dia);
      }
      const diasRestantes = Math.ceil((proximo - hoy) / (1000 * 60 * 60 * 24));
      return {
        id: p.id,
        nombre: p.nombre,
        monto: p.monto_mensual,
        diasRestantes,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.diasRestantes - b.diasRestantes)
    .slice(0, 3);
}

function QuickAction({ href, Icon, label }) {
  return (
    <Link
      href={href}
      className="bg-surface border border-stroke rounded-card p-3 flex flex-col items-center gap-1.5 hover:border-brand-300 hover:shadow-card transition"
    >
      <div className="w-10 h-10 bg-brand-50 rounded-pill flex items-center justify-center">
        <Icon size={18} className="text-brand-700" strokeWidth={2.25} />
      </div>
      <span className="text-[11px] font-semibold text-fg-muted">{label}</span>
    </Link>
  );
}

function PropiedadView({ prop, onEdit, onPhotoClick, onRemovePhoto }) {
  const modo = getModo(prop.modo);
  const modoTone = toneDeModoProp(modo.id);
  const ModoIcon = modo.id === "premium" ? ShieldPlus : modo.id === "protegido" ? ShieldCheck : Shield;
  const modoStyles = {
    brand: "bg-brand-100 text-brand-800",
    success: "bg-success-100 text-success-600",
    warning: "bg-warning-100 text-warning-700",
  }[modoTone] || "bg-surface-subtle text-fg-muted";

  return (
    <>
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg truncate">{prop.nombre}</p>
          <p className="text-xs text-fg-muted mt-0.5 truncate">{prop.direccion}</p>
        </div>
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-pill hover:bg-brand-100 transition"
        >
          <Pencil size={11} strokeWidth={2.5} /> Editar
        </button>
      </div>

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-pill ${modoStyles}`}>
          <ModoIcon size={10} strokeWidth={2.5} />
          {modo.label}
        </span>
        <span className="text-[10px] text-fg-muted">· {modo.slogan}</span>
      </div>

      <div className="flex justify-between items-center mt-3">
        <span className="text-sm font-bold text-brand-700">${prop.monto_mensual}/mes</span>
        <span className="inline-flex items-center text-[11px] bg-brand-50 text-brand-700 px-2.5 py-1 rounded-pill font-semibold">
          Corte día {prop.dia_corte}
        </span>
      </div>

      {prop.descripcion && (
        <p className="text-xs text-fg-muted mt-3 leading-relaxed">{prop.descripcion}</p>
      )}

      {prop.requisitos && (
        <div className="mt-3 p-3 bg-warning-100 rounded-lg">
          <p className="text-[10px] font-semibold text-warning-700 uppercase tracking-wide">Requisitos</p>
          <p className="text-xs text-warning-700 mt-1 leading-relaxed">{prop.requisitos}</p>
        </div>
      )}

      <div className="mt-3 p-3 bg-surface-subtle rounded-lg">
        <div className="flex items-center gap-1.5">
          <KeyRound size={12} className="text-fg-muted" strokeWidth={2} />
          <p className="text-[10px] font-semibold text-fg-muted uppercase tracking-wide">
            Código para tu inquilino
          </p>
        </div>
        <p className="text-lg font-bold text-brand-700 tracking-[0.2em] mt-1.5">
          {prop.codigo_invitacion}
        </p>
      </div>

      {prop.vinculaciones && prop.vinculaciones.length > 0 && (
        <div className="mt-3 p-3 bg-success-100 rounded-lg">
          <div className="flex items-center gap-1.5">
            <Users size={12} className="text-success-600" strokeWidth={2} />
            <p className="text-[10px] font-semibold text-success-600 uppercase tracking-wide">
              Inquilinos vinculados
            </p>
          </div>
          {prop.vinculaciones.map((v) => (
            <div key={v.id} className="flex items-center gap-2 mt-2">
              <div className="w-6 h-6 bg-success-100 border border-success-600/30 rounded-pill flex items-center justify-center text-[10px] font-bold text-success-600">
                I
              </div>
              <span className="text-xs font-medium text-success-600">
                {v.inquilino_id.substring(0, 8)}…
              </span>
              <span className="inline-flex items-center text-[10px] bg-success-100 text-success-600 px-2 py-0.5 rounded-pill font-semibold border border-success-600/20">
                {v.estado}
              </span>
            </div>
          ))}
        </div>
      )}

      {prop.fotos && prop.fotos.length > 0 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {prop.fotos.map((foto, i) => (
            <div key={i} className="relative flex-shrink-0 group">
              <img
                src={foto}
                alt=""
                className="w-16 h-16 object-cover rounded-lg cursor-zoom-in"
                onClick={() => onPhotoClick(foto)}
              />
              <button
                onClick={(e) => { e.stopPropagation(); onRemovePhoto(prop.id, foto); }}
                aria-label="Quitar foto"
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-danger-600 text-white rounded-pill flex items-center justify-center shadow-card hover:bg-danger-600/90 transition opacity-90"
              >
                <X size={10} strokeWidth={3} />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function EditForm({
  editNombre, setEditNombre,
  editDireccion, setEditDireccion,
  editMonto, setEditMonto,
  editDescripcion, setEditDescripcion,
  editRequisitos, setEditRequisitos,
  editModo, setEditModo,
  guardando, onSave, onCancel,
}) {
  const inputClass = "w-full px-3 py-2.5 border border-stroke bg-surface rounded-lg text-sm placeholder:text-fg-subtle focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200 transition";
  return (
    <div className="space-y-3">
      <input type="text" value={editNombre} onChange={(e) => setEditNombre(e.target.value)} placeholder="Nombre" className={inputClass} />
      <input type="text" value={editDireccion} onChange={(e) => setEditDireccion(e.target.value)} placeholder="Dirección" className={inputClass} />
      <input type="number" value={editMonto} onChange={(e) => setEditMonto(e.target.value)} placeholder="Monto mensual" className={inputClass} />
      <textarea value={editDescripcion} onChange={(e) => setEditDescripcion(e.target.value)} placeholder="Descripción" rows="2" className={`${inputClass} resize-none`} />
      <textarea value={editRequisitos} onChange={(e) => setEditRequisitos(e.target.value)} placeholder="Requisitos" rows="2" className={`${inputClass} resize-none`} />

      <div>
        <p className="text-[11px] font-semibold text-fg-muted mb-1.5">Modo de Rentto</p>
        <div className="grid grid-cols-3 gap-1.5">
          {MODOS_LISTA.map((m) => {
            const tone = toneDeModoProp(m.id);
            const selected = editModo === m.id;
            const selectedStyles = {
              brand: "bg-brand-100 text-brand-800 border-brand-700",
              success: "bg-success-100 text-success-600 border-success-600",
              warning: "bg-warning-100 text-warning-700 border-warning-600",
            }[tone];
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setEditModo(m.id)}
                className={`text-[11px] font-semibold py-2 rounded-lg border-2 transition ${
                  selected ? selectedStyles : "bg-surface border-stroke text-fg-muted hover:border-brand-300"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={guardando}
          className="flex-1 py-2.5 bg-brand-800 text-fg-inverse rounded-pill text-xs font-semibold shadow-card hover:bg-brand-900 transition disabled:opacity-60"
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 border border-stroke text-fg-muted rounded-pill text-xs font-semibold hover:bg-surface-subtle transition"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function PagoCard({ pago, onConfirm, onReject }) {
  const statusStyles = {
    confirmado: "bg-success-100 text-success-600",
    rechazado: "bg-danger-100 text-danger-600",
    pendiente: "bg-warning-100 text-warning-700",
  }[pago.estado] || "bg-surface-subtle text-fg-muted";

  const statusLabel = {
    confirmado: "Confirmado",
    rechazado: "Rechazado",
    pendiente: "Pendiente",
  }[pago.estado] || pago.estado;

  return (
    <div className="bg-surface rounded-card shadow-card p-4">
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg">
            ${pago.monto} · {pago.metodo}
          </p>
          <p className="text-xs text-fg-muted mt-0.5">
            {new Date(pago.fecha_pago).toLocaleDateString("es-VE", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </p>
          {pago.referencia && (
            <p className="text-xs text-fg-subtle mt-0.5">Ref: {pago.referencia}</p>
          )}
          {pago.notas && (
            <p className="text-xs text-brand-700 mt-0.5">{pago.notas}</p>
          )}
        </div>
        <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-1 rounded-pill flex-shrink-0 ${statusStyles}`}>
          {statusLabel}
        </span>
      </div>

      {pago.comprobante_url && (
        <a
          href={pago.comprobante_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-brand-700 font-semibold mt-3 hover:text-brand-800 transition"
        >
          <Paperclip size={12} strokeWidth={2.25} />
          Ver comprobante
        </a>
      )}

      {pago.estado === "pendiente" && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={onConfirm}
            className="flex-1 inline-flex items-center justify-center gap-1 py-2.5 bg-brand-800 text-fg-inverse rounded-pill text-xs font-semibold shadow-card hover:bg-brand-900 transition"
          >
            <Check size={14} strokeWidth={2.5} /> Confirmar
          </button>
          <button
            onClick={onReject}
            className="flex-1 inline-flex items-center justify-center gap-1 py-2.5 border border-danger-600/30 text-danger-600 rounded-pill text-xs font-semibold hover:bg-danger-100 transition"
          >
            <X size={14} strokeWidth={2.5} /> Rechazar
          </button>
        </div>
      )}
    </div>
  );
}

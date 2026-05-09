"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import {
  ArrowLeft,
  Rocket,
  Mail,
  CheckCircle2,
  Circle,
  MessageCircle,
  Download,
  Trash2,
  Inbox,
} from "lucide-react";

const TABS = [
  { id: "no_contactados", label: "Por contactar" },
  { id: "contactados", label: "Contactados" },
  { id: "todos", label: "Todos" },
];

export default function AdminWaitList() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [tab, setTab] = useState("no_contactados");
  const [filas, setFilas] = useState([]);
  const [counts, setCounts] = useState({ no_contactados: 0, contactados: 0, todos: 0 });

  async function cargar() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    const { data: perfil } = await supabase
      .from("perfiles")
      .select("es_admin")
      .eq("id", session.user.id)
      .single();
    if (!perfil?.es_admin) { router.push("/dashboard"); return; }
    setAutorizado(true);

    const { data: todas } = await supabase
      .from("wait_list")
      .select("*")
      .order("created_at", { ascending: false });

    setFilas(todas || []);
    const total = (todas || []).length;
    const cont = (todas || []).filter((f) => f.contactado).length;
    setCounts({
      no_contactados: total - cont,
      contactados: cont,
      todos: total,
    });

    setCargando(false);
  }

  useEffect(() => { cargar(); }, []);

  async function alternarContactado(id, actual) {
    const { error } = await supabase
      .from("wait_list")
      .update({
        contactado: !actual,
        contactado_at: !actual ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    cargar();
  }

  async function borrar(id) {
    if (!window.confirm("¿Borrar esta entrada de la wait-list?")) return;
    const { error } = await supabase.from("wait_list").delete().eq("id", id);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    cargar();
  }

  function exportar() {
    const headers = ["Fecha", "Email", "Nombre", "Rol", "Ciudad", "Origen", "Contactado", "Notas"];
    const escape = (v) => {
      if (v == null) return "";
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const rows = filas.map((f) => [
      f.created_at?.slice(0, 10) || "",
      f.email,
      f.nombre || "",
      f.rol || "",
      f.ciudad || "",
      f.origen || "",
      f.contactado ? "Sí" : "No",
      f.notas_admin || "",
    ].map(escape).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const fecha = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `rentto-waitlist-${fecha}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center">
        <p className="text-fg-subtle text-sm">Cargando…</p>
      </div>
    );
  }
  if (!autorizado) return null;

  const filasFiltradas =
    tab === "todos"
      ? filas
      : tab === "contactados"
        ? filas.filter((f) => f.contactado)
        : filas.filter((f) => !f.contactado);

  return (
    <div className="min-h-screen bg-surface-muted pb-24">
      <div className="max-w-[480px] mx-auto px-5">
        <Link
          href="/perfil"
          className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mt-5 mb-2 transition"
        >
          <ArrowLeft size={14} strokeWidth={2.25} /> Volver
        </Link>

        <header className="mt-2 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Rocket size={22} className="text-brand-700" strokeWidth={2.25} />
              <h1 className="text-2xl font-bold text-fg">Wait list</h1>
            </div>
            <p className="text-sm text-fg-muted mt-1">
              Interesados en el piloto desde la landing
            </p>
          </div>
          {filas.length > 0 && (
            <button
              onClick={exportar}
              className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 bg-brand-50 px-3 py-1.5 rounded-pill hover:bg-brand-100 transition"
            >
              <Download size={12} strokeWidth={2.5} /> CSV
            </button>
          )}
        </header>

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
                tab === t.id ? "bg-white/20" : "bg-surface-subtle text-fg-subtle"
              }`}>
                {counts[t.id] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {filasFiltradas.length === 0 ? (
          <div className="bg-surface rounded-card shadow-card p-10 text-center mt-3">
            <div className="w-14 h-14 bg-brand-50 rounded-pill flex items-center justify-center mx-auto">
              <Inbox size={24} className="text-brand-300" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-semibold text-fg mt-4">
              {tab === "no_contactados"
                ? "No hay nadie por contactar — al día."
                : tab === "contactados"
                  ? "Todavía no marcaste a nadie como contactado."
                  : "Aún nadie se anotó al piloto."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-3">
            {filasFiltradas.map((f) => (
              <WaitListCard
                key={f.id}
                fila={f}
                onToggle={() => alternarContactado(f.id, f.contactado)}
                onBorrar={() => borrar(f.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WaitListCard({ fila, onToggle, onBorrar }) {
  const fecha = fila.created_at
    ? new Date(fila.created_at).toLocaleDateString("es-VE", {
        day: "numeric", month: "short", year: "numeric",
      })
    : "—";

  const rolStyles = {
    inquilino: "bg-brand-100 text-brand-800",
    propietario: "bg-success-100 text-success-600",
    ambos: "bg-warning-100 text-warning-700",
  }[fila.rol] || "bg-surface-subtle text-fg-muted";

  const mailtoHref = `mailto:${fila.email}?subject=${encodeURIComponent("Rentto — entrá al piloto")}&body=${encodeURIComponent(
    `Hola${fila.nombre ? " " + fila.nombre.split(" ")[0] : ""}, te escribo de Rentto. Te anotaste a la wait-list…`
  )}`;

  return (
    <article className={`bg-surface rounded-card shadow-card p-4 ${
      fila.contactado ? "opacity-60" : ""
    }`}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex-shrink-0 mt-0.5"
          aria-label={fila.contactado ? "Marcar como no contactado" : "Marcar como contactado"}
        >
          {fila.contactado ? (
            <CheckCircle2 size={20} className="text-success-600" strokeWidth={2.25} />
          ) : (
            <Circle size={20} className="text-fg-subtle hover:text-brand-700 transition" strokeWidth={2} />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`text-sm font-semibold text-fg truncate ${
                fila.contactado ? "line-through" : ""
              }`}>
                {fila.nombre || fila.email.split("@")[0]}
              </p>
              <p className="text-xs text-fg-muted truncate">{fila.email}</p>
            </div>
            {fila.rol && (
              <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-pill flex-shrink-0 ${rolStyles}`}>
                {fila.rol}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 mt-2">
            <p className="text-[11px] text-fg-subtle">
              {fecha} · {fila.ciudad || "—"} · {fila.origen || "—"}
            </p>
          </div>

          <div className="flex gap-2 mt-3">
            <a
              href={mailtoHref}
              className="flex-1 inline-flex items-center justify-center gap-1 py-2 bg-brand-800 text-fg-inverse rounded-pill text-xs font-semibold hover:bg-brand-900 transition"
            >
              <Mail size={11} strokeWidth={2.5} /> Email
            </a>
            <button
              type="button"
              onClick={onBorrar}
              className="inline-flex items-center justify-center w-9 py-2 border border-stroke text-fg-muted rounded-pill text-xs hover:bg-danger-100 hover:text-danger-600 hover:border-danger-600/30 transition"
              aria-label="Borrar"
            >
              <Trash2 size={12} strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

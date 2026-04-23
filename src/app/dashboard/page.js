"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { Zap, Plus, Smartphone, Landmark, CreditCard, Banknote, ArrowRight } from "lucide-react";

export default function Home() {
  const [pagos, setPagos] = useState([]);
  const [propiedad, setPropiedad] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [tasa, setTasa] = useState(0);
  const [nombre, setNombre] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function cargarDatos() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const { data: perfil } = await supabase
        .from("perfiles")
        .select("nombre")
        .eq("id", session.user.id)
        .single();
      if (perfil?.nombre) {
        setNombre(perfil.nombre);
      } else if (session.user.email) {
        setNombre(session.user.email.split("@")[0]);
      }

      const { data: prop } = await supabase
        .from("propiedades")
        .select("*")
        .limit(1)
        .single();

      const { data: pagosData } = await supabase
        .from("pagos")
        .select("*")
        .order("fecha_pago", { ascending: false });

      const { data: tasaData } = await supabase
        .from("tasa_bcv")
        .select("tasa")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (tasaData) setTasa(tasaData.tasa);

      const { data: vinculacion } = await supabase
        .from("vinculaciones")
        .select("*, propiedades(*)")
        .eq("inquilino_id", session.user.id)
        .eq("estado", "activo")
        .limit(1)
        .single();
      if (vinculacion) setPropiedad(vinculacion.propiedades);
      setPropiedad(prop);
      setPagos(pagosData || []);
      setCargando(false);
    }

    cargarDatos();
  }, []);

  if (cargando) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center">
        <p className="text-fg-subtle text-sm">Cargando…</p>
      </div>
    );
  }

  const metodos = [
    { id: "movil", label: "Pago Móvil", Icon: Smartphone },
    { id: "zelle", label: "Zelle", letter: "Z" },
    { id: "transfer", label: "Transfer.", Icon: Landmark },
    { id: "binance", label: "Binance", Icon: CreditCard },
    { id: "efectivo", label: "Efectivo", Icon: Banknote },
  ];

  return (
    <div className="min-h-screen bg-surface-muted pb-24">
      <div className="max-w-[480px] mx-auto px-5">
        <header className="pt-6 pb-4">
          <h1 className="text-2xl font-bold text-fg">
            Hola{nombre ? `, ${nombre.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-fg-muted mt-1">
            Tu alquiler de abril está pendiente
          </p>
        </header>

        {propiedad && (
          <section className="bg-brand-800 text-fg-inverse rounded-card p-5 shadow-elevated">
            <p className="text-xs opacity-80 uppercase tracking-wide">
              Monto del mes · Abril 2026
            </p>
            <p className="text-4xl font-bold mt-1">${propiedad.monto_mensual}</p>
            <p className="text-xs opacity-70 mt-1">
              Bs. {(propiedad.monto_mensual * tasa).toFixed(2)} al cambio BCV
            </p>
            <div className="flex justify-between items-end mt-4">
              <span className="text-xs opacity-80">{propiedad.nombre}</span>
              <span className="inline-flex items-center bg-white/15 text-xs font-medium px-3 py-1 rounded-pill backdrop-blur-sm">
                Vence {propiedad.dia_corte} abr
              </span>
            </div>
          </section>
        )}

        <div className="bg-surface border border-stroke rounded-card p-4 mt-4 flex items-center gap-3 shadow-card">
          <div className="w-10 h-10 bg-warning-100 rounded-pill flex items-center justify-center flex-shrink-0">
            <Zap size={18} className="text-warning-700" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">
              Paga hoy y gana 5% de descuento
            </p>
            <p className="text-xs text-fg-muted mt-0.5">
              Tu propietario activó el pago anticipado
            </p>
          </div>
        </div>

        <Link
          href="/vincular"
          className="flex items-center justify-center gap-2 bg-surface border border-dashed border-brand-300 rounded-card p-4 mt-3 hover:bg-brand-50 transition"
        >
          <Plus size={16} className="text-brand-700" strokeWidth={2.5} />
          <div className="text-left">
            <p className="text-sm font-semibold text-brand-700">Vincular nueva propiedad</p>
            <p className="text-xs text-fg-muted mt-0.5">Ingresa el código de tu propietario</p>
          </div>
        </Link>

        <div className="flex justify-between items-center mt-6 mb-3">
          <h2 className="text-sm font-semibold text-fg">Pagar con</h2>
          <Link href="/pagar" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 transition">
            Ver todos <ArrowRight size={12} strokeWidth={2.5} />
          </Link>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 snap-x snap-mandatory">
          {metodos.map((m) => (
            <Link
              key={m.id}
              href="/pagar"
              className="flex-shrink-0 w-[88px] bg-surface border border-stroke rounded-card p-3 text-center hover:border-brand-500 hover:shadow-card transition snap-start"
            >
              <div className="w-10 h-10 mx-auto bg-brand-50 rounded-pill flex items-center justify-center mb-1.5">
                {m.Icon ? (
                  <m.Icon size={18} className="text-brand-700" strokeWidth={2.25} />
                ) : (
                  <span className="text-sm font-bold text-brand-700">{m.letter}</span>
                )}
              </div>
              <span className="text-[11px] text-fg-muted font-semibold whitespace-nowrap">{m.label}</span>
            </Link>
          ))}
        </div>

        <div className="flex justify-between items-center mt-6 mb-3">
          <h2 className="text-sm font-semibold text-fg">Historial reciente</h2>
          <span className="text-xs font-semibold text-brand-700 cursor-pointer hover:text-brand-800 transition">
            Ver todo
          </span>
        </div>

        <div className="bg-surface rounded-card border border-stroke divide-y divide-stroke shadow-card overflow-hidden">
          {pagos.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-fg-muted">Aún no hay pagos registrados</p>
            </div>
          ) : (
            pagos.map((pago) => (
              <PagoRow key={pago.id} pago={pago} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function PagoRow({ pago }) {
  const { Icon, letter } = iconoMetodo(pago.metodo);
  const confirmado = pago.estado === "confirmado";

  return (
    <div className="flex items-center gap-3 p-3">
      <div className="w-10 h-10 bg-brand-50 rounded-pill flex items-center justify-center flex-shrink-0">
        {Icon ? (
          <Icon size={18} className="text-brand-700" strokeWidth={2.25} />
        ) : (
          <span className="text-sm font-bold text-brand-700">{letter}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg truncate">
          Alquiler{" "}
          {new Date(pago.fecha_pago).toLocaleDateString("es-VE", {
            month: "long",
            year: "numeric",
          })}
        </p>
        <p className="text-xs text-fg-muted mt-0.5">
          {pago.metodo} ·{" "}
          {new Date(pago.fecha_pago).toLocaleDateString("es-VE", {
            day: "numeric",
            month: "short",
          })}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-fg">${pago.monto}</p>
        <span
          className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-pill mt-0.5 ${
            confirmado
              ? "bg-success-100 text-success-600"
              : "bg-warning-100 text-warning-700"
          }`}
        >
          {confirmado ? "Confirmado" : "Pendiente"}
        </span>
      </div>
    </div>
  );
}

function iconoMetodo(metodo) {
  if (metodo === "Pago móvil") return { Icon: Smartphone };
  if (metodo === "Zelle") return { letter: "Z" };
  if (metodo === "Transferencia") return { Icon: Landmark };
  if (metodo === "Efectivo") return { Icon: Banknote };
  return { Icon: CreditCard };
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import {
  Plus,
  Smartphone,
  Landmark,
  CreditCard,
  Banknote,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  XCircle,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { calcularScore } from "../lib/scoring";

export default function Home() {
  const [pagos, setPagos] = useState([]);
  const [propiedad, setPropiedad] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [tasa, setTasa] = useState(0);
  const [nombre, setNombre] = useState("");
  const [scoring, setScoring] = useState(null);
  const [verificacion, setVerificacion] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function cargarDatos() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const { data: perfil } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      // Guard de rol: el dashboard es para inquilinos. Si es propietario,
      // su panel vive en /propietario.
      if (perfil?.rol === "propietario") {
        router.replace("/propietario");
        return;
      }

      if (perfil?.nombre) {
        setNombre(perfil.nombre);
      } else if (session.user.email) {
        setNombre(session.user.email.split("@")[0]);
      }

      const { data: vinculacion } = await supabase
        .from("vinculaciones")
        .select("*, propiedades(*)")
        .eq("inquilino_id", session.user.id)
        .eq("estado", "activo")
        .limit(1)
        .maybeSingle();
      setPropiedad(vinculacion?.propiedades || null);

      const { data: pagosData } = await supabase
        .from("pagos")
        .select("*")
        .eq("user_id", session.user.id)
        .order("fecha_pago", { ascending: false });
      setPagos(pagosData || []);

      const { data: tasaData } = await supabase
        .from("tasa_bcv")
        .select("tasa")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (tasaData) setTasa(tasaData.tasa);

      const { data: verifData } = await supabase
        .from("verificaciones")
        .select("estado, nota_revisor")
        .eq("user_id", session.user.id)
        .maybeSingle();
      setVerificacion(verifData);

      setScoring(
        calcularScore({
          perfil,
          user: { email: session.user.email, created_at: session.user.created_at },
          pagos: pagosData || [],
          verificacion: verifData,
        })
      );

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

  const estado = calcularEstadoMes(propiedad, pagos);

  return (
    <div className="min-h-screen bg-surface-muted pb-24">
      <div className="max-w-[480px] mx-auto px-5">
        <header className="pt-6 pb-4">
          <h1 className="text-2xl font-bold text-fg">
            Hola{nombre ? `, ${nombre.split(" ")[0]}` : ""}
          </h1>
        </header>

        <VerificacionCard verif={verificacion} />

        {propiedad ? (
          <HeroDelMes propiedad={propiedad} tasa={tasa} estado={estado} />
        ) : (
          <EmptyVinculo />
        )}

        {propiedad && <ProximaAccion estado={estado} />}

        {propiedad && scoring && <ScoreMiniCard scoring={scoring} pagos={pagos} />}

        <Link
          href="/vincular"
          className="flex items-center justify-center gap-2 bg-surface border border-dashed border-brand-300 rounded-card p-4 mt-4 hover:bg-brand-50 transition"
        >
          <Plus size={16} className="text-brand-700" strokeWidth={2.5} />
          <p className="text-sm font-semibold text-brand-700">Vincular propiedad</p>
        </Link>

        <div className="flex justify-between items-center mt-6 mb-3">
          <h2 className="text-sm font-semibold text-fg">Pagar</h2>
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
          <h2 className="text-sm font-semibold text-fg">Historial</h2>
          <Link href="/recibos" className="text-xs font-semibold text-brand-700 hover:text-brand-800 transition">
            Ver todo
          </Link>
        </div>

        <div className="bg-surface rounded-card border border-stroke divide-y divide-stroke shadow-card overflow-hidden">
          {pagos.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-fg-muted">Aún no hay pagos registrados</p>
            </div>
          ) : (
            pagos.slice(0, 5).map((pago) => (
              <PagoRow key={pago.id} pago={pago} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Componentes
// ============================================================================

function HeroDelMes({ propiedad, tasa, estado }) {
  return (
    <section className="bg-brand-800 text-fg-inverse rounded-card p-5 shadow-elevated">
      <p className="text-xs opacity-80 uppercase tracking-wide">
        Monto del mes · {estado.mesActualLabel}
      </p>
      <p className="text-4xl font-bold mt-1">${propiedad.monto_mensual}</p>
      {tasa > 0 && (
        <p className="text-xs opacity-70 mt-1">
          Bs. {(propiedad.monto_mensual * tasa).toFixed(2)} al cambio BCV
        </p>
      )}
      <div className="flex justify-between items-end mt-4 gap-2">
        <span className="text-xs opacity-80 truncate">{propiedad.nombre}</span>
        <CountdownChip estado={estado} />
      </div>
    </section>
  );
}

function CountdownChip({ estado }) {
  const base = "inline-flex items-center text-xs font-semibold px-3 py-1 rounded-pill backdrop-blur-sm flex-shrink-0";

  if (estado.tipo === "confirmado") {
    return <span className={`${base} bg-success-100 text-success-600`}>Pagado ✓</span>;
  }
  if (estado.tipo === "pendiente") {
    return <span className={`${base} bg-warning-100 text-warning-700`}>Pendiente</span>;
  }
  if (estado.tipo === "vencido") {
    return <span className={`${base} bg-danger-100 text-danger-600`}>Vencido</span>;
  }
  // anticipado o sin_pagar_aun
  return (
    <span className={`${base} bg-white/15 text-white`}>
      {estado.diasAlCorte === 0 ? "Vence hoy" : `Faltan ${estado.diasAlCorte}d`}
    </span>
  );
}

function ProximaAccion({ estado }) {
  const config = {
    confirmado: {
      Icon: CheckCircle2,
      tone: "success",
      titulo: "Al día este mes",
      cuerpo: "+7 pts en tu score.",
      cta: null,
    },
    pendiente: {
      Icon: Clock,
      tone: "warning",
      titulo: "Esperando confirmación",
      cuerpo: "El propietario revisará el pago pronto.",
      cta: { label: "Ver recibo", href: "/recibos" },
    },
    rechazado: {
      Icon: XCircle,
      tone: "danger",
      titulo: "Pago rechazado",
      cuerpo: "Revisá el comprobante y reenviá.",
      cta: { label: "Pagar", href: "/pagar" },
    },
    vencido: {
      Icon: AlertCircle,
      tone: "danger",
      titulo: `Vencido hace ${Math.abs(estado.diasAlCorte)}d`,
      cuerpo: "Pagá ya para no perder score.",
      cta: { label: "Pagar", href: "/pagar" },
    },
    sin_pagar_aun: {
      Icon: Clock,
      tone: "brand",
      titulo: estado.diasAlCorte === 0
        ? "Vence hoy"
        : `Faltan ${estado.diasAlCorte}d`,
      cuerpo: "Adelantarte protege tu score.",
      cta: { label: "Pagar", href: "/pagar" },
    },
  }[estado.tipo];

  if (!config) return null;

  const styles = {
    success: "bg-success-100 text-success-600 border-success-600/20",
    warning: "bg-warning-100 text-warning-700 border-warning-600/20",
    danger: "bg-danger-100 text-danger-600 border-danger-600/20",
    brand: "bg-brand-50 text-brand-800 border-brand-200",
  }[config.tone];

  const ctaStyles = {
    success: "bg-success-600 text-fg-inverse hover:bg-success-600/90",
    warning: "bg-warning-600 text-fg-inverse hover:bg-warning-700",
    danger: "bg-danger-600 text-fg-inverse hover:bg-danger-600/90",
    brand: "bg-brand-800 text-fg-inverse hover:bg-brand-900",
  }[config.tone];

  return (
    <div className={`rounded-card border p-4 mt-4 shadow-card ${styles}`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-white/40 rounded-pill flex items-center justify-center flex-shrink-0">
          <config.Icon size={18} strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">{config.titulo}</p>
          <p className="text-xs opacity-90 mt-0.5 leading-relaxed">{config.cuerpo}</p>
          {config.cta && (
            <Link
              href={config.cta.href}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-pill mt-2.5 shadow-card transition ${ctaStyles}`}
            >
              {config.cta.label} <ArrowRight size={12} strokeWidth={2.5} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreMiniCard({ scoring, pagos }) {
  const { score, modo } = scoring;
  const hoy = new Date();
  const pagosEsteMes = pagos.filter((p) => {
    const f = new Date(p.fecha_pago);
    return f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear();
  });
  const ptsEsteMes = pagosEsteMes.reduce((s, p) => {
    if (p.estado === "confirmado") return s + 7;
    if (p.estado === "rechazado") return s - 10;
    return s;
  }, 0);

  return (
    <Link
      href="/contrato"
      className="flex items-center gap-3 bg-surface border border-stroke rounded-card p-4 mt-3 shadow-card hover:border-brand-300 transition"
    >
      <div className="w-10 h-10 bg-brand-50 rounded-pill flex items-center justify-center flex-shrink-0">
        <Sparkles size={18} className="text-brand-700" strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">Tu score Rentto</p>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <p className="text-xl font-bold text-fg">{score}</p>
          <span className="text-[11px] text-fg-subtle">/ 100</span>
          <span className="inline-flex items-center text-[10px] font-bold bg-brand-100 text-brand-800 px-2 py-0.5 rounded-pill ml-1">
            {modo}
          </span>
        </div>
      </div>
      {ptsEsteMes !== 0 && (
        <span className={`text-xs font-bold flex-shrink-0 ${
          ptsEsteMes > 0 ? "text-success-600" : "text-danger-600"
        }`}>
          {ptsEsteMes > 0 ? "+" : ""}{ptsEsteMes} este mes
        </span>
      )}
      <ArrowRight size={14} className="text-fg-subtle flex-shrink-0" strokeWidth={2.25} />
    </Link>
  );
}

function VerificacionCard({ verif }) {
  // Caso 1: aprobada → chip discreto verde
  if (verif?.estado === "aprobada") {
    return (
      <div className="inline-flex items-center gap-1.5 bg-success-100 text-success-600 px-3 py-1 rounded-pill text-[11px] font-bold mb-3">
        <ShieldCheck size={12} strokeWidth={2.5} />
        Identidad verificada
      </div>
    );
  }

  // Caso 2: pendiente → card amarilla con info, sin CTA principal
  if (verif?.estado === "pendiente") {
    return (
      <Link
        href="/perfil/verificar"
        className="flex items-start gap-3 bg-warning-100 text-warning-700 border border-warning-600/20 rounded-card p-4 mt-1 mb-3 shadow-card hover:bg-warning-100/90 transition"
      >
        <div className="w-9 h-9 bg-white/40 rounded-pill flex items-center justify-center flex-shrink-0">
          <Clock size={18} strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Verificación en revisión</p>
          <p className="text-xs opacity-90 mt-0.5 leading-relaxed">
            Recibirás un correo cuando esté lista. Suele tomar entre 1 y 24 horas.
          </p>
        </div>
        <ArrowRight size={14} className="opacity-70 self-center flex-shrink-0" strokeWidth={2.25} />
      </Link>
    );
  }

  // Caso 3: rechazada o requiere_reenvio → card roja con CTA
  if (verif?.estado === "rechazada" || verif?.estado === "requiere_reenvio") {
    const titulo = verif.estado === "rechazada" ? "Verificación rechazada" : "Reenvía tus documentos";
    return (
      <Link
        href="/perfil/verificar"
        className="flex items-start gap-3 bg-danger-100 text-danger-600 border border-danger-600/20 rounded-card p-4 mt-1 mb-3 shadow-card hover:bg-danger-100/80 transition"
      >
        <div className="w-9 h-9 bg-white/40 rounded-pill flex items-center justify-center flex-shrink-0">
          <ShieldAlert size={18} strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">{titulo}</p>
          <p className="text-xs opacity-90 mt-0.5 leading-relaxed">
            {verif.nota_revisor || "Revisa los detalles y vuelve a enviar tus documentos."}
          </p>
        </div>
        <ArrowRight size={14} className="opacity-70 self-center flex-shrink-0" strokeWidth={2.25} />
      </Link>
    );
  }

  // Caso 4: no existe verificación → CTA principal
  return (
    <Link
      href="/perfil/verificar"
      className="flex items-start gap-3 bg-brand-800 text-fg-inverse rounded-card p-4 mt-1 mb-3 shadow-elevated hover:bg-brand-900 transition"
    >
      <div className="w-9 h-9 bg-white/15 rounded-pill flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
        <ShieldCheck size={18} strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">Verifica tu identidad</p>
        <p className="text-xs opacity-85 mt-0.5">Suma 20 pts y desbloquea modos altos.</p>
      </div>
      <ArrowRight size={14} className="opacity-90 self-center flex-shrink-0" strokeWidth={2.25} />
    </Link>
  );
}

function EmptyVinculo() {
  return (
    <section className="bg-surface border border-stroke rounded-card p-6 text-center shadow-card">
      <div className="w-12 h-12 bg-brand-50 rounded-pill flex items-center justify-center mx-auto">
        <Plus size={22} className="text-brand-700" strokeWidth={2.25} />
      </div>
      <h2 className="text-sm font-semibold text-fg mt-3">Sin propiedad</h2>
      <p className="text-xs text-fg-muted mt-1 max-w-[260px] mx-auto">
        Pedí el código a tu propietario para vincularte.
      </p>
      <Link
        href="/vincular"
        className="inline-flex items-center justify-center gap-2 mt-4 px-5 py-2.5 bg-brand-800 text-fg-inverse rounded-pill text-xs font-semibold shadow-card hover:bg-brand-900 transition"
      >
        Vincular <ArrowRight size={12} strokeWidth={2.5} />
      </Link>
    </section>
  );
}

// ============================================================================
// Lógica
// ============================================================================

function calcularEstadoMes(propiedad, pagos) {
  const hoy = new Date();
  const mesActualLabel = hoy.toLocaleDateString("es-VE", { month: "long", year: "numeric" });

  if (!propiedad) {
    return {
      tipo: "sin_propiedad",
      subtitulo: "Vincula tu propiedad para empezar",
      mesActualLabel,
      diasAlCorte: 0,
    };
  }

  // ¿Hay pago de este mes?
  const pagoEsteMes = pagos.find((p) => {
    const f = new Date(p.fecha_pago);
    return f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear();
  });

  const dia = propiedad.dia_corte || 1;
  // Próxima fecha de corte (este mes si no ha pasado, siguiente si ya pasó)
  let fechaCorte = new Date(hoy.getFullYear(), hoy.getMonth(), dia);
  let diasAlCorte = Math.ceil((fechaCorte - hoy) / (1000 * 60 * 60 * 24));

  if (pagoEsteMes) {
    if (pagoEsteMes.estado === "confirmado") {
      return { tipo: "confirmado", subtitulo: "Estás al día este mes", mesActualLabel, diasAlCorte };
    }
    if (pagoEsteMes.estado === "rechazado") {
      return { tipo: "rechazado", subtitulo: "Tu pago necesita revisión", mesActualLabel, diasAlCorte };
    }
    return { tipo: "pendiente", subtitulo: "Pago enviado, esperando confirmación", mesActualLabel, diasAlCorte };
  }

  // No hay pago este mes
  if (diasAlCorte < 0) {
    return { tipo: "vencido", subtitulo: "Tu alquiler está vencido", mesActualLabel, diasAlCorte };
  }
  return { tipo: "sin_pagar_aun", subtitulo: "Tu alquiler de este mes te espera", mesActualLabel, diasAlCorte };
}

function PagoRow({ pago }) {
  const { Icon, letter } = iconoMetodo(pago.metodo);
  const confirmado = pago.estado === "confirmado";
  const rechazado = pago.estado === "rechazado";

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
              : rechazado
                ? "bg-danger-100 text-danger-600"
                : "bg-warning-100 text-warning-700"
          }`}
        >
          {confirmado ? "Confirmado" : rechazado ? "Rechazado" : "Pendiente"}
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

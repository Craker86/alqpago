"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { TrendingUp, Home, DollarSign, Percent, Calendar, Building2 } from "lucide-react";

export default function Estadisticas() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [pagos, setPagos] = useState([]);
  const [propiedades, setPropiedades] = useState([]);

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

      const { data: pagosData } = await supabase
        .from("pagos")
        .select("*")
        .order("fecha_pago", { ascending: false });
      setPagos(pagosData || []);

      const { data: propsData } = await supabase
        .from("propiedades")
        .select("*, vinculaciones(*)");
      setPropiedades(propsData || []);

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

  const confirmados = pagos.filter((p) => p.estado === "confirmado");
  const totalHistorico = confirmados.reduce((s, p) => s + Number(p.monto), 0);

  const hoy = new Date();
  const estesMes = confirmados
    .filter((p) => {
      const f = new Date(p.fecha_pago);
      return f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear();
    })
    .reduce((s, p) => s + Number(p.monto), 0);

  const mesesConDatos = new Set(
    confirmados.map((p) => {
      const f = new Date(p.fecha_pago);
      return `${f.getFullYear()}-${f.getMonth()}`;
    })
  ).size || 1;
  const promedioMensual = totalHistorico / mesesConDatos;

  const totalProps = propiedades.length;
  const ocupadas = propiedades.filter((p) =>
    (p.vinculaciones || []).some((v) => v.estado === "activo")
  ).length;
  const tasaOcupacion = totalProps > 0 ? (ocupadas / totalProps) * 100 : 0;

  const tendencia = calcularTendencia(confirmados, hoy);
  const maxValor = Math.max(1, ...tendencia.map((t) => t.monto));

  const porPropiedad = propiedades
    .map((p) => {
      const sumado = confirmados
        .filter((pg) => pg.propiedad_id === p.id)
        .reduce((s, pg) => s + Number(pg.monto), 0);
      return { id: p.id, nombre: p.nombre, monto: sumado };
    })
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 5);

  const topPropiedad = porPropiedad[0];

  return (
    <div className="min-h-screen bg-surface-muted pb-24">
      <div className="max-w-[480px] mx-auto px-5">
        <header className="pt-6 pb-4">
          <h1 className="text-2xl font-bold text-fg">Estadísticas</h1>
          <p className="text-sm text-fg-muted mt-1">
            Tu desempeño como propietario
          </p>
        </header>

        <section className="grid grid-cols-2 gap-3">
          <HeroStat
            Icon={DollarSign}
            label="Total cobrado"
            value={`$${totalHistorico.toLocaleString("es-VE")}`}
            subtitle={`${confirmados.length} ${confirmados.length === 1 ? "pago" : "pagos"}`}
            tone="brand"
          />
          <HeroStat
            Icon={Calendar}
            label="Este mes"
            value={`$${estesMes.toLocaleString("es-VE")}`}
            subtitle={hoy.toLocaleDateString("es-VE", { month: "long" })}
            tone="success"
          />
        </section>

        <section className="grid grid-cols-2 gap-3 mt-3">
          <MiniStat
            Icon={TrendingUp}
            label="Promedio mensual"
            value={`$${Math.round(promedioMensual).toLocaleString("es-VE")}`}
          />
          <MiniStat
            Icon={Percent}
            label="Ocupación"
            value={`${tasaOcupacion.toFixed(0)}%`}
            subtitle={`${ocupadas} de ${totalProps}`}
          />
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-semibold text-fg mb-3">Últimos 6 meses</h2>
          <div className="bg-surface rounded-card shadow-card p-4">
            {tendencia.every((t) => t.monto === 0) ? (
              <p className="text-xs text-fg-muted text-center py-8">
                Aún no hay suficientes datos para mostrar tendencia
              </p>
            ) : (
              <div className="flex items-end gap-2 h-32">
                {tendencia.map((t, i) => {
                  const altura = (t.monto / maxValor) * 100;
                  const esActual = i === tendencia.length - 1;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full h-full flex items-end">
                        <div
                          className={`w-full rounded-t-lg transition-all ${esActual ? "bg-brand-700" : "bg-brand-200"}`}
                          style={{ height: `${Math.max(altura, 2)}%` }}
                          title={`$${t.monto.toLocaleString("es-VE")}`}
                        />
                      </div>
                      <span className={`text-[10px] font-semibold ${esActual ? "text-brand-700" : "text-fg-muted"}`}>
                        {t.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {topPropiedad && topPropiedad.monto > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-fg mb-3">Top propiedades</h2>
            <div className="bg-surface rounded-card shadow-card divide-y divide-stroke overflow-hidden">
              {porPropiedad
                .filter((p) => p.monto > 0)
                .map((p, i) => {
                  const porcentaje = (p.monto / porPropiedad[0].monto) * 100;
                  return (
                    <div key={p.id} className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-6 h-6 rounded-pill flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                            i === 0 ? "bg-brand-800 text-fg-inverse" : "bg-brand-50 text-brand-700"
                          }`}>
                            {i + 1}
                          </span>
                          <span className="text-sm font-semibold text-fg truncate">{p.nombre}</span>
                        </div>
                        <span className="text-sm font-bold text-brand-700 flex-shrink-0">
                          ${p.monto.toLocaleString("es-VE")}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 bg-surface-subtle rounded-pill overflow-hidden">
                        <div
                          className="h-full bg-brand-700 rounded-pill transition-all"
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {totalProps === 0 && (
          <div className="bg-surface rounded-card shadow-card p-10 text-center mt-6">
            <div className="w-14 h-14 bg-brand-50 rounded-pill flex items-center justify-center mx-auto">
              <Building2 size={24} className="text-brand-300" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-semibold text-fg mt-4">
              Sin propiedades todavía
            </p>
            <p className="text-xs text-fg-muted mt-1">
              Publica tu primera propiedad para empezar a ver estadísticas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function calcularTendencia(confirmados, hoy) {
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const f = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    meses.push({
      key: `${f.getFullYear()}-${f.getMonth()}`,
      label: f.toLocaleDateString("es-VE", { month: "short" }),
      monto: 0,
    });
  }

  confirmados.forEach((p) => {
    const f = new Date(p.fecha_pago);
    const key = `${f.getFullYear()}-${f.getMonth()}`;
    const bucket = meses.find((m) => m.key === key);
    if (bucket) bucket.monto += Number(p.monto);
  });

  return meses;
}

function HeroStat({ Icon, label, value, subtitle, tone }) {
  const styles = {
    brand: "bg-brand-800 text-fg-inverse",
    success: "bg-success-100 text-success-600",
  }[tone];
  return (
    <div className={`${styles} rounded-card p-4 shadow-card`}>
      <Icon size={16} strokeWidth={2.25} className="opacity-80" />
      <p className="text-2xl font-bold mt-2">{value}</p>
      <p className="text-[11px] font-semibold opacity-85 mt-0.5">{label}</p>
      {subtitle && <p className="text-[10px] opacity-70 mt-1 capitalize">{subtitle}</p>}
    </div>
  );
}

function MiniStat({ Icon, label, value, subtitle }) {
  return (
    <div className="bg-surface border border-stroke rounded-card p-4 shadow-card">
      <div className="flex items-center gap-1.5 text-fg-muted">
        <Icon size={14} strokeWidth={2} />
        <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-xl font-bold text-fg mt-2">{value}</p>
      {subtitle && <p className="text-[11px] text-fg-muted mt-0.5">{subtitle}</p>}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { ArrowLeft, Paperclip, Receipt } from "lucide-react";

export default function Recibos() {
  const router = useRouter();
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data } = await supabase
        .from("pagos")
        .select("*")
        .eq("estado", "confirmado")
        .order("fecha_pago", { ascending: false });
      setPagos(data || []);
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

  return (
    <div className="min-h-screen bg-surface-muted pb-24">
      <div className="max-w-[480px] mx-auto px-5">
        <Link
          href="/perfil"
          className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mt-5 mb-2 transition"
        >
          <ArrowLeft size={14} strokeWidth={2.25} /> Volver al perfil
        </Link>

        <h1 className="text-2xl font-bold text-fg">Recibos y facturas</h1>
        <p className="text-sm text-fg-muted mt-1">
          {pagos.length} {pagos.length === 1 ? "pago confirmado" : "pagos confirmados"}
        </p>

        {pagos.length === 0 ? (
          <div className="bg-surface rounded-card shadow-card p-10 text-center mt-4">
            <div className="w-14 h-14 bg-brand-50 rounded-pill flex items-center justify-center mx-auto">
              <Receipt size={24} className="text-brand-300" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-semibold text-fg mt-4">No tienes recibos todavía</p>
            <p className="text-xs text-fg-muted mt-1">
              Cuando confirmes un pago, aparecerá aquí.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-4">
            {pagos.map((pago) => (
              <article key={pago.id} className="bg-surface rounded-card shadow-card p-4">
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
                  </div>
                  <span className="inline-flex items-center text-[10px] font-semibold bg-success-100 text-success-600 px-2 py-0.5 rounded-pill flex-shrink-0">
                    Pagado
                  </span>
                </div>
                {pago.referencia && (
                  <p className="text-xs text-fg-subtle mt-2">Ref: {pago.referencia}</p>
                )}
                {pago.comprobante_url && (
                  <a
                    href={pago.comprobante_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-brand-700 font-semibold mt-2 hover:text-brand-800 transition"
                  >
                    <Paperclip size={12} strokeWidth={2.25} />
                    Ver comprobante
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

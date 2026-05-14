import Link from "next/link";
import { Home, ShieldCheck } from "lucide-react";
import { tiempoRelativo } from "./lib/format";

// ============================================================================
// ThreadCard: una fila en la lista de conversaciones.
// ============================================================================
// `otro` es el perfil del otro participante (lo carga el padre con un join).
// `unreads` es el conteo de mensajes no leídos en este thread.

export default function ThreadCard({ conversacion, otro, propiedad, unreads = 0, verificado = false }) {
  const nombre = otro?.nombre || "Sin nombre";
  const inicial = (nombre[0] || "?").toUpperCase();

  return (
    <Link
      href={`/mensajes/${conversacion.id}`}
      className="block bg-surface rounded-card shadow-card p-3 hover:shadow-elevated transition"
    >
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <div className="w-11 h-11 bg-brand-100 text-brand-800 rounded-pill flex items-center justify-center font-bold text-sm">
            {inicial}
          </div>
          {unreads > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-danger-600 text-white rounded-pill text-[10px] font-bold flex items-center justify-center ring-2 ring-surface">
              {unreads > 9 ? "9+" : unreads}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-sm truncate ${unreads > 0 ? "font-bold text-fg" : "font-semibold text-fg"}`}>
              {nombre}
            </p>
            {verificado && (
              <span className="inline-flex items-center text-success-600">
                <ShieldCheck size={11} strokeWidth={2.5} />
              </span>
            )}
            <span className="ml-auto text-[10px] text-fg-subtle flex-shrink-0">
              {tiempoRelativo(conversacion.ultimo_mensaje_at)}
            </span>
          </div>
          <p className="text-xs text-fg-muted mt-0.5 inline-flex items-center gap-1 truncate">
            <Home size={10} strokeWidth={2} className="text-fg-subtle flex-shrink-0" />
            <span className="truncate">{propiedad?.nombre || "—"}</span>
          </p>
        </div>
      </div>
    </Link>
  );
}

import { Check, CheckCheck } from "lucide-react";

// ============================================================================
// MessageBubble: una burbuja de mensaje.
// ============================================================================
// `mio` controla alineación y color. Los míos van derecha y en brand; los del
// otro a la izquierda en surface. El timestamp se muestra muy chico debajo;
// el check (sent/read) solo en los míos.

const horaCorta = (iso) => {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit", hour12: false });
};

export default function MessageBubble({ mensaje, mio }) {
  const Status = mensaje.leido_at ? CheckCheck : Check;
  const statusColor = mensaje.leido_at ? "text-success-100" : "text-fg-inverse/60";

  return (
    <div className={`flex ${mio ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] rounded-2xl px-3.5 py-2 shadow-sm ${
          mio
            ? "bg-brand-800 text-fg-inverse rounded-br-md"
            : "bg-surface border border-stroke text-fg rounded-bl-md"
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {mensaje.contenido}
        </p>
        <div
          className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
            mio ? "text-fg-inverse/70" : "text-fg-subtle"
          }`}
        >
          <span>{horaCorta(mensaje.created_at)}</span>
          {mio && <Status size={11} className={statusColor} strokeWidth={2.5} />}
        </div>
      </div>
    </div>
  );
}

// Helpers de formato para Venezuela (es-VE).
// Separador de miles: punto. Decimal: coma. Símbolo: "Bs." antes del número.

/**
 * Formatea un monto en bolívares.
 *   formatBs(61260) → "Bs. 61.260,00"
 *   formatBs(0)     → "Bs. 0,00"
 *   formatBs(null)  → "—"
 */
export function formatBs(num, opts = {}) {
  if (num == null || !Number.isFinite(Number(num))) return "—";
  const decimals = opts.decimals ?? 2;
  return "Bs. " + Number(num).toLocaleString("es-VE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Formatea un monto en USD (uso interno: precios de alquiler siempre van en $).
 *   formatUsd(120)    → "$120"
 *   formatUsd(120.5, 2) → "$120,50"  (formato VE)
 */
export function formatUsd(num, decimals = 0) {
  if (num == null || !Number.isFinite(Number(num))) return "—";
  return "$" + Number(num).toLocaleString("es-VE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Formatea la tasa BCV (número grande con 2-4 decimales).
 *   formatTasa(61.26)    → "61,26"
 *   formatTasa(53.9985)  → "53,9985"
 */
export function formatTasa(num) {
  if (num == null || !Number.isFinite(Number(num))) return "—";
  return Number(num).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

/**
 * Tiempo relativo en español, corto.
 *   tiempoRelativo(hace 30s) → "ahora"
 *   tiempoRelativo(hace 5m)  → "hace 5m"
 *   tiempoRelativo(hace 2h)  → "hace 2h"
 *   tiempoRelativo(hace 3d)  → "hace 3d"
 *   tiempoRelativo(hace 2sem) → "12 may"
 */
export function tiempoRelativo(date) {
  if (!date) return "";
  const d = new Date(date);
  if (!Number.isFinite(d.getTime())) return "";
  const ms = Date.now() - d.getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `hace ${day}d`;
  return d.toLocaleDateString("es-VE", { day: "numeric", month: "short" });
}

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
 * Fecha completa en español con día de la semana y año. Capitaliza la
 * primera letra (es-VE devuelve "lunes" en minúscula).
 *   fechaCompleta()              → "Lunes, 11 de mayo de 2026"
 *   fechaCompleta(new Date(...)) → "Domingo, 14 de mayo de 2026"
 */
export function fechaCompleta(date = new Date()) {
  const d = new Date(date);
  if (!Number.isFinite(d.getTime())) return "";
  const str = d.toLocaleDateString("es-VE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Fecha corta es-VE.
 *   fechaCorta()              → "11 may"
 *   fechaCorta(new Date(...)) → "14 may"
 */
export function fechaCorta(date = new Date()) {
  const d = new Date(date);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleDateString("es-VE", { day: "numeric", month: "short" });
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

// Scoring MVP para Rentto
// Calcula un score 0-100 del inquilino a partir de señales que ya tenemos en la BD.
// Inspirado en MODELO-NEGOCIO.md pero adaptado a lo medible en MVP (sin integraciones externas).

export const CRITERIOS = [
  { key: "perfilCompleto", label: "Perfil completo", max: 15, desc: "Nombre y teléfono registrados" },
  { key: "emailTipo", label: "Email confiable", max: 10, desc: "Dominio corporativo suma más" },
  { key: "antiguedadCuenta", label: "Antigüedad", max: 15, desc: "Al menos 30 días como usuario" },
  { key: "pagosPuntuales", label: "Pagos confirmados", max: 40, desc: "Historial de cobros aprobados" },
  { key: "sinRechazos", label: "Sin rechazos", max: 10, desc: "Ningún pago rechazado" },
  { key: "sinPendientesViejos", label: "Resolvés a tiempo", max: 10, desc: "Sin pendientes >7 días" },
];

export const UMBRALES = {
  basico: 50,
  protegido: 70,
  premium: 85,
};

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "yahoo.es", "hotmail.com", "hotmail.es",
  "outlook.com", "live.com", "icloud.com", "me.com", "aol.com", "protonmail.com",
]);

const DIA = 1000 * 60 * 60 * 24;

/**
 * @param {Object} args
 * @param {Object} [args.perfil]   - { nombre, telefono, created_at }
 * @param {Object} [args.user]     - { email, created_at }  (solo para vista propia)
 * @param {Array}  [args.pagos]    - [{ estado, fecha_pago, created_at }]
 * @returns {{ score: number, modo: string, desglose: Object }}
 */
export function calcularScore({ perfil, user, pagos = [] } = {}) {
  const desglose = {
    perfilCompleto: 0,
    emailTipo: 0,
    antiguedadCuenta: 0,
    pagosPuntuales: 0,
    sinRechazos: 0,
    sinPendientesViejos: 0,
  };

  // 1. Perfil completo
  if (perfil?.nombre && perfil?.telefono) {
    desglose.perfilCompleto = 15;
  } else if (perfil?.nombre || perfil?.telefono) {
    desglose.perfilCompleto = 7;
  }

  // 2. Email confiable (solo si conocemos el email del usuario)
  if (user?.email) {
    const domain = (user.email.split("@")[1] || "").toLowerCase();
    if (domain) {
      desglose.emailTipo = FREE_EMAIL_DOMAINS.has(domain) ? 5 : 10;
    }
  }

  // 3. Antigüedad de la cuenta (usa user.created_at si está, sino perfil.created_at)
  const createdAt = user?.created_at || perfil?.created_at;
  if (createdAt) {
    const dias = Math.floor((Date.now() - new Date(createdAt).getTime()) / DIA);
    desglose.antiguedadCuenta = Math.max(0, Math.min(15, Math.floor(dias / 2))); // 30 días = 15 pts
  }

  // 4. Pagos confirmados: 7 pts por cada uno, cap 40
  const confirmados = pagos.filter((p) => p.estado === "confirmado");
  desglose.pagosPuntuales = Math.min(40, confirmados.length * 7);

  // 5. Sin rechazos
  const rechazados = pagos.filter((p) => p.estado === "rechazado");
  if (pagos.length > 0 && rechazados.length === 0) {
    desglose.sinRechazos = 10;
  }

  // 6. Sin pendientes viejos (>7 días)
  const ahora = Date.now();
  const pendientesViejos = pagos.filter(
    (p) => p.estado === "pendiente" && p.fecha_pago && (ahora - new Date(p.fecha_pago).getTime()) > 7 * DIA
  );
  if (pendientesViejos.length === 0) {
    desglose.sinPendientesViejos = 10;
  }

  const score = Object.values(desglose).reduce((s, v) => s + v, 0);

  let modo = "En construcción";
  if (score >= UMBRALES.premium) modo = "Premium";
  else if (score >= UMBRALES.protegido) modo = "Protegido";
  else if (score >= UMBRALES.basico) modo = "Básico";

  return { score, modo, desglose };
}

/** Color/tone asociado al modo, para usar con tokens del design system. */
export function toneDeModo(modo) {
  switch (modo) {
    case "Premium": return "brand";       // bg-brand-100 text-brand-800
    case "Protegido": return "success";   // bg-success-100 text-success-600
    case "Básico": return "warning";      // bg-warning-100 text-warning-700
    default: return "neutral";            // bg-surface-subtle text-fg-muted
  }
}

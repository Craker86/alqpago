import { supabase } from "./supabase";

// ============================================================================
// Catálogo de métodos de cobro
// ============================================================================
// Define qué campos pide cada método. Usado por /metodos-pago (form de
// edición) y /pagar (mostrar datos al inquilino).

export const METODOS = [
  {
    id: "pago_movil",
    nombre: "Pago móvil",
    detalle: "Disponible en todos los bancos venezolanos",
    icono: "Smartphone",
    campos: [
      { key: "banco", label: "Banco", placeholder: "Ej: Banesco", required: true },
      { key: "telefono", label: "Teléfono", placeholder: "0412-XXX-XX45", required: true },
      { key: "cedula", label: "Cédula", placeholder: "V-25432108", required: true },
    ],
    instruccionInquilino:
      "Hacé un pago móvil al teléfono de abajo. Incluí el código en el concepto.",
  },
  {
    id: "zelle",
    nombre: "Zelle",
    detalle: "Pagos en USD desde el exterior",
    icono: "DollarSign",
    campos: [
      { key: "email", label: "Email Zelle", placeholder: "tucorreo@gmail.com", required: true },
      { key: "nota", label: "Nota (opcional)", placeholder: "Ej: solo Bank of America", required: false },
    ],
    instruccionInquilino:
      "Enviá USD por Zelle al email de abajo. Mencioná el código en el concepto.",
  },
  {
    id: "transferencia",
    nombre: "Transferencia bancaria",
    detalle: "Cualquier banco nacional",
    icono: "Landmark",
    campos: [
      { key: "banco", label: "Banco", placeholder: "Ej: Mercantil", required: true },
      { key: "cuenta", label: "Número de cuenta", placeholder: "0102-XXXX-XXXX-XXXX", required: true },
      { key: "cedula", label: "Cédula del titular", placeholder: "V-25432108", required: true },
    ],
    instruccionInquilino:
      "Hacé una transferencia bancaria a la cuenta de abajo. Usá el código en el concepto.",
  },
  {
    id: "binance",
    nombre: "Binance Pay / USDT",
    detalle: "USDT u otros activos crypto",
    icono: "CreditCard",
    campos: [
      { key: "wallet_id", label: "Binance Pay ID o wallet", placeholder: "Ej: 123456789", required: true },
      { key: "nota", label: "Red preferida (opcional)", placeholder: "Ej: USDT TRC-20", required: false },
    ],
    instruccionInquilino:
      "Enviá USDT al Pay ID / wallet de abajo. Adjuntá el código en el concepto del envío.",
  },
  {
    id: "efectivo",
    nombre: "Efectivo",
    detalle: "Entrega en persona",
    icono: "Banknote",
    campos: [
      { key: "nota", label: "Dónde y cuándo", placeholder: "Ej: en el apartamento, fines de semana", required: false },
    ],
    instruccionInquilino:
      "Entregá el efectivo en persona. Coordinen el horario por mensajería interna.",
  },
];

export function getMetodoMeta(tipo) {
  return METODOS.find((m) => m.id === tipo) || null;
}


// ============================================================================
// Acceso a la tabla `metodos_cobro`
// ============================================================================

// Devuelve los métodos del usuario actual (para gestión).
export async function obtenerMisMetodosCobro() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];
  const { data, error } = await supabase
    .from("metodos_cobro")
    .select("*")
    .eq("user_id", session.user.id);
  if (error) throw error;
  return data || [];
}

// Devuelve los métodos ACTIVOS de un propietario (para que el inquilino los
// vea al pagar). El RLS valida que el inquilino esté vinculado a alguna de
// sus propiedades.
export async function obtenerMetodosCobroActivos(propietarioId) {
  const { data, error } = await supabase
    .from("metodos_cobro")
    .select("*")
    .eq("user_id", propietarioId)
    .eq("activo", true);
  if (error) throw error;
  return data || [];
}

// Upsert: crea o actualiza por (user_id, tipo). El UNIQUE constraint
// garantiza una sola fila por par.
export async function upsertMetodoCobro({ tipo, ...datos }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No autenticado");

  const payload = {
    user_id: session.user.id,
    tipo,
    telefono: datos.telefono ?? null,
    cedula: datos.cedula ?? null,
    banco: datos.banco ?? null,
    email: datos.email ?? null,
    cuenta: datos.cuenta ?? null,
    wallet_id: datos.wallet_id ?? null,
    nota: datos.nota ?? null,
    activo: datos.activo ?? true,
  };

  const { data, error } = await supabase
    .from("metodos_cobro")
    .upsert(payload, { onConflict: "user_id,tipo" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function toggleMetodoCobro(metodoId, activo) {
  const { error } = await supabase
    .from("metodos_cobro")
    .update({ activo })
    .eq("id", metodoId);
  if (error) throw error;
}

export async function borrarMetodoCobro(metodoId) {
  const { error } = await supabase
    .from("metodos_cobro")
    .delete()
    .eq("id", metodoId);
  if (error) throw error;
}

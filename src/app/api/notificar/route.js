import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// URL pública de la app — usada en CTAs y footer de los emails.
// Antes se derivaba de los headers Host/X-Forwarded-Proto, lo que permitía
// que un atacante inyectara CTAs apuntando a phishing vía Host header.
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const APP_HOST = APP_URL.replace(/^https?:\/\//, "");

export async function POST(request) {
  // 1. Auth — exigir JWT de Supabase en Authorization: Bearer <token>.
  // Antes este endpoint era abierto: cualquiera con internet podía mandar
  // emails desde noreply@renttove.com (dominio verificado con SPF/DKIM/DMARC).
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return Response.json(
      { error: "Supabase no está configurado en el servidor" },
      { status: 500 }
    );
  }

  const supa = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Resend
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "RESEND_API_KEY no está definida en el servidor" },
      { status: 500 }
    );
  }
  const resend = new Resend(apiKey);

  const body = await request.json();

  // Compatibilidad con el shape viejo: { monto, metodo, fecha, emailPropietario }
  // Se mapea automáticamente a tipo "pago_creado".
  const tipo = body.tipo || "pago_creado";
  const email = body.email || body.emailPropietario;
  const data = body.data || {
    monto: body.monto,
    metodo: body.metodo,
    fecha: body.fecha,
  };

  if (!email || typeof email !== "string") {
    return Response.json({ error: "Falta email destinatario" }, { status: 400 });
  }

  const plantilla = construirPlantilla(tipo, data);
  if (!plantilla) {
    return Response.json({ error: `Tipo desconocido: ${tipo}` }, { status: 400 });
  }

  const { error } = await resend.emails.send({
    from: "Rentto <noreply@renttove.com>",
    to: email,
    subject: plantilla.subject,
    html: plantilla.html,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ success: true });
}

function construirPlantilla(tipo, data) {
  const wrap = (titulo, subtitulo, contenido, ctaUrl, ctaLabel) => ({
    subject: titulo + " · Rentto",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
        <div style="background: #065f46; color: white; padding: 20px; border-radius: 12px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Rentto</h1>
          <p style="margin: 4px 0 0; opacity: 0.8; font-size: 14px;">${subtitulo}</p>
        </div>
        <div style="padding: 20px; background: #f9fafb; border-radius: 12px; margin-top: 16px;">
          ${contenido}
        </div>
        ${ctaUrl ? `
        <div style="text-align: center; margin-top: 20px;">
          <a href="${ctaUrl}"
             style="display: inline-block; background: #065f46; color: white; text-decoration: none; padding: 12px 28px; border-radius: 9999px; font-weight: 600; font-size: 14px;">
            ${ctaLabel}
          </a>
        </div>` : ""}
        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 16px;">
          Rentto · <a href="${APP_URL}" style="color: #059669;">${APP_HOST}</a>
        </p>
      </div>
    `,
  });

  const fila = (label, value, color = "inherit") => `
    <tr><td style="color: #6b7280; padding: 6px 0;">${label}</td><td style="text-align: right; font-weight: bold; color: ${color};">${value}</td></tr>
  `;

  switch (tipo) {
    case "pago_creado": {
      const monto = escapeHtml(data.monto ?? "—");
      const metodo = escapeHtml(data.metodo ?? "—");
      const fecha = escapeHtml(data.fecha ?? "—");
      return wrap(
        "Nuevo pago recibido",
        "Pendiente de confirmación",
        `<p style="font-size: 14px; color: #374151;">Se ha registrado un nuevo pago en tu propiedad:</p>
         <table style="width: 100%; font-size: 14px; margin-top: 12px;">
           ${fila("Monto", "$" + monto)}
           ${fila("Método", metodo)}
           ${fila("Fecha", fecha)}
           ${fila("Estado", "Pendiente", "#d97706")}
         </table>`,
        `${APP_URL}/propietario#pendientes`,
        "Revisar y confirmar pago"
      );
    }

    case "pago_confirmado": {
      const monto = escapeHtml(data.monto ?? "—");
      const metodo = escapeHtml(data.metodo ?? "—");
      return wrap(
        "Tu pago fue confirmado",
        "+7 pts en tu score Rentto",
        `<p style="font-size: 14px; color: #374151;">El propietario confirmó tu pago. ¡Gracias por pagar a tiempo!</p>
         <table style="width: 100%; font-size: 14px; margin-top: 12px;">
           ${fila("Monto", "$" + monto)}
           ${fila("Método", metodo)}
           ${fila("Estado", "Confirmado ✓", "#059669")}
         </table>`,
        `${APP_URL}/recibos`,
        "Ver mi recibo"
      );
    }

    case "pago_rechazado": {
      const monto = escapeHtml(data.monto ?? "—");
      const metodo = escapeHtml(data.metodo ?? "—");
      return wrap(
        "Tu pago fue rechazado",
        "Verifica el comprobante",
        `<p style="font-size: 14px; color: #374151;">El propietario rechazó este pago. Por favor verifica el comprobante y vuelve a intentar.</p>
         <table style="width: 100%; font-size: 14px; margin-top: 12px;">
           ${fila("Monto", "$" + monto)}
           ${fila("Método", metodo)}
           ${fila("Estado", "Rechazado", "#dc2626")}
         </table>`,
        `${APP_URL}/pagar`,
        "Volver a pagar"
      );
    }

    case "vinculacion_nueva": {
      const inquilino = escapeHtml(data.inquilino_nombre || "Un inquilino");
      const propiedad = escapeHtml(data.propiedad_nombre || "");
      return wrap(
        "Nuevo inquilino vinculado",
        "Tu propiedad tiene un nuevo inquilino",
        `<p style="font-size: 14px; color: #374151;"><strong>${inquilino}</strong> se acaba de vincular a tu propiedad <strong>${propiedad}</strong>.</p>
         <p style="font-size: 13px; color: #6b7280; margin-top: 12px;">Pronto recibirás los pagos mensuales en tu panel.</p>`,
        `${APP_URL}/inquilinos`,
        "Ver mis inquilinos"
      );
    }

    case "verificacion_aprobada":
      return wrap(
        "Tu identidad fue verificada",
        "Bienvenido a Rentto verificado",
        `<p style="font-size: 14px; color: #374151;">Tu cédula y documentos fueron revisados y <strong style="color: #059669;">aprobados</strong>.</p>
         <p style="font-size: 14px; color: #374151; margin-top: 8px;">Ya puedes vincularte a propiedades en cualquier modo Rentto (Básico, Protegido o Premium) y los propietarios verán el sello "Verificado" en tu perfil.</p>`,
        `${APP_URL}/perfil/verificar`,
        "Ver mi verificación"
      );

    case "verificacion_rechazada": {
      const nota = data.nota ? escapeHtml(data.nota) : "";
      return wrap(
        "Verificación rechazada",
        "Necesitamos que revises tus documentos",
        `<p style="font-size: 14px; color: #374151;">Tu solicitud de verificación fue rechazada.</p>
         ${nota
            ? `<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-top: 10px;">
                <p style="font-size: 12px; color: #991b1b; font-weight: 600; margin: 0 0 4px 0;">Motivo</p>
                <p style="font-size: 13px; color: #7f1d1d; margin: 0;">${nota}</p>
              </div>`
            : ""}
         <p style="font-size: 13px; color: #6b7280; margin-top: 12px;">Revisa los detalles y vuelve a enviar tus documentos cuando estén listos.</p>`,
        `${APP_URL}/perfil/verificar`,
        "Reenviar documentos"
      );
    }

    case "verificacion_requiere_reenvio": {
      const nota = data.nota ? escapeHtml(data.nota) : "";
      return wrap(
        "Reenvía tus documentos",
        "Algo no quedó claro en tu verificación",
        `<p style="font-size: 14px; color: #374151;">Necesitamos que reenvíes algunos de tus documentos para completar la verificación.</p>
         ${nota
            ? `<div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; margin-top: 10px;">
                <p style="font-size: 12px; color: #92400e; font-weight: 600; margin: 0 0 4px 0;">Indicación</p>
                <p style="font-size: 13px; color: #78350f; margin: 0;">${nota}</p>
              </div>`
            : ""}
         <p style="font-size: 13px; color: #6b7280; margin-top: 12px;">Tus datos ya enviados se conservan; solo cambia las fotos que se solicitan.</p>`,
        `${APP_URL}/perfil/verificar`,
        "Reenviar documentos"
      );
    }

    case "mensaje_recibido": {
      const autor = escapeHtml(data.autor_nombre || "alguien");
      const propNombre = escapeHtml(data.propiedad_nombre || "una propiedad");
      const preview = escapeHtml(data.preview || "");
      const conversacionId = encodeURIComponent(String(data.conversacion_id || ""));
      return wrap(
        "Mensaje nuevo de " + autor,
        "Sobre " + propNombre,
        `<div style="background: #ffffff; border-left: 3px solid #065f46; padding: 12px 14px; border-radius: 6px;">
           <p style="font-size: 13px; color: #374151; margin: 0; white-space: pre-wrap;">${preview}</p>
         </div>
         <p style="font-size: 12px; color: #6b7280; margin-top: 12px;">Respondé desde Rentto para mantener la conversación trazable.</p>`,
        `${APP_URL}/mensajes/${conversacionId}`,
        "Responder en Rentto"
      );
    }

    default:
      return null;
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

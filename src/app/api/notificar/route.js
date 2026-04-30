import { Resend } from "resend";

export async function POST(request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "RESEND_API_KEY no está definida en el servidor" },
      { status: 500 }
    );
  }
  const resend = new Resend(apiKey);

  const body = await request.json();

  // URL base del request (funciona en local y prod)
  const host = request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto")
    || (host.includes("localhost") ? "http" : "https");
  const appUrl = `${proto}://${host}`;

  // Compatibilidad con el shape viejo: { monto, metodo, fecha, emailPropietario }
  // Se mapea automáticamente a tipo "pago_creado".
  const tipo = body.tipo || "pago_creado";
  const email = body.email || body.emailPropietario;
  const data = body.data || {
    monto: body.monto,
    metodo: body.metodo,
    fecha: body.fecha,
  };

  if (!email) {
    return Response.json({ error: "Falta email destinatario" }, { status: 400 });
  }

  const plantilla = construirPlantilla(tipo, data, appUrl, host);
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

function construirPlantilla(tipo, data, appUrl, host) {
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
          Rentto · <a href="${appUrl}" style="color: #059669;">${host}</a>
        </p>
      </div>
    `,
  });

  const fila = (label, value, color = "inherit") => `
    <tr><td style="color: #6b7280; padding: 6px 0;">${label}</td><td style="text-align: right; font-weight: bold; color: ${color};">${value}</td></tr>
  `;

  switch (tipo) {
    case "pago_creado":
      return wrap(
        "Nuevo pago recibido",
        "Pendiente de confirmación",
        `<p style="font-size: 14px; color: #374151;">Se ha registrado un nuevo pago en tu propiedad:</p>
         <table style="width: 100%; font-size: 14px; margin-top: 12px;">
           ${fila("Monto", "$" + data.monto)}
           ${fila("Método", data.metodo)}
           ${fila("Fecha", data.fecha)}
           ${fila("Estado", "Pendiente", "#d97706")}
         </table>`,
        `${appUrl}/propietario#pendientes`,
        "Revisar y confirmar pago"
      );

    case "pago_confirmado":
      return wrap(
        "Tu pago fue confirmado",
        "+7 pts en tu score Rentto",
        `<p style="font-size: 14px; color: #374151;">El propietario confirmó tu pago. ¡Gracias por pagar a tiempo!</p>
         <table style="width: 100%; font-size: 14px; margin-top: 12px;">
           ${fila("Monto", "$" + data.monto)}
           ${fila("Método", data.metodo || "—")}
           ${fila("Estado", "Confirmado ✓", "#059669")}
         </table>`,
        `${appUrl}/recibos`,
        "Ver mi recibo"
      );

    case "pago_rechazado":
      return wrap(
        "Tu pago fue rechazado",
        "Verifica el comprobante",
        `<p style="font-size: 14px; color: #374151;">El propietario rechazó este pago. Por favor verifica el comprobante y vuelve a intentar.</p>
         <table style="width: 100%; font-size: 14px; margin-top: 12px;">
           ${fila("Monto", "$" + data.monto)}
           ${fila("Método", data.metodo || "—")}
           ${fila("Estado", "Rechazado", "#dc2626")}
         </table>`,
        `${appUrl}/pagar`,
        "Volver a pagar"
      );

    case "vinculacion_nueva":
      return wrap(
        "Nuevo inquilino vinculado",
        "Tu propiedad tiene un nuevo inquilino",
        `<p style="font-size: 14px; color: #374151;"><strong>${data.inquilino_nombre || "Un inquilino"}</strong> se acaba de vincular a tu propiedad <strong>${data.propiedad_nombre || ""}</strong>.</p>
         <p style="font-size: 13px; color: #6b7280; margin-top: 12px;">Pronto recibirás los pagos mensuales en tu panel.</p>`,
        `${appUrl}/inquilinos`,
        "Ver mis inquilinos"
      );

    default:
      return null;
  }
}

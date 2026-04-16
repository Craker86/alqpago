import { Resend } from "resend";

const resend = new Resend("re_fjxitWAt_BN4GGKM5UBb28sFjA2Fx835U");

export async function POST(request) {
  const { monto, metodo, fecha, emailPropietario } = await request.json();

  const { error } = await resend.emails.send({
    from: "Rentto <onboarding@resend.dev>",
    to: emailPropietario,
    subject: "Nuevo pago recibido - Rentto",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
        <div style="background: #065f46; color: white; padding: 20px; border-radius: 12px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Rentto</h1>
          <p style="margin: 4px 0 0; opacity: 0.8; font-size: 14px;">Nuevo pago recibido</p>
        </div>
        <div style="padding: 20px; background: #f9fafb; border-radius: 12px; margin-top: 16px;">
          <p style="font-size: 14px; color: #374151;">Se ha registrado un nuevo pago en tu propiedad:</p>
          <table style="width: 100%; font-size: 14px; margin-top: 12px;">
            <tr><td style="color: #6b7280; padding: 6px 0;">Monto</td><td style="text-align: right; font-weight: bold;">$${monto}</td></tr>
            <tr><td style="color: #6b7280; padding: 6px 0;">Método</td><td style="text-align: right;">${metodo}</td></tr>
            <tr><td style="color: #6b7280; padding: 6px 0;">Fecha</td><td style="text-align: right;">${fecha}</td></tr>
            <tr><td style="color: #6b7280; padding: 6px 0;">Estado</td><td style="text-align: right; color: #d97706; font-weight: bold;">Pendiente de confirmación</td></tr>
          </table>
        </div>
        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 16px;">
          Ingresa a Rentto para confirmar o rechazar este pago.
        </p>
      </div>
    `,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ success: true });
}
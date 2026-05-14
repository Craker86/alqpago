import Link from "next/link";
import { Shield, Lock, Eye, Trash2, Mail } from "lucide-react";

export const metadata = {
  title: "Política de privacidad — Rentto",
  description:
    "Cómo Rentto recolecta, almacena y protege tus datos personales en el contexto del marco legal venezolano.",
};

export default function Privacidad() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-[680px] mx-auto px-5 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mb-4 transition"
        >
          ← Volver
        </Link>

        <header className="border-b border-stroke pb-6">
          <div className="flex items-center gap-2">
            <Shield size={22} className="text-brand-700" strokeWidth={2.25} />
            <h1 className="text-2xl font-bold text-fg">Política de privacidad</h1>
          </div>
          <p className="text-sm text-fg-muted mt-2">
            Vigente desde el 5 de mayo de 2026 · Última actualización 14 de mayo de 2026
          </p>
        </header>

        {/* Resumen visual */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
          <Tarjeta Icon={Lock} titulo="Almacenamiento privado">
            Tus documentos se guardan en buckets cifrados y solo el equipo Rentto autorizado puede acceder con URLs firmadas que expiran en minutos.
          </Tarjeta>
          <Tarjeta Icon={Trash2} titulo="Retención de 90 días">
            Las imágenes de cédula, selfie y documentos se borran automáticamente 90 días después de aprobada la verificación.
          </Tarjeta>
          <Tarjeta Icon={Eye} titulo="Vos siempre podés ver">
            Podés solicitar acceso a tus datos, corregirlos o eliminarlos en cualquier momento.
          </Tarjeta>
          <Tarjeta Icon={Mail} titulo="Contacto directo">
            Cualquier duda escribinos a <a href="mailto:privacidad@renttove.com" className="text-brand-700 font-semibold hover:underline">privacidad@renttove.com</a>.
          </Tarjeta>
        </section>

        <div className="prose prose-sm max-w-none mt-8 space-y-6 text-fg leading-relaxed">

          <Seccion titulo="1. Quién es el responsable del tratamiento">
            <p>
              Rentto (operado bajo el dominio <strong>renttove.com</strong>) es responsable del tratamiento de los datos
              personales que recolectamos a través de nuestra plataforma web y aplicación móvil.
            </p>
            <p>
              Como plataforma con sede operativa en Venezuela, nos regimos por la <strong>Ley Orgánica de Protección de
              Datos Personales (LOPPDP)</strong>, sus reglamentos vigentes y, supletoriamente, las mejores prácticas de
              protección de datos del Mercosur y la Unión Europea (RGPD) en lo que sea aplicable.
            </p>
            <p>
              Para cualquier consulta sobre privacidad podés contactarnos en{" "}
              <a href="mailto:privacidad@renttove.com" className="text-brand-700 font-semibold hover:underline">privacidad@renttove.com</a>.
            </p>
          </Seccion>

          <Seccion titulo="2. Qué datos recolectamos y por qué">
            <p>Recolectamos solo la información necesaria para que la plataforma funcione y para prevenir fraudes:</p>

            <h3 className="font-semibold text-fg mt-4 mb-2">A) Datos de cuenta</h3>
            <ul className="list-disc ml-5 space-y-1 text-fg-muted">
              <li><strong>Email</strong>: para autenticación, contacto y notificaciones transaccionales</li>
              <li><strong>Nombre completo</strong>: para identificarte en contratos, recibos y mensajes</li>
              <li><strong>Teléfono</strong>: para comunicación operativa (ej. confirmar pagos vía WhatsApp)</li>
              <li><strong>Rol</strong> (inquilino o propietario): para mostrarte la interfaz adecuada</li>
            </ul>

            <h3 className="font-semibold text-fg mt-4 mb-2">B) Datos de verificación de identidad (KYC)</h3>
            <ul className="list-disc ml-5 space-y-1 text-fg-muted">
              <li><strong>Número y foto de la cédula de identidad</strong> (frente y dorso)</li>
              <li><strong>Selfie en vivo</strong> tomado desde tu cámara con un gesto de presencia para verificar que sos vos</li>
              <li><strong>Si sos inquilino</strong>: foto de carnet/constancia laboral + nombre y teléfono de una referencia personal</li>
              <li><strong>Si sos propietario</strong>: comprobante de domicilio y documento que acredite la propiedad del inmueble</li>
            </ul>
            <p className="mt-2 text-fg-muted">
              <strong>Por qué los pedimos</strong>: prevenir fraudes (sobre todo en contextos de alta delincuencia),
              dar confianza a la otra parte de la transacción y cumplir con buenas prácticas KYC en arrendamientos.
              Sin verificación no podés acceder a los modos Protegido y Premium.
            </p>

            <h3 className="font-semibold text-fg mt-4 mb-2">C) Datos transaccionales</h3>
            <ul className="list-disc ml-5 space-y-1 text-fg-muted">
              <li>Pagos registrados (monto, método, fecha, referencia, comprobante)</li>
              <li>Vinculaciones a propiedades y contratos asociados</li>
              <li>Histórico de score y eventos de scoring</li>
            </ul>

            <h3 className="font-semibold text-fg mt-4 mb-2">D) Conversaciones internas</h3>
            <ul className="list-disc ml-5 space-y-1 text-fg-muted">
              <li><strong>Mensajes</strong> intercambiados entre inquilino y propietario en hilos internos de la plataforma</li>
              <li><strong>Marcas temporales</strong>: cuándo se envió cada mensaje y cuándo fue leído</li>
            </ul>
            <p className="mt-2 text-fg-muted">
              <strong>Por qué los conservamos</strong>: en los modos Protegido y Premium, Rentto puede cubrir impagos.
              Las conversaciones constituyen evidencia en caso de disputas (avisos de pago tardío, reclamos por estado
              del inmueble, comunicaciones sobre el contrato). Por eso los mensajes <strong>no se pueden borrar</strong>{" "}
              una vez enviados, ni siquiera por su autor. Si querés que se elimine una conversación completa, contactanos
              a <a href="mailto:privacidad@renttove.com" className="text-brand-700 font-semibold hover:underline">privacidad@renttove.com</a>{" "}
              y evaluaremos caso por caso (puede haber obligaciones legales o contractuales que impidan el borrado).
            </p>

            <h3 className="font-semibold text-fg mt-4 mb-2">E) Datos técnicos</h3>
            <ul className="list-disc ml-5 space-y-1 text-fg-muted">
              <li>Dirección IP, user agent, navegador y dispositivo</li>
              <li>Métricas de uso anónimas vía Vercel Analytics y Speed Insights</li>
            </ul>
          </Seccion>

          <Seccion titulo="3. Base legal y consentimiento">
            <p>El tratamiento de tus datos se sustenta en:</p>
            <ul className="list-disc ml-5 space-y-1 text-fg-muted">
              <li><strong>Consentimiento explícito</strong>: aceptás expresamente el uso de tus documentos al hacer clic en la casilla de la pantalla de verificación</li>
              <li><strong>Ejecución de un contrato</strong>: para que la plataforma de pagos y vinculaciones funcione necesitamos procesar tus datos</li>
              <li><strong>Interés legítimo</strong>: prevenir fraudes y garantizar la seguridad de la otra parte de la transacción</li>
            </ul>
            <p>Podés retirar tu consentimiento en cualquier momento (ver sección 7 — derechos).</p>
          </Seccion>

          <Seccion titulo="4. Cómo almacenamos y protegemos tus datos">
            <ul className="list-disc ml-5 space-y-1 text-fg-muted">
              <li><strong>Storage cifrado</strong>: tus imágenes viven en buckets privados (Supabase Storage) con encriptación en reposo</li>
              <li><strong>URLs firmadas con expiración corta</strong>: las imágenes se acceden con URLs temporales (5–10 minutos) que solo el equipo autorizado puede generar</li>
              <li><strong>RLS (Row Level Security)</strong>: a nivel base de datos, solo vos podés ver tus propios datos. Solo administradores designados pueden ver verificaciones para revisarlas</li>
              <li><strong>Conexiones HTTPS/TLS</strong>: todo el tráfico entre tu dispositivo y nuestros servidores va encriptado</li>
              <li><strong>Acceso restringido</strong>: solo el personal de Rentto autorizado para revisar verificaciones tiene permisos. Cada acceso queda auditado</li>
            </ul>
          </Seccion>

          <Seccion titulo="5. Cuánto tiempo guardamos tus datos">
            <p className="font-semibold text-fg">Política de retención por tipo de dato:</p>
            <table className="w-full text-sm mt-3 border border-stroke rounded-card overflow-hidden">
              <thead className="bg-surface-subtle">
                <tr>
                  <th className="text-left p-2 font-semibold">Tipo de dato</th>
                  <th className="text-left p-2 font-semibold">Retención</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke">
                <tr>
                  <td className="p-2">Datos de cuenta (email, nombre, teléfono)</td>
                  <td className="p-2 text-fg-muted">Mientras tu cuenta esté activa</td>
                </tr>
                <tr>
                  <td className="p-2"><strong>Imágenes de cédula, selfie y documentos KYC</strong></td>
                  <td className="p-2 text-fg-muted"><strong>90 días post-aprobación</strong>, luego se borran automáticamente</td>
                </tr>
                <tr>
                  <td className="p-2">Metadatos de verificación (estado, número de cédula, fecha)</td>
                  <td className="p-2 text-fg-muted">Mientras tu cuenta esté activa (auditoría)</td>
                </tr>
                <tr>
                  <td className="p-2">Pagos y comprobantes</td>
                  <td className="p-2 text-fg-muted">Mientras tu cuenta esté activa + 5 años por obligación contable</td>
                </tr>
                <tr>
                  <td className="p-2">Mensajes y conversaciones internas</td>
                  <td className="p-2 text-fg-muted">Permanente mientras la cuenta esté activa (audit trail para disputas)</td>
                </tr>
                <tr>
                  <td className="p-2">Notificaciones y logs de actividad</td>
                  <td className="p-2 text-fg-muted">12 meses</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-3">
              Tras 90 días de aprobación, las <strong>fotos de cédula y selfie se eliminan automáticamente</strong> mediante
              un proceso programado. Solo se conservan los metadatos (que la verificación fue aprobada, en qué fecha) para
              auditoría y para mantener tu sello "Verificado" en la plataforma sin necesidad de re-subir docs.
            </p>
          </Seccion>

          <Seccion titulo="6. Con quién compartimos tus datos">
            <p>
              <strong>Nunca vendemos tus datos personales.</strong> Compartimos información solo con los proveedores
              estrictamente necesarios para que el servicio funcione:
            </p>
            <ul className="list-disc ml-5 space-y-1 text-fg-muted">
              <li><strong>Supabase</strong> (Postgres, Storage, Auth) — almacenamiento de datos de la plataforma</li>
              <li><strong>Vercel</strong> — hosting de la aplicación web y emails de la edge network</li>
              <li><strong>Resend</strong> — envío de correos transaccionales (notificaciones de pago, verificación, etc.)</li>
              <li><strong>Cloudflare</strong> — gestión del dominio renttove.com</li>
            </ul>
            <p>
              Cada uno de estos proveedores cumple con estándares internacionales de protección de datos (SOC 2, ISO
              27001, RGPD). Solo procesan los datos mínimos necesarios para su función específica.
            </p>
            <p className="mt-3">
              <strong>Otros usuarios</strong>: a tu contraparte (propietario o inquilino) le mostramos solo lo necesario
              para la transacción: tu nombre, sello "Verificado" si aplica, modo de tu propiedad, monto de pagos. Nunca
              le mostramos tu cédula, foto, dirección personal ni teléfono completo sin tu permiso explícito.
            </p>
          </Seccion>

          <Seccion titulo="7. Tus derechos">
            <p>Como titular de tus datos personales, tenés derecho a:</p>
            <ul className="list-disc ml-5 space-y-1 text-fg-muted">
              <li><strong>Acceder</strong> a la información que tenemos sobre vos</li>
              <li><strong>Rectificar</strong> datos incorrectos o incompletos</li>
              <li><strong>Solicitar la eliminación</strong> de tus datos (derecho al olvido), salvo que tengamos obligación legal de conservarlos</li>
              <li><strong>Oponerte</strong> al tratamiento de tus datos para fines específicos</li>
              <li><strong>Solicitar la portabilidad</strong> de tus datos en formato estructurado</li>
              <li><strong>Retirar tu consentimiento</strong> en cualquier momento, sin que esto afecte la legalidad del tratamiento previo</li>
            </ul>
            <p className="mt-3">
              Para ejercer cualquier derecho, escribinos a{" "}
              <a href="mailto:privacidad@renttove.com" className="text-brand-700 font-semibold hover:underline">privacidad@renttove.com</a>{" "}
              desde el email asociado a tu cuenta. Respondemos en un máximo de 15 días hábiles.
            </p>
          </Seccion>

          <Seccion titulo="8. Cookies y tecnologías similares">
            <p>Usamos cookies estrictamente necesarias para que la plataforma funcione:</p>
            <ul className="list-disc ml-5 space-y-1 text-fg-muted">
              <li><strong>Cookies de sesión</strong> (Supabase Auth): para mantener tu sesión iniciada</li>
              <li><strong>LocalStorage</strong>: para persistir tu sesión en el dispositivo</li>
              <li><strong>Vercel Analytics</strong>: métricas anónimas de uso que no identifican al usuario individual</li>
            </ul>
            <p>
              No usamos cookies de terceros para publicidad ni de tracking entre sitios.
            </p>
          </Seccion>

          <Seccion titulo="9. Menores de edad">
            <p>
              Rentto está dirigido exclusivamente a mayores de 18 años. No recolectamos a sabiendas datos de menores. Si
              detectamos una cuenta de menor de edad, la eliminamos junto con todos sus datos.
            </p>
          </Seccion>

          <Seccion titulo="10. Cambios a esta política">
            <p>
              Si hacemos cambios significativos a cómo manejamos tus datos, te avisaremos por correo y mediante un aviso
              en la aplicación al menos 15 días antes de que entren en vigencia. Los cambios menores (correcciones,
              clarificaciones) se publican directamente con una nueva fecha de "Última actualización".
            </p>
          </Seccion>

          <Seccion titulo="11. Contacto">
            <p>
              Para cualquier pregunta, queja o solicitud relativa a tus datos personales:
            </p>
            <p className="bg-surface-subtle border border-stroke rounded-card p-4 mt-3">
              📧 <a href="mailto:privacidad@renttove.com" className="text-brand-700 font-semibold hover:underline">privacidad@renttove.com</a><br />
              Respondemos en un máximo de 15 días hábiles desde la recepción.
            </p>
          </Seccion>

        </div>

        <footer className="mt-10 pt-6 border-t border-stroke text-center text-xs text-fg-subtle">
          <p>Rentto · Hecho en Venezuela 🇻🇪</p>
          <div className="flex justify-center gap-3 mt-2">
            <Link href="/" className="hover:text-brand-700 transition">Inicio</Link>
            <span>·</span>
            <Link href="/modos" className="hover:text-brand-700 transition">Modos</Link>
            <span>·</span>
            <Link href="/privacidad" className="hover:text-brand-700 transition">Privacidad</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Tarjeta({ Icon, titulo, children }) {
  return (
    <div className="bg-surface-muted border border-stroke rounded-card p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-brand-50 rounded-pill flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-brand-700" strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-fg">{titulo}</p>
          <p className="text-xs text-fg-muted mt-1 leading-relaxed">{children}</p>
        </div>
      </div>
    </div>
  );
}

function Seccion({ titulo, children }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-fg mb-2">{titulo}</h2>
      <div className="space-y-2 text-sm text-fg leading-relaxed">{children}</div>
    </section>
  );
}

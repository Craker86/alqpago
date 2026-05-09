# Estado del Proyecto — Rentto

**Última actualización:** 5 mayo 2026 (KYC live capture + Fase 4 privacidad)

## ✅ Completado en sesión 5 may

### KYC Fase 4 — Privacidad y retención
- [x] **Página pública `/privacidad`** con texto legal completo (LOPPDP VE + buenas prácticas RGPD): qué datos recolectamos, base legal, almacenamiento cifrado, retención por tipo, terceros (Supabase/Vercel/Resend/Cloudflare), derechos del titular, cookies, contacto `privacidad@renttove.com`
- [x] **API `/api/cron/cleanup-verificaciones`**: route handler con `createClient(service_role)` para bypassear RLS. Borra archivos del bucket >90 días post-`reviewed_at` para verificaciones aprobadas/rechazadas. Mantiene metadatos (estado, cédula, fecha, revisor) y escribe nota explicativa. Idempotente
- [x] **Auth del cron**: header `Authorization: Bearer ${CRON_SECRET}` requerido. Devuelve 401 sin token o env var ausente
- [x] **`vercel.json`** con `crons: [{ path, schedule: "0 4 * * *" }]` — corre diario a las 4:00 UTC (00:00 hora VE)
- [x] **Links a `/privacidad`** desde 3 puntos: footer del landing (`/`), checkbox del signup en `/login`, bloque de consentimiento en `/perfil/verificar`

### KYC Fase 3.5 — Captura de selfie en vivo + liveness por gesto
- [x] **Componente `LiveSelfieCapture`** con `getUserMedia` (cámara frontal, 1280×720 ideal). 5 estados: solicitando / preparando / centrando / listo / preview / error
- [x] **Liveness por gesto random**: 5 gestos posibles (mirá izquierda/derecha/arriba, sonreí, parpadeá). Aleatorio por sesión, mostrado durante 3 s
- [x] **Etapas guiadas**: 3 s gesto → 2 s "mirá a la cámara" → botón Capturar habilitado
- [x] **Marco circular guía** + countdown visible para guiar al usuario
- [x] **Espejo horizontal** (`scaleX(-1)`) en preview Y en captura para que la foto coincida con la vista del usuario
- [x] **Manejo de errores**: NotAllowedError (denied), NotFoundError (sin cámara), NotReadableError (cámara ocupada por otra app), navegador sin getUserMedia
- [x] **Cleanup**: stream.getTracks().forEach(stop) al cancelar/aceptar/desmontar
- [x] **Integración en `/perfil/verificar`**: solo el selfie es live (cédula y otros docs siguen como upload). Badge rojo "EN VIVO" pulsante en la card. Botón "Tomar selfie en vivo" abre el modal fullscreen

## ✅ Completado en sesión 4 may

### UX propietario — `/cobros` dedicado y guards de rol
- [x] **`/dashboard` ahora chequea rol** y rebota a `/propietario` si el usuario es propietario. Antes podías terminar viendo contenido de inquilino con la nav del propietario por entrar por URL directa, link de "Volver", o pase de cuenta
- [x] **`TopBar` logo role-aware**: apunta a `/propietario` o `/dashboard` según rol, sin rebote
- [x] **`NavBar` reactiva al `pathname`**: el rol se refresca en cada navegación. Antes se cargaba una sola vez al montar y quedaba con rol viejo (o `null` = default inquilino) tras login/logout
- [x] **FAB del propietario es "Cobrar"** (icono `Banknote`, antes era "Publicar"). Lleva a `/cobros` con badge rojo si hay pagos pendientes (count en NavBar via `propiedades!inner(user_id)`)
- [x] **Página dedicada `/cobros`**: card grande por pago pendiente con avatar del inquilino + badge "Verificado" (si KYC aprobado) + propiedad + monto destacado + comprobante embed (no link) + botones grandes Confirmar/Rechazar. Empty state celebratorio "¡Estás al día!" + sección "Procesados hoy" (últimas 24h) como feedback de qué se hizo
- [x] **Acceso a "Publicar"**: link discreto `+ Publicar` en header de "Mis propiedades"; CTA dashed "Publicar tu primer inmueble" cuando 0 propiedades
- [x] **Email respeta `notif_prefs.{tipo}.email`** en `/cobros` igual que en panel

### KYC Fase 3 — Score boost + bloqueo de modos altos
- [x] **Nuevo criterio "Identidad verificada"** en `lib/scoring.js` con max 20 pts. `calcularScore` acepta `verificacion` opcional. Score sigue capeado a 100 (suma bruta puede llegar a 120 pero se limita)
- [x] **Bloqueo en `/vincular`**: modos Protegido y Premium requieren verificación aprobada además del score mínimo. Mensaje específico cuando falta solo verificación, solo score, o ambos
- [x] **Botón dinámico**: "Te faltan X pts" / "Verifica tu identidad primero" / "Confirmar vinculación" según el motivo del bloqueo
- [x] **Badge "Verificado ✓"** en cards de `/inquilinos` (vista propietario), junto al modo y al score
- [x] **Verificación propagada a todos los call sites** de calcularScore: dashboard, perfil, contrato, vincular, inquilinos, propiedades

### KYC Fase 2 — Panel admin de revisión
- [x] **`supabase-verificaciones-trigger.sql`**: trigger `AFTER UPDATE OF estado` en `verificaciones` que crea notificación inbox automática (`verificacion_aprobada` / `verificacion_rechazada` / `verificacion_requiere_reenvio`) respetando `notif_prefs.{tipo}.in_app`
- [x] **3 plantillas de email nuevas** en `/api/notificar` (subject + HTML con CTA y nota del revisor cuando aplica)
- [x] **3 nuevos eventos** en `/notificaciones/preferencias` (toggles in_app + email para verificación)
- [x] **Panel `/admin/verificaciones`** con guard de `es_admin`, tabs por estado (pendiente/reenvío/aprobadas/rechazadas) con contadores, lista expandible
- [x] **Detalle**: datos de la persona + grid 2-col de previews de docs con URLs firmadas (10 min) + lightbox tap-to-zoom
- [x] **Acciones**: Aprobar / Pedir reenvío / Rechazar con nota obligatoria. Cliente UPDATE + email respeta prefs del destinatario
- [x] **Link en `/perfil`** con `AdminCard` oscuro destacado solo si `es_admin`

### KYC Fase 1 — Verificación de identidad
- [x] **`supabase-verificaciones.sql`**: tabla `verificaciones` + columna `perfiles.es_admin` (admin = `jesusalcala86@gmail.com`) + bucket Storage privado `verificaciones` + 4 policies RLS por tabla + 4 policies por Storage
- [x] **Wizard `/perfil/verificar`** con consentimiento explícito + número de cédula (normalizado V/E/J-XXXXXXXX) + uploads con preview + cámara nativa (`capture="user"` para selfie, `"environment"` para docs)
- [x] **Documentos por rol**: inquilino pide cédula+selfie+ref. laboral+ref. personal (texto); propietario pide cédula+selfie+comprobante domicilio+documento propiedad
- [x] **Estados**: `pendiente / aprobada / rechazada / requiere_reenvio`. Re-envío permitido si rechazada o requiere_reenvio
- [x] **Banner de estado** en el wizard según estado actual
- [x] **Storage privado**: paths con convención `{user_id}/{tipo}/{timestamp}.{ext}`. URLs firmadas de 5 min para preview de docs ya subidos
- [x] **Card en `/dashboard`** con 4 estados visuales: sin verificar (CTA brand), pendiente (warning), rechazada/reenvío (danger), aprobada (chip success discreto)
- [x] **Link en `/perfil`** con badge dinámico al lado del row "Verificar identidad"

## ✅ Completado en sesión 30 abr

### Dominio en producción
- [x] **Dominio `renttove.com` comprado** (registrador: Cloudflare)
- [x] **Vercel domains**: `renttove.com` (apex) + `www.renttove.com` (canónico) configurados, ambos con configuración válida
- [x] **DNS en Cloudflare**: A record `@ → 76.76.21.21` y CNAME `www → cname.vercel-dns.com`, ambos con proxy en gris (DNS only) para que SSL de Vercel funcione
- [x] **Resend dominio verificado** con DKIM + SPF + DMARC (TXT en `resend._domainkey`, MX/TXT en `send`, TXT en `_dmarc`). Configuración automática de Resend ↔ Cloudflare vía OAuth
- [x] **Habilitar recepción OFF** en Resend (solo enviamos, no recibimos)
- [x] **`from` actualizado** a `Rentto <noreply@renttove.com>` en `/api/notificar` — emails ahora llegan a cualquier destinatario, no solo al verificado


## ✅ Completado en sesión 25 abr

### Producto core
- [x] **Validación modo vs score** en `/vincular` y marketplace — bloquea vinculación si score insuficiente
- [x] **Trigger de score en Supabase** — auto-registra +7/−10 pts en `score_historial`
- [x] **UI Historial de pagos** en `/contrato` inquilino — timeline con eventos
- [x] **Página `/modos`** pública para marketing y educación
- [x] **Sistema de notificaciones inbox**: tabla + RLS + 3 triggers + página `/notificaciones`
- [x] **Bell del TopBar** muestra unreads de notificaciones (no más pagos pendientes)
- [x] **Botón quitar foto inline** en `/propietario`
- [x] **Emails automáticos para 4 eventos** con templates (`/api/notificar` refactor)
- [x] **Email column en perfiles** + trigger auto-populate desde auth.users
- [x] **PWA real**: manifest enriquecido, SW funcional, install prompt component

### Performance
- [x] Vercel Analytics + Speed Insights integrados
- [x] **Score 100/100 móvil y desktop** (P75 usuarios reales)
- [x] LCP 0.58s móvil, 1.41s desktop. CLS 0. TTFB 0.2s

### Mejoras post-cierre (extensión de sesión)
- [x] **Dashboard inquilino dinámico**: `ProximaAccion` card que cambia según estado del mes (confirmado/pendiente/rechazado/vencido/sin pagar). Countdown chip "Faltan Xd" o "Vencido". Score mini-card con tendencia "+N este mes"
- [x] **Preferencias de notificaciones** persistidas: tabla `perfiles.notif_prefs` JSONB + helper `user_quiere_notif()`. Triggers respetan in_app, clientes respetan email. Sub-página `/notificaciones/preferencias` con toggles por evento×canal
- [x] **Búsqueda en `/inquilinos`** por nombre/propiedad/dirección/teléfono
- [x] **Export CSV de pagos** en `/propietario` con BOM UTF-8 (Excel detecta acentos correctamente)

## ⏳ Pendiente

### Acciones tuyas (Supabase)
- [x] ~~Correr `supabase-notif-prefs.sql`~~ (corrido)
- [x] ~~Correr `supabase-verificaciones.sql`~~ (corrido)
- [x] ~~Correr `supabase-verificaciones-trigger.sql`~~ (corrido)

### Acciones tuyas (Vercel env vars)
- [ ] **Agregar `CRON_SECRET`** en Vercel → Settings → Environment Variables. Generá un string random largo (~32 chars). El cron de retención lo usa para autenticar el llamado
- [ ] **Agregar `SUPABASE_SERVICE_ROLE_KEY`** en Vercel → Settings → Environment Variables. Lo encontrás en Supabase → Project Settings → API → "service_role" key (la **secreta**, no la anon). El cron lo usa para borrar archivos del bucket bypassando RLS

### Acciones tuyas (Vercel UI)
- [ ] Activar Web Analytics toggle en sidebar "Analítica"
- [ ] Activar Speed Insights toggle en "Información sobre velocidad"
- [ ] Activar "Implementación de vista previa"
- [ ] Expandir "4 Recomendaciones" en Configuración de implementación

### Crecimiento (post-dominio)
- [ ] Plan de piloto con 10 propiedades en Caracas (10 candidatos definidos + outreach)
- [ ] Wait-list / landing de marketing con `/modos` como punto central
- [ ] Probar envío real de email desde producción a un destinatario externo (validar SPF/DKIM/DMARC end-to-end)
- [ ] Considerar subir DMARC de `p=none` a `p=quarantine` cuando confirmemos que todos los emails legítimos pasan

## 📋 Decisiones tomadas en esta sesión

- **Score histórico vs score visible:** dos modelos. `score_historial.score_total` es ledger acumulativo de eventos de pago. El score de la card son 6 criterios escalados a 100. UI lo aclara
- **Notificaciones INSERT:** solo via triggers SECURITY DEFINER. Cliente NO inserta directamente
- **Email enforcement:** preferencias se respetan en dos lugares — triggers chequean `in_app`, clientes chequean `email` antes de llamar `/api/notificar`
- **CSV export:** BOM UTF-8 para que Excel abra acentos/ñ correctamente en Windows
- **Dashboard estado del mes:** lógica centralizada en `calcularEstadoMes()` con 5 ramas (confirmado/pendiente/rechazado/vencido/sin_pagar_aun)

## 📂 Archivos SQL pendientes de correr (en orden)

1. `supabase-rls.sql` — policies (ya corrido)
2. `supabase-score-trigger.sql` — trigger de score (ya corrido)
3. `supabase-notificaciones.sql` — inbox (ya corrido)
4. `supabase-perfiles-email.sql` — email column (ya corrido)
5. `supabase-notif-prefs.sql` — preferencias (ya corrido)
6. `supabase-verificaciones.sql` — KYC tabla + bucket + RLS + admin (ya corrido)
7. `supabase-verificaciones-trigger.sql` — trigger notif inbox al cambiar estado (ya corrido)

**Todos los SQL están al día. No hay nada pendiente de correr en Supabase.**

## 📂 Archivos clave en esta sesión

- `supabase-score-trigger.sql`, `supabase-notificaciones.sql`, `supabase-perfiles-email.sql`, `supabase-notif-prefs.sql`
- `src/app/lib/scoring.js`, `src/app/lib/modos.js`
- `src/app/modos/page.js` — landing pública
- `src/app/notificaciones/page.js` — inbox
- `src/app/notificaciones/preferencias/page.js` — preferencias
- `src/app/dashboard/page.js` — dinámico con ProximaAccion + ScoreMiniCard
- `src/app/PWAInstaller.js` — registro SW + install prompt
- `public/sw.js`, `public/manifest.json` — PWA shell

## 🎯 Próxima sesión — prioridades

1. **Configurar env vars en Vercel** (`CRON_SECRET` + `SUPABASE_SERVICE_ROLE_KEY`) para que el cron de retención funcione
2. **Probar live capture end-to-end** desde mobile (Android Chrome + iOS Safari) y desktop
3. **Probar el cron manualmente** (`curl` con `Authorization: Bearer ${CRON_SECRET}`) antes de esperar el schedule diario
4. **Plan de piloto** — 10 candidatos en Caracas, agenda de outreach (acción operativa, no técnica)
5. **Probar email real** desde producción a Gmail externo (validar SPF/DKIM/DMARC end-to-end)
6. **Subir DMARC** a `p=quarantine` después de 1-2 semanas en `p=none`
7. **(Crecimiento)** Sumar match biométrico automático con AWS Rekognition (~$0.001/check) cuando volumen lo justifique. Plan B: face-api.js (gratis, browser, menos preciso)
8. **(Crecimiento)** Crear `privacidad@renttove.com` como inbox real (vía Resend o forward a Gmail) para responder solicitudes de derechos del titular

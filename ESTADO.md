# Estado del Proyecto — Rentto

**Última actualización:** 14 mayo 2026 (sesión extendida — fix BCV + formato VE + mensajería + métodos de cobro)

## ✅ Completado en sesión 14 may

Cuatro PRs grandes mergeados a main: #7, #8, #9 y #10/#11.

### Fix del cron BCV (PR #7)
- [x] **Diagnóstico**: el cron no insertó tasas el 13 y 14 may por dos bugs encadenados. La última fila en `tasa_bcv` era del 15 abr (pre-feature). 30 días sin actualización
- [x] **Bug #1 — Regex roto**: el BCV cambió el HTML y ahora envuelve la tasa en `<strong class="strong-tb">`. El regex anterior exigía `<strong>` literal. Fix: `<strong[^>]*>`
- [x] **Bug #2 — Fallback muerto**: `pydolarvenezuela-api.vercel.app` descontinuado (`DEPLOYMENT_NOT_FOUND`). Reemplazado por `ve.dolarapi.com/v1/dolares/oficial`

### Formato es-VE en /pagar /recibos /cobros /propietario (PR #8)
- [x] **`/pagar` replica el patrón del dashboard**: hero con USD + equivalente Bs + tasa BCV con antigüedad
- [x] **Bug crítico arreglado**: la tasa BCV estaba **hardcoded a 45.20** en /pagar. La tasa real es ~510. Cada pago insertaba `monto_bs` ~10x menor al correcto. Ahora usa la tasa real del DB; si no hay tasa, `monto_bs` queda null
- [x] **`/recibos`, `/cobros`, `/propietario`**: `formatUsd` aplicado a todos los montos visibles

### Mensajería interna inquilino ↔ propietario (PR #9)
- [x] **Schema** (`supabase-mensajeria.sql`): `conversaciones` (1 por par propiedad+inquilino) + `mensajes` (audit trail, no editables, no borrables). Triggers para `vinculacion_id` automático, notif inbox y rate limit 10/24h
- [x] **Realtime**: ambas tablas en `supabase_realtime`. Hook `useConversacion` subscribe a INSERT y UPDATE
- [x] **`/mensajes`** y **`/mensajes/[id]`** con burbujas estilo iMessage, autoscroll, check sent/read, optimistic update
- [x] **WhatsApp sale del marketplace**: `/propiedades/[id]` ahora tiene "Consultar" que abre/crea conversación
- [x] **TopBar**: nuevo ícono Mensajes con badge separado del Bell
- [x] **Privacidad**: sección sobre conversaciones internas + audit trail + retención

### Métodos de cobro del propietario + código único (PR #10/#11)
- [x] **Schema** (`supabase-metodos-cobro-y-codigo.sql`): tabla `metodos_cobro` (1 por (propietario, tipo)), 5 tipos. RLS: dueño gestiona los suyos, inquilinos vinculados leen
- [x] **`pagos.codigo_rentto`**: TEXT UNIQUE generado por función Postgres `generar_codigo_pago()` + trigger BEFORE INSERT. Formato `R-XXXXXX` (alfabeto sin chars confundibles, 481M combinaciones)
- [x] **`/metodos-pago` rediseñado**: era una lista estática informativa. Ahora es CRUD completo para el propietario con toggle activo/pausado por método
- [x] **`/pagar` rediseñado**: array hardcoded reemplazado por carga dinámica desde `metodos_cobro` del propietario. Cuando el inquilino elige método ve los datos REALES con botones copy individual y "Copiar todo". Código Rentto destacado con copy
- [x] **`/cobros` con búsqueda**: input "Buscar por código (R-…)" arriba. Filter client-side por código o nombre. Cada CobroCard muestra el código Rentto destacado
- [x] Bug crítico cerrado: hasta hoy los datos bancarios del propietario se compartían por WhatsApp. Ahora viven en la app, son trazables y los inquilinos los copian con un tap

### Wait list de pre-registro
- [x] **`supabase-wait-list.sql` corrido** en Supabase. Tabla activa + RLS

## 📋 Decisiones tomadas en esta sesión

- **Threads de mensajería: por vinculación, no por persona.** Tendencia en real estate (Airbnb, Booking, Zillow) porque cada contrato es una unidad jurídica con disputas independientes
- **WhatsApp sale del marketplace completamente.** Reemplazado por mensajería interna con rate limit (10/24h) pre-vinculación. Razones: audit trail desde día 1, no exposición del teléfono del propietario, evidencia para disputas en Protegido/Premium
- **Mensajes son audit trail estricto.** No editables, no borrables por usuarios. Solo admin puede borrar caso por caso por solicitud de privacidad
- **Tasa BCV: si la fuente falla, no inventar.** `monto_bs` queda null si no hay tasa. Mejor que escribir un valor falso (que es exactamente lo que causaba el bug de 45.20)
- **Pagos "directamente en la app" = Escenario 2** (menos fricción, mismo flujo bancario). NO custodia/escrow (Escenario 3) porque requiere entidad legal constituida, que está pendiente
- **Código único por pago = clave del flujo nuevo.** El inquilino lo pega en el concepto del banco, el propietario lo busca en /cobros para emparejar. Reemplaza la comparación manual de fechas/montos/fotos
- **Métodos de cobro por PROPIETARIO, no por propiedad.** Un dueño con 3 inmuebles típicamente cobra a la misma cuenta. Simplifica todo

## ✅ Completado en sesión 11 may

### Tasa BCV automática + formato VE
- [x] **`/api/cron/tasa-bcv`**: scrapea bcv.org.ve (regex sobre `<strong>` dentro del bloque `id="dolar"`) con fallback a `pydolarvenezuela-api.vercel.app`. Auth con `CRON_SECRET`. Insert en `tasa_bcv` con service_role. Timeout 8s por intento
- [x] **Cron diario** a las 12:00 UTC (8 AM hora VE) — limitación de Vercel Hobby es 1 vez/día. Suficiente porque BCV publica una vez por día hábil
- [x] **`lib/format.js`**: helpers `formatBs`, `formatUsd`, `formatTasa`, `tiempoRelativo`, `fechaCompleta`, `fechaCorta` con locale `es-VE`
- [x] **Dashboard HeroDelMes**: muestra monto en USD + equivalente Bs. formato VE (`Bs. 61.260,00`) + línea pequeña con tasa explícita y antigüedad (`1 USD = Bs. 61,26 · BCV hace 2h`)
- [x] **Fecha actual visible** debajo del saludo en dashboard inquilino y propietario (`Lunes, 11 de mayo de 2026`). Se actualiza sola al cambiar el día. Función `fechaCompleta()` capitaliza el weekday

### Tipografía moderna (2 iteraciones)
- [x] **Plus Jakarta Sans** (PR #2) — primer cambio. Más geométrica, premium
- [x] **Onest** (PR #3) — segunda iteración. Más distintiva, con caracter
- [x] Tracking apretado en h1/h2 (-0.03em / -0.02em) para feel SaaS premium
- [x] `font-feature-settings` removido en favor de defaults Onest
- [x] Title actualizado: "Rentto - Paga tu alquiler fácil" → "Rentto · Alquilar en Venezuela"

### Auditoría completa de seguridad e infraestructura
- [x] **`src/lib/supabase.js` borrado** (archivo huérfano con anon key hardcoded — no se importaba en ningún lado)
- [x] **`.env.example` documentado** con `CRON_SECRET` y `SUPABASE_SERVICE_ROLE_KEY` + comentarios
- [x] **Branch protection en `main` activado** (GitHub ruleset): require PR, linear history, restrict deletions, block force pushes. Todos los cambios de hoy en adelante pasan por PR squashed
- [x] **Env vars en Vercel**: `CRON_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` agregadas a Production y Preview
- [x] **Vercel Analytics + Speed Insights**: ambos enabled. Analytics ya recolectando data (20 visitas en 7 días, mostly Cracker86 admin)
- [x] **Test del cron de retención** via curl: respuesta `{"ok":true,"candidatas":0,...}` — endpoint, auth y service_role todos funcionando

### Marketplace Airbnb-style
- [x] **`PhotoCarousel.js`** reutilizable: scroll-snap horizontal + dot indicators + lazy loading desde la segunda foto + onClick opcional
- [x] **`/propiedades` rediseñado**: cards con foto protagonista (4:3 aspect), heart flotante (favoritos persistidos en `localStorage` con key `rentto_favoritos`), modo chip superpuesto, texto minimalista (nombre + zona + precio bold), tap entera abre detalle. Filtros como pills oscuras. Search bar como pill
- [x] **`/propiedades/[id]` nuevo**: hero gallery cuadrada con carousel + back/share/heart flotantes, título + dirección, precio grande, modo banner, score check con CTA dinámico, meta (corte/ajuste), descripción, requisitos en card warning, **host card con verificación KYC + miembro desde**, sticky bottom action bar con precio + WhatsApp + Vincular (deshabilitado si no calificás)
- [x] **`/vincular?codigo=XYZ`** acepta query param: si llegás desde una propiedad y tenés código válido, autocompletea y pre-busca la propiedad (`Suspense` wrap para Next.js 16)
- [x] **Compartir nativo**: en detalle, `navigator.share()` si está disponible, fallback a `clipboard.writeText()` con alert

### Copy minimalista (toda la app)
- [x] **Principios aplicados**: no repetir lo obvio · headers cortos · CTAs en verbo · eliminar helper text redundante · mensajes de éxito breves
- [x] **Páginas tocadas**: landing (`/`), dashboard, perfil, cobros, vincular, login (signup), inquilinos, perfil/verificar, WaitListForm. Ejemplos: "Aún no estás vinculado a una propiedad" → "Sin propiedad"; "Confirmar vinculación" → "Vincular"; "Enviar para verificación" → "Enviar"; "Tu identidad fue verificada" → "Verificada"; "Historial reciente" → "Historial"

### Wait list para piloto en Caracas
- [x] **`supabase-wait-list.sql`**: tabla `wait_list` con email único, nombre, rol (inquilino/propietario/ambos), ciudad, origen, contactado bool, fecha de contacto, notas admin. RLS: INSERT público (anon+autenticado), SELECT/UPDATE/DELETE solo `es_admin`
- [x] **`WaitListForm.js`** client component con validación de email, selección de rol con 3 botones-pill, manejo de duplicados (UNIQUE) con mensaje amistoso, estado de éxito celebratorio con CTA a `/modos`
- [x] **Landing `/` reposicionado**: hero ahora invita a sumarse al piloto en lugar de "Buscar inmueble" / "Publicar". Botones: `Sumate al piloto` (primary, ancla a `#piloto`) + `Ver cómo funciona` (a `/modos`). Sección con form embebido entre hero y features
- [x] **Panel `/admin/wait-list`** con tabs (por contactar / contactados / todos) con counters, lista con checkbox para marcar contactado, botón mailto pre-rellenado, exportación CSV (BOM UTF-8), borrado con confirmación
- [x] **AdminCard en `/perfil`** ahora con 2 entradas: "Verificaciones por revisar" + "Wait list del piloto", agrupadas en un mismo bloque oscuro

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

### Acciones tuyas (Supabase) — todas al día
- [x] ~~Correr `supabase-notif-prefs.sql`~~ (corrido)
- [x] ~~Correr `supabase-verificaciones.sql`~~ (corrido)
- [x] ~~Correr `supabase-verificaciones-trigger.sql`~~ (corrido)
- [x] ~~Correr `supabase-wait-list.sql`~~ (corrido 14 may)
- [x] ~~Correr `supabase-mensajeria.sql`~~ (corrido 14 may)
- [x] ~~Correr `supabase-metodos-cobro-y-codigo.sql`~~ (corrido 14 may)

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

## 📂 Archivos SQL corridos (todos al día)

1. `supabase-rls.sql` — policies
2. `supabase-score-trigger.sql` — trigger de score
3. `supabase-notificaciones.sql` — inbox
4. `supabase-perfiles-email.sql` — email column
5. `supabase-notif-prefs.sql` — preferencias
6. `supabase-verificaciones.sql` — KYC tabla + bucket + RLS + admin
7. `supabase-verificaciones-trigger.sql` — trigger notif inbox al cambiar estado
8. `supabase-wait-list.sql` — wait list piloto
9. `supabase-mensajeria.sql` — conversaciones + mensajes + RLS + triggers + Realtime
10. `supabase-metodos-cobro-y-codigo.sql` — métodos de cobro + código único por pago + función generadora

## 📂 Archivos clave (14 may)

### Mensajería
- `supabase-mensajeria.sql` — tabla + RLS + 5 triggers + Realtime
- `src/app/lib/conversaciones.js`, `useConversacion.js`
- `src/app/mensajes/page.js`, `mensajes/[id]/page.js`
- `src/app/MessageBubble.js`, `MessageInput.js`, `ThreadCard.js`

### Métodos de cobro + código
- `supabase-metodos-cobro-y-codigo.sql` — tabla + RLS + función + trigger
- `src/app/lib/metodosCobro.js` — catálogo + helpers
- `src/app/metodos-pago/page.js` — CRUD del propietario
- `src/app/pagar/page.js` — carga dinámica + datos copy + código
- `src/app/cobros/page.js` — búsqueda por código

### BCV + formato
- `src/app/api/cron/tasa-bcv/route.js` — regex tolerante + fallback dolarapi.com
- `src/app/lib/format.js` — helpers formatBs/formatUsd/formatTasa
- `src/app/pagar/page.js`, `recibos/page.js`, `cobros/page.js`, `propietario/page.js`

### Otros
- `src/app/TopBar.js` — ícono Mensajes nuevo
- `src/app/propiedades/[id]/page.js` — botón Consultar
- `src/app/api/notificar/route.js` — template `mensaje_recibido`
- `src/app/privacidad/page.js` — sección conversaciones

## 🎯 Próxima sesión — prioridades

### Verificaciones inmediatas (5-30 min — 15 may)
1. **Cron BCV**: después de las 8 AM VE correr en Supabase
   ```sql
   SELECT * FROM tasa_bcv ORDER BY created_at DESC LIMIT 3;
   ```
   Si entra una fila nueva → fix exitoso. Si no → revisar env vars Vercel
2. **Validación end-to-end en producción** (2 cuentas):
   - Cuenta A configura un método de cobro (pago móvil) en /metodos-pago
   - Cuenta A publica una propiedad de prueba
   - Cuenta B la explora → "Consultar" → mensajería interna funciona
   - Cuenta B se vincula con código
   - Cuenta B paga: ve datos del propietario + código `R-XXXXXX`, copia todo, sube comprobante
   - Cuenta A busca por código en /cobros → match instantáneo → confirma
   - Email llega a ambas partes
   Si todo pasa → app lista para invitar piloto

### Críticas para piloto (por impacto)
3. **Plan de piloto en Caracas** — 10 candidatos definidos + guión de outreach + checklist de onboarding. Wait list ya está, faltan los contactos reales
4. **Búsqueda con mapa** en `/propiedades` — geo + filtros visuales. Hoy es lista plana
5. **Sistema de disputas / reportes** — flujo cuando alguien no paga en modo Protegido/Premium
6. **Onboarding del propietario** — wizard de 3 pasos para publicar primera propiedad
7. **Arquitectura de reseñas bidireccionales** — schema + flujo, sin data aún
8. **Fix chico**: trigger `notif_pago_insertado` debería incluir `codigo_rentto` en el cuerpo de la notificación. Hoy solo dice monto/método

### Mejoras post-piloto
9. **Confirmación automática del pago (Fase 2)** — Binance Pay webhook o parsing de emails bancarios
10. **Match biométrico KYC** — face-api.js vs AWS Rekognition. Spike + decisión
11. **Limpiar fotos de prueba** — `supabase-cleanup-fotos-prueba.sql`
12. **Subir fotos reales a las propiedades** y probar carousel en vivo
13. **Probar email real** desde producción a Gmail externo (validar SPF/DKIM/DMARC)
14. **Subir DMARC** a `p=quarantine` cuando lleve 1-2 semanas en `p=none`
15. **Custodia/Escrow real (Escenario 3)** — bloqueado por entidad legal pendiente

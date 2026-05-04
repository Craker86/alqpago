# Estado del Proyecto — Rentto

**Última actualización:** 4 mayo 2026 (KYC Fase 1 — schema + wizard)

## ✅ Completado en sesión 4 may

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
- [ ] Correr `supabase-notif-prefs.sql` (column + helper + triggers actualizados)
- [ ] Correr `supabase-verificaciones.sql` (tabla verificaciones + bucket privado + es_admin + RLS)

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
5. `supabase-notif-prefs.sql` — preferencias (**pendiente**)
6. `supabase-verificaciones.sql` — KYC tabla + bucket + RLS + admin (**pendiente**)

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

1. **KYC Fase 2** — panel `/admin/verificaciones` (lista + revisión lado a lado + aprobar/rechazar con nota) + notificaciones automáticas de aprobación/rechazo
2. **KYC Fase 3** — integración con scoring (+20 pts si aprobada) y bloqueo de modos Protegido/Premium en `/vincular` si no verificado. Badges "Verificado ✓" en cards de inquilinos y propietarios
3. **KYC Fase 4** — página `/privacidad` + cron de retención (borrar imágenes >90 días manteniendo metadatos)
4. **Probar email real** desde producción a Gmail externo (validar SPF/DKIM/DMARC end-to-end)
5. **Plan de piloto** — 10 candidatos en Caracas, agenda de outreach
6. **Subir DMARC** a `p=quarantine` después de 1-2 semanas de monitoreo en `p=none`

# Estado del Proyecto — Rentto

**Última actualización:** 25 abril 2026, fin de sesión

## ✅ Completado en sesión 25 abr

### Producto
- [x] **Validación modo vs score** en `/vincular` y marketplace — bloquea vinculación si score insuficiente, da tips para subir score
- [x] **Trigger de score en Supabase** — auto-registra +7/−10 pts en `score_historial` al cambiar estado de pago
- [x] **UI Historial de pagos** en `/contrato` inquilino — timeline con eventos
- [x] **Página `/modos`** pública para marketing y educación
- [x] **Sistema de notificaciones inbox**:
  - Tabla `notificaciones` con RLS
  - 3 triggers: pago_insertado, pago_cambio_estado, vinculacion_creada
  - Página `/notificaciones` rebuilt como inbox real con marcar leída, navegación por link, formato de fecha relativa
  - Bell del TopBar muestra count de unreads de notificaciones (no más pagos pendientes)
- [x] **Botón quitar foto inline** en `/propietario` para limpiar fotos sucias rápido

### Performance
- [x] `@vercel/analytics` y `@vercel/speed-insights` integrados
- [x] Speed Insights activo en producción · **score 100/100** (P75 de usuarios reales)
- [x] LCP 1.41s, FCP 0.45s, TTFB 0.21s, CLS 0

## ⏳ Pendiente

### Producto
- [ ] Validar el flujo end-to-end de notificaciones automáticas (pago → confirma → notif)
- [ ] Sistema de preferencias de notificaciones (volver a poner los toggles de "qué notif quiero recibir" como sub-página)
- [ ] Limpiar fotos sucias en BD via UI (botón ya existe, falta hacerlo)
- [ ] Limpiar nulls en `propiedades.modo` (UPDATE batch)

### Producción
- [ ] Activar Web Analytics toggle en Vercel UI (separado del package)
- [ ] Expandir "4 Recomendaciones" en Configuración de implementación de Vercel
- [ ] Activar "Implementación de vista previa" en Vercel
- [ ] Comprar dominio propio (rentto.com o rentto.ve)
- [ ] Configurar Resend con dominio custom (mails ya no caen en spam)

### Crecimiento
- [ ] Plan de piloto con 10 propiedades en Caracas (Municipio Sucre)
- [ ] Wait-list / landing de marketing con `/modos` como punto central

## 📋 Decisiones tomadas en esta sesión

- **Score histórico vs score visible:** son dos modelos. `score_historial.score_total` es ledger acumulativo de eventos de pago (+7/−10). El score de la card es 6 criterios escalados a 100. La UI lo aclara con copy
- **Notificaciones INSERT:** sin policy de cliente. Solo los triggers SECURITY DEFINER pueden insertar. Garantía de que un usuario malicioso no puede spamearle notifs a otro
- **Bell del TopBar:** apunta a `/notificaciones` siempre. Antes había lógica condicional de ir a `/propietario#pendientes` si había pagos por confirmar; ahora la fuente única es la tabla `notificaciones`

## 📂 Archivos clave nuevos en esta sesión

- `supabase-score-trigger.sql` — trigger del score
- `supabase-notificaciones.sql` — sistema de inbox completo
- `src/app/lib/scoring.js` — funciones de scoring (ya existía, ahora integrada en /vincular y marketplace)
- `src/app/lib/modos.js` — definición de los 3 modos (ya existía, ahora integrada en validación)
- `src/app/modos/page.js` — landing pública
- `src/app/notificaciones/page.js` — rewrite como inbox

## 🎯 Próxima sesión — prioridades

1. **End-to-end test de notificaciones** — confirmar que el trigger crea notifs reales al hacer pagos y vincular
2. **Activar Web Analytics** en Vercel UI
3. **Expandir 4 Recomendaciones** y atacar las que valen la pena
4. **Dominio propio + Resend** — sale del spam, requiere tu compra

# Estado del Proyecto — Rentto

**Última actualización:** 20 abril 2026, fin de sesión

## ✅ Completado hoy (20 abr)

### Chasis de app autenticada
- [x] TopBar sticky unificada (logo R + rentto + pill VE + 🔔 + avatar con inicial)
- [x] NavBar role-aware con FAB central elevado
  - Inquilino: `Inicio · Explorar · [⊕ Pagar] · Contrato · Perfil`
  - Propietario: `Inicio · Stats · [⊕ Publicar] · Explorar · Perfil`
- [x] layout.js integra TopBar + NavBar, ajuste de padding

### Migraciones al design system
- [x] `/propiedades` (marketplace) — iconos lucide, chips brand, WhatsApp CTA
- [x] `/dashboard` (inquilino) — hero brand-800, quick actions, historial tokenizado
- [x] `/perfil` — avatar brand, menú uniforme con 7 opciones (Datos, Contratos, Métodos, Recibos, Notif, Seguridad, Configuración), CTA propietario condicional, logout danger-tokenizado
- [x] `/contrato` **role-aware**: propietario ve lista de contratos, inquilino ve detalle + score circular

### Command-center del propietario (`/propietario`)
- [x] Hero del mes: `$cobrado / $esperado` con barra de progreso
- [x] Banner accionable de pagos pendientes (ámbar, ancla a sección)
- [x] Quick actions row: Inquilinos · Contratos · Ingresos
- [x] Próximos cobros: top 3 por días restantes al corte
- [x] Pagos pendientes priorizados antes del historial

### Nuevas rutas
- [x] `/inquilinos` — directorio de tenants con cards expandibles (dirección, renta, teléfono, fecha vinculación, WhatsApp + Ver pagos)
- [x] `/estadisticas` — KPIs (total, mes, promedio, ocupación), tendencia 6 meses en barras, ranking top propiedades

### Seguridad cerrada
- [x] `/api/notificar` probado en local (HTTP 200, email entregado)
- [x] Verificado: cero console.log en notificar/route.js
- [x] `docs/` con credenciales reubicado a `C:\Users\Ramig\secretos\rentto-docs\` y gitignoreado
- [x] 7 commits pusheados a origin/main (incluye rotación RESEND_API_KEY)

## ⏳ Pendiente

### Migración de paneles (sigue mañana)
- [ ] `/pagar` (inquilino, formulario de pago)
- [ ] Subpáginas de `/perfil`: datos-personales, metodos-pago, recibos, notificaciones, seguridad, configuracion
- [ ] `/nueva-propiedad`, `/vincular`

### Seguridad
- [ ] Probar `/api/notificar` en producción tras push
- [ ] Decidir si ejecutar git filter-repo para limpiar key vieja del historial

### Features futuras
- [ ] Conectar notificaciones reales (badge con count en TopBar bell)
- [ ] Implementar sistema de scoring del MODELO-NEGOCIO.md
- [ ] Implementar los 3 modos (Básico / Protegido / Premium)
- [ ] Comprar dominio propio (rentto.com o rentto.ve)

## 📋 Decisiones de producto tomadas hoy

- **Patrón bottom nav**: 4 items + FAB central (modelo Mercado Pago / Yape / Bancamiga)
- **Navegación role-aware**: propietario e inquilino ven apps diferentes
- **"Contratos" vive en el menú de perfil**, no en el nav principal (propietario)
- **"Ingresos" e "Inquilinos" quedan como atajos en /propietario**, liberando slots del nav para Stats y Explorar
- **Propietarios ven el marketplace** (`/propiedades` como Explorar) para inteligencia de precios
- **Inquilino expandible en lugar de ruta detalle** — click en card muestra dirección, renta, fecha, teléfono

## 🎯 Próxima sesión

1. Migrar `/pagar` (la última grande del inquilino)
2. Migrar subpáginas de `/perfil` en tanda (datos-personales, metodos-pago, recibos, notificaciones, seguridad, configuracion)
3. Migrar `/nueva-propiedad` y `/vincular`
4. Commit y push
5. Probar `/api/notificar` en producción

## 📂 Archivos clave

- `MODELO-NEGOCIO.md` — estrategia de producto
- `src/app/globals.css` — design tokens (Tailwind v4 @theme)
- `src/app/design-system/page.js` — showcase visual (borrar al final)
- `src/app/TopBar.js` — barra superior unificada
- `src/app/NavBar.js` — bottom nav role-aware con FAB

## 🐛 Bugs conocidos

- Nombre del inquilino hardcodeado en `/dashboard` ("Hola, Jesús")
- Emails de Resend van a spam (requiere dominio propio)
- PWA no se instala correctamente desde teléfono
- Algunas propiedades tienen screenshots de auth pages como "fotos" en la BD (data sucia, limpiar después)
- "Bell" de notificaciones en TopBar sin badge de conteo real todavía

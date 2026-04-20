# Estado del Proyecto — Rentto

**Última actualización:** 20 abril 2026

## ✅ Completado

### Seguridad
- [x] Rotación de RESEND_API_KEY (key comprometida revocada, nueva configurada)
- [x] Migración de key hardcodeada a process.env.RESEND_API_KEY (commit 3784e64)
- [x] `.env.local` creado con la key nueva
- [x] `RESEND_API_KEY` configurada en Vercel + redeploy aplicado
- [x] Contraseña de cuenta actualizada
- [x] Verificado: no hay logs de debug en notificar/route.js
- [x] Endpoint `/api/notificar` probado en local (HTTP 200 + email enviado)

### Design System
- [x] Design system implementado en globals.css (Tailwind v4 con @theme)
- [x] Paleta brand 50-900 (verde bosque), tipografía Geist
- [x] Componentes base: buttons, pills, cards, inputs, stats, progress bar
- [x] 5 radios y 3 niveles de sombra definidos
- [x] Bottom nav con iconos Lucide
- [x] Showcase funcional en /design-system

### Migración de pantallas — Ronda 1
- [x] Landing (page.js) migrada: hero minimalista + features + cómo funciona + footer
- [x] Login (login/page.js) rehecho con tabs + OAuth visual + selector de rol (commit f28848d)
- [ ] Marketplace (propiedades/page.js) — **PRÓXIMO**

## 📋 Decisiones de producto tomadas

- **Slogan oficial:** "La forma inteligente de alquilar en Venezuela"
- **Modelo de negocio:** Facilitador + Garante simultáneo (3 modos: Básico / Protegido / Premium)
- **Marketplace:** Grid cards, scroll infinito, filtros en chips, badge de modo Rentto
- **Login:** Tabs sesión/registro, OAuth social (botones visuales), rol al registrarse

## ⏳ Pendiente cierre de seguridad

- [ ] Probar endpoint /api/notificar en producción tras el push
- [ ] Decidir si ejecutar git filter-repo para limpiar historial con la key vieja

## 🎯 Próximos pasos (en orden)

1. Migrar marketplace (propiedades/page.js)
2. Probar emails en producción tras push
3. Migrar Ronda 2: dashboard inquilino, panel propietario, pagar, contrato
4. Migrar Ronda 3: perfil y subpáginas
5. Comprar dominio propio (rentto.com o rentto.ve) + configurar Resend con dominio
6. Implementar sistema de scoring y modos del modelo de negocio

## 📂 Archivos clave

- `MODELO-NEGOCIO.md` — estrategia de producto
- `src/app/globals.css` — design tokens
- `src/app/design-system/page.js` — showcase visual (borrar al final)
- `src/app/layout.js` — Geist cargado globalmente

## 🐛 Bugs conocidos aún sin resolver

- Nombre del inquilino hardcodeado en dashboard
- Navegación no diferenciada por rol (inquilino ve opciones de propietario y viceversa)
- Emails de Resend van a spam (requiere dominio propio)
- PWA no se instala correctamente desde teléfono

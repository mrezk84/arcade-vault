# SPEC 03 — Envío real de correo en el formulario de Contacto (Resend)

> **Status:** Aprobado
> **Depends on:** SPEC 02
> **Date:** 2026-09-17
> **Objective:** Conectar el formulario de contacto de `/about` (ya migrado del template en spec 02) a un envío real de correo vía Resend, manteniendo exactamente la UI/UX del template en `references/templates/home-about/about.jsx`.

## Scope

**In:**

- Nuevo Route Handler `app/api/contact/route.ts` (`POST`) que recibe `{ name, email, msg }`, valida los campos en el servidor y envía el correo usando el SDK `resend`.
- Correo enviado a `mrezk84@gmail.com` (fijo, hardcodeado como destinatario), con asunto fijo `"Nuevo mensaje de contacto — Arcade Vault"`, cuerpo con nombre/correo/mensaje del formulario, y header `Reply-To` seteado al correo ingresado por el usuario.
- Remitente vía sandbox de Resend (`onboarding@resend.dev`) — sin dominio propio verificado por ahora.
- `app/about/page.tsx` actualizado: el `onSubmit` del formulario pasa de simular el envío a hacer `fetch("/api/contact", ...)` real contra el nuevo endpoint.
- Nuevo estado `status` (`"idle" | "sending" | "sent" | "error"`) en el formulario para reflejar la llamada real:
  - `sending`: la terminal muestra las líneas `[OK] Conectando con servidor…`, `[OK] Validando contenido…`, `[OK] Transmitiendo paquete…` progresivamente mientras se espera la respuesta del fetch (en vez de aparecer todas de una junto con el éxito, como en el template original).
  - `sent`: mismo bloque de éxito del template (`MENSAJE RECIBIDO...`) una vez que el `fetch` resuelve OK.
  - `error`: la terminal muestra una línea adicional `[ERROR] No se pudo enviar el mensaje.` en lugar de la línea de éxito, y un botón "REINTENTAR" que vuelve a intentar el envío sin perder lo escrito en el formulario.
- Dependencia `resend` agregada a `package.json`.
- `RESEND_API_KEY` leída desde variable de entorno del servidor (`.env.local`, no versionado — ya cubierto por `.env*` en `.gitignore`).
- Archivo `.env.local.example` con `RESEND_API_KEY=` como referencia (sin valor real).
- Validación de campos vacíos y de formato de correo (regex simple) tanto en el cliente (ya existe, dispara el "shake") como en el servidor (el Route Handler responde 400 si falta algún campo o el correo no tiene formato válido).

**Out of scope (para futuros specs):**

- Dominio propio verificado en Resend (remitente sigue siendo `onboarding@resend.dev`).
- Persistencia de los mensajes de contacto en base de datos (el correo es el único registro).
- Rate limiting / protección anti-spam (captcha, límite de envíos por IP, etc.).
- Plantillas de correo con HTML/diseño propio (el cuerpo del correo es texto plano simple).
- Notificaciones adicionales (Slack, webhook, etc.) al recibir un mensaje.
- Internacionalización.

## Data model

Esta spec no introduce modelos de datos persistentes nuevos (no hay base de datos). Estructuras nuevas, solo de request/response del endpoint:

```ts
// app/api/contact/route.ts
type ContactPayload = { name: string; email: string; msg: string };
// POST /api/contact
// 200 -> { ok: true }
// 400 -> { ok: false, error: string }  // validación fallida
// 502 -> { ok: false, error: string }  // falla al llamar a Resend
```

```ts
// app/about/page.tsx — nuevo estado del formulario
type ContactStatus = "idle" | "sending" | "sent" | "error";
```

## Implementation plan

1. Instalar la dependencia `resend` (`npm install resend`) y crear `.env.local.example` con `RESEND_API_KEY=`.
2. Antes de tocar código de rutas, leer `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` (Route Handlers en Next 16) para confirmar la convención vigente de `app/api/*/route.ts`, tal como exige `AGENTS.md`.
3. Crear `app/api/contact/route.ts` con el `POST` handler: valida `name`/`email`/`msg` no vacíos y formato de `email`, instancia `new Resend(process.env.RESEND_API_KEY)`, envía el correo a `mrezk84@gmail.com` con `replyTo` al correo del formulario, y devuelve `{ ok: true }` o el error correspondiente con el status HTTP adecuado.
4. Actualizar `app/about/page.tsx`: reemplazar el `useState<string | null>(null)` de `sent` por el nuevo `status: ContactStatus`, y el `onSubmit` por una función async que valida campos vacíos (igual que hoy, dispara `shake`), pasa a `status: "sending"`, hace `fetch("/api/contact", { method: "POST", body: JSON.stringify(form) })`, y setea `status` a `"sent"` o `"error"` según la respuesta.
5. Actualizar el bloque `terminal-success` del JSX para reflejar las tres variantes (`sending` con líneas progresivas, `sent` con el mensaje de éxito actual, `error` con la línea `[ERROR]` y el botón "REINTENTAR" que vuelve a llamar al mismo `onSubmit` sin resetear `form`).
6. Verificar manualmente con una `RESEND_API_KEY` real (el usuario la genera y la coloca en `.env.local`) que un envío completo llega a `mrezk84@gmail.com` con `Reply-To` correcto.

## Acceptance criteria

- [ ] Enviar el formulario en `/about` con algún campo vacío sigue dispando la animación de "shake" y no llama al endpoint.
- [ ] Enviar el formulario con los tres campos completos hace `POST /api/contact` y, mientras espera respuesta, la terminal muestra las líneas de progreso (`Conectando…`, `Validando…`, `Transmitiendo…`) antes del resultado final.
- [ ] Un envío exitoso muestra el bloque de éxito original del template (`MENSAJE RECIBIDO...` con el nombre en mayúsculas) y llega un correo real a `mrezk84@gmail.com` con asunto `"Nuevo mensaje de contacto — Arcade Vault"`, el nombre/correo/mensaje del formulario en el cuerpo, y `Reply-To` igual al correo ingresado.
- [ ] Si `RESEND_API_KEY` falta, es inválida, o Resend responde con error, la terminal muestra la línea `[ERROR] No se pudo enviar el mensaje.` y un botón "REINTENTAR" en vez del bloque de éxito.
- [ ] Presionar "REINTENTAR" vuelve a intentar el envío con los mismos datos del formulario (no los borra).
- [ ] El botón "ENVIAR OTRO MENSAJE" (tras un envío exitoso) sigue reiniciando el formulario a su estado vacío, igual que en spec 02.
- [ ] `POST /api/contact` con un campo vacío o un correo con formato inválido responde `400` sin intentar llamar a Resend.
- [ ] `npm run build` compila sin errores de TypeScript ni de ESLint.

## Decisions

- **Sí:** Route Handler (`app/api/contact/route.ts`) en vez de Server Action. El formulario ya maneja estados de carga/error personalizados (animación de terminal); un `fetch` explícito hace ese control de estados más directo que una Server Action. Decisión explícita del usuario.
- **Sí:** sandbox de Resend (`onboarding@resend.dev`) como remitente por ahora, sin dominio propio verificado. Decisión explícita del usuario; se puede migrar a dominio propio en otra spec sin cambiar la forma del endpoint.
- **Sí:** destinatario fijo `mrezk84@gmail.com`, hardcodeado en el Route Handler (no configurable desde el cliente). Decisión explícita del usuario.
- **Sí:** `Reply-To` seteado al correo del formulario, para poder responder directamente al remitente desde el cliente de correo.
- **Sí:** `RESEND_API_KEY` vía `.env.local` (no versionado, ya cubierto por `.env*` en `.gitignore`) más un `.env.local.example` documentando la variable. El usuario generará la key después de esta spec.
- **Sí:** terminal con líneas de progreso reales durante el `fetch`, en vez de un spinner genérico, para mantener la estética del template mientras refleja la llamada real. Decisión explícita del usuario.
- **Sí:** manejo de error con línea `[ERROR]` + botón "REINTENTAR" dentro de la misma terminal, en vez de descartarla y mostrar un mensaje de error genérico. Decisión explícita del usuario.
- **No:** persistencia de mensajes en base de datos — el correo es el único registro, consistente con que el proyecto no tiene backend/DB real todavía (spec 01, spec 02).
- **No:** rate limiting o anti-spam — fuera de alcance, se evalúa si se vuelve un problema real.
- **No:** dominio propio verificado en Resend — se hace en otra spec cuando exista un dominio para el proyecto.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| El sandbox de Resend (`onboarding@resend.dev`) solo puede enviar al correo verificado del dueño de la cuenta de Resend. | Ya coincide con el destinatario fijo (`mrezk84@gmail.com`), así que no bloquea esta spec; documentado como limitación a resolver si se agrega un dominio propio. |
| `RESEND_API_KEY` ausente o inválida en el entorno de desarrollo/producción. | El Route Handler valida su presencia antes de llamar a Resend y responde con el estado `error`, que el formulario ya sabe mostrar (línea `[ERROR]` + "REINTENTAR"). |
| Cambios de convención en Route Handlers entre versiones de Next.js (proyecto pinneado a Next 16 con breaking changes). | Paso 2 del plan de implementación exige leer la guía correspondiente en `node_modules/next/dist/docs/` antes de escribir el handler. |

## What is **not** in this spec

- Dominio propio verificado en Resend.
- Persistencia de mensajes de contacto en base de datos.
- Rate limiting / protección anti-spam.
- Plantillas de correo con diseño HTML propio.
- Notificaciones adicionales (Slack, webhooks, etc.).
- Internacionalización.

Cada uno de estos, si se implementa, va en su propio spec.

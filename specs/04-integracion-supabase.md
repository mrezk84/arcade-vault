# SPEC 04 — Integración base con Supabase

> **Status:** Implementado
> **Depends on:** SPEC 03
> **Date:** 2026-09-30
> **Objective:** Dejar Supabase integrado en la app Next.js (paquetes, clientes de browser y servidor, variables de entorno y un endpoint de verificación) para que los specs futuros de Auth, base de datos, Realtime y Edge Functions partan de una base lista.

## Why this spec exists

Supabase va a ser el backend del proyecto (DB, Auth y, más adelante, Realtime y Edge Functions). En vez de mezclar la integración con la primera funcionalidad real, este spec la aísla: los specs siguientes solo importan los clientes y se concentran en su propio dominio.

## Scope

**In:**

- Dependencias `@supabase/supabase-js` y `@supabase/ssr` agregadas a `package.json`.
- `lib/supabase/client.ts`: cliente para el navegador (`createBrowserClient`), para Client Components.
- `lib/supabase/server.ts`: cliente para el servidor (`createServerClient`, con las cookies de Next.js), para Server Components y Route Handlers.
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, leídas desde `.env.local` (no versionado).
- `.env.template` actualizado: agrega las dos variables nuevas (sin valores reales) y corrige el typo `SUPRABASE_DB_PASSWORD` → `SUPABASE_DB_PASSWORD`.
- Route Handler `app/api/health/supabase/route.ts` (`GET`) que instancia el cliente de servidor, hace una petición trivial a Supabase (`GET {URL}/auth/v1/health` con la publishable key) y responde el estado de la conexión.
- Sin acceso a tablas propias: la verificación no depende de ningún esquema.

**Out of scope (para futuros specs):**

- Supabase Auth: login, registro, invitado, sesión en el Nav y reemplazo del `/auth` mock.
- `proxy.ts` de Next.js para refrescar la sesión (se agrega en el spec de Auth, donde tiene utilidad).
- Tablas, migraciones, RLS y `supabase/migrations/` (perfiles de usuario, puntuaciones, progreso en juegos, catálogo de juegos).
- Realtime (suscripciones en vivo).
- Edge Functions.
- `SUPABASE_SERVICE_ROLE_KEY` y cualquier uso de privilegios elevados.
- Tipos TypeScript generados desde el esquema (no hay esquema todavía).
- Supabase CLI y entorno local (`supabase init`, `supabase start`).

## Data model

Este spec no introduce estructuras de datos persistentes ni tablas. Solo define variables de entorno y la forma de respuesta del endpoint de verificación:

```ts
// Variables de entorno (.env.local)
// NEXT_PUBLIC_SUPABASE_URL=https://<project_ref>.supabase.co
// NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>

// GET /api/health/supabase
// 200 -> { ok: true }
// 500 -> { ok: false, error: string }  // variables ausentes o Supabase no responde OK
```

## Implementation plan

1. Leer `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` y `.../05-server-and-client-components.md`, y la guía de cookies en `node_modules/next/dist/docs/`, tal como exige `AGENTS.md` (Next 16 tiene breaking changes, por ejemplo `cookies()` asíncrono).
2. Instalar `@supabase/supabase-js` y `@supabase/ssr` (`npm install`).
3. Obtener la URL del proyecto y la publishable key (MCP de Supabase: `get_project_url` y `get_publishable_keys`), colocarlas en `.env.local` y actualizar `.env.template` con las variables nuevas sin valores reales, corrigiendo el typo de `SUPABASE_DB_PASSWORD`.
4. Crear `lib/supabase/client.ts` exportando una función que devuelve el cliente de browser. Si falta una variable de entorno, lanza un error explícito.
5. Crear `lib/supabase/server.ts` exportando una función async que devuelve el cliente de servidor, conectado a las cookies de Next.js. Si falta una variable de entorno, lanza un error explícito.
6. Crear `app/api/health/supabase/route.ts` con el `GET`: instancia el cliente de servidor, hace la petición a `/auth/v1/health` y responde `{ ok: true }` (200) o `{ ok: false, error }` (500).
7. Verificar manualmente con `npm run dev`: abrir `/api/health/supabase` y comprobar la respuesta.

## Acceptance criteria

- [x] `package.json` incluye `@supabase/supabase-js` y `@supabase/ssr`.
- [x] Existen `lib/supabase/client.ts` y `lib/supabase/server.ts`, y cada uno exporta una función que devuelve un cliente de Supabase.
- [x] Con `.env.local` correcto, `GET /api/health/supabase` responde `200` con `{ "ok": true }`.
- [x] Sin `NEXT_PUBLIC_SUPABASE_URL` o sin `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `GET /api/health/supabase` responde `500` con `{ "ok": false, "error": "<mensaje>" }`.
- [x] `.env.template` lista `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sin valores reales, y ya no contiene `SUPRABASE_DB_PASSWORD`.
- [x] `.env.local` sigue sin versionarse (`git status` no lo lista).
- [x] Ningún archivo versionado contiene la publishable key, la contraseña de la DB ni `service_role`.
- [x] El cliente de browser se puede importar desde un Client Component y el de servidor desde un Server Component sin errores de compilación.
- [x] `npm run build` compila sin errores de TypeScript ni de ESLint.

## Decisions

- **Sí:** `@supabase/ssr` además de `supabase-js`. Maneja las cookies de sesión en SSR, lo que necesitará el spec de Auth; instalarlo ahora evita refactorizar los clientes después.
- **Sí:** clientes separados `client.ts` y `server.ts` en `lib/supabase/`. Los Client Components y el servidor acceden a Supabase de forma distinta.
- **Sí:** solo la publishable key con `NEXT_PUBLIC_*`. La seguridad recae en RLS, que se define en los specs con tablas.
- **Sí:** endpoint `GET /api/health/supabase` como verificación. Comprueba la conexión real sin exigir ninguna tabla.
- **Sí:** corregir el typo `SUPRABASE_DB_PASSWORD` en `.env.template` mientras se edita ese archivo. Decisión del usuario al aceptar las recomendaciones.
- **No:** `proxy.ts` en este spec. Sin Auth no hay sesión que refrescar; se agrega en el spec de Auth.
- **No:** `service_role` en la app. Se evalúa en el spec que lo requiera (por ejemplo, Edge Functions).
- **No:** tablas, migraciones ni Auth. El usuario definió que perfiles, puntuaciones y progreso son specs posteriores.
- **No:** Supabase CLI ni entorno local. El proyecto usa el proyecto remoto y el MCP ya configurado en `.mcp.json`.

## Risks

| Riesgo                                                                                     | Mitigación                                                                                                         |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Filtrar la publishable key, la contraseña de la DB o `service_role` en git.                | `.env*` ya está en `.gitignore` (solo `.env.template` se versiona, sin valores). Criterio de aceptación explícito. |
| Breaking changes de Next 16 en `cookies()` y en Route Handlers.                            | El paso 1 exige leer la guía en `node_modules/next/dist/docs/` antes de escribir el código.                        |
| `@supabase/ssr` cambia su API entre versiones (p. ej. nombres de las opciones de cookies). | Consultar la documentación vigente (MCP `search_docs` de Supabase) antes del paso 4 y 5.                           |
| El health check da falso positivo si solo prueba que las variables existen.                | Hace una petición HTTP real a `/auth/v1/health` y responde 500 si no recibe OK.                                    |

## What is **not** in this spec

- Supabase Auth (login, registro, invitado, sesión en el Nav).
- `proxy.ts` para refrescar la sesión.
- Tablas, migraciones y RLS (perfiles, puntuaciones, progreso, catálogo de juegos).
- Realtime.
- Edge Functions.
- `service_role`.
- Tipos generados, Supabase CLI y entorno local.

Cada uno de estos, si se implementa, va en su propio spec.

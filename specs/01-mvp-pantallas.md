# SPEC 01 — MVP visual de Arcade Vault (pantallas del prototipo)

> **Status:** Implementado
> **Depends on:** ninguno
> **Date:** 2026-09-15
> **Objective:** Portar a Next.js App Router las 5 pantallas visuales del prototipo en `references/templates/` (Biblioteca, Detalle, Reproductor, Salón de la Fama y Auth), con datos ficticios centralizados y sesión/puntajes mock en localStorage, sin implementar la lógica real de ningún juego.

## Scope

**In:**

- Rutas reales de App Router: `/` (Biblioteca), `/juegos/[id]` (Detalle), `/juegos/[id]/jugar` (Reproductor), `/salon-de-la-fama` (Salón de la Fama), `/auth` (Auth).
- Nav global (en `app/layout.tsx`) con estado activo según la ruta actual, menú móvil hamburguesa y estado de sesión, migrado desde `nav.jsx`.
- `app/data.ts` con los datos ficticios migrados desde `data.jsx` (`GAMES`, `CATS`, `PLAYERS`, `seededScores`), como placeholder explícito hasta que exista una base de datos real.
- Sesión mock (iniciar sesión, crear cuenta, invitado, cerrar sesión) persistida en `localStorage` bajo la clave `av_user`, migrada desde `auth.jsx` + `app.jsx`.
- Guardado de puntaje mock persistido en `localStorage` bajo la clave `av_scores` desde el modal de fin de partida del Reproductor, reflejado como "tu mejor marca" en el Salón de la Fama cuando exista un puntaje guardado para ese juego y ese usuario.
- Reproductor copiado tal cual el comportamiento decorativo de `reproductor.jsx` (puntaje que sube solo por temporizador, HUD, pausa, animaciones CSS de nave/enemigos, modal de fin de partida) como placeholder mientras se implementan los juegos reales.
- Reutilización de los estilos ya migrados en `app/globals.css`; ajustes puntuales con Tailwind donde falte algo.

**Out of scope (para futuros specs):**

- Lógica real de cualquier juego (Bloque Buster, Caída, Serpentina, Glotón, Invasores, Rocas, Ranaria, Duelo Pixel).
- Backend, API o base de datos real (se simulan con `app/data.ts` y `localStorage`).
- Autenticación real (OAuth con Google/GitHub, verificación de contraseña, etc.) — los botones sociales quedan solo visuales.
- Sistema de créditos/monedas funcional (el contador "CRÉDITOS · 03" del Nav sigue siendo decorativo).
- Pruebas automatizadas (no hay test runner configurado en el proyecto).
- Internacionalización — todo permanece en español, igual que el prototipo.

## Data model

```ts
// app/data.ts
export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string; // clase CSS de portada, ej. "cover-bricks"
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;
};

export const GAMES: Game[]; // los 8 juegos migrados de data.jsx, sin cambios
export const CATS: string[]; // ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]
export const PLAYERS: string[];

export type ScoreRow = { rank: number; name: string; score: number; date: string };
export function seededScores(seed: number, count?: number): ScoreRow[];
```

```ts
// components/session-provider.tsx — estado de sesión y puntajes en localStorage
type User = { name: string } | null;
type SavedScore = { game: string; score: number; name: string; at: number };

// localStorage["av_user"]   -> User (JSON) | ausente
// localStorage["av_scores"] -> SavedScore[] (JSON) | ausente

function useSession(): {
  user: User;
  login: (u: User) => void;
  logout: () => void;
  saveScore: (entry: { game: string; score: number; name: string }) => void;
  bestScoreFor: (gameId: string) => SavedScore | null; // mejor puntaje guardado del usuario actual para ese juego
};
```

Diferencia deliberada con el prototipo: en `salon.jsx`, la fila "tu mejor marca" usa un valor inventado (`rows[5]?.score - 2400`) que siempre aparece si hay sesión. Aquí, esa fila usa el puntaje real de `bestScoreFor(gameId)` y **no se muestra** si el usuario no tiene ningún puntaje guardado para el juego seleccionado.

## Implementation plan

1. Crear `app/data.ts` migrando `GAMES`, `CATS`, `PLAYERS` y `seededScores` desde `references/templates/data.jsx`, tipados en TypeScript.
2. Crear `components/session-provider.tsx` con el contexto de sesión y puntajes (`useSession`), leyendo/escribiendo `av_user` y `av_scores` en `localStorage`; envolver `{children}` con él en `app/layout.tsx`.
3. Crear `components/nav.tsx` (`"use client"`) migrando `nav.jsx`: usar `next/link` y `usePathname()` para el estado activo, y `useSession()` para mostrar el nombre de usuario o el botón "Iniciar sesión"/"Cerrar sesión". Insertarlo en `app/layout.tsx` junto con el footer ya definido en `app.jsx`.
4. Reemplazar el contenido de `app/page.tsx` por la pantalla Biblioteca, migrando `biblioteca.jsx` (buscador, chips de categoría, grid de tarjetas con `GameCard`, que navegan con `Link` a `/juegos/[id]`).
5. Crear `app/juegos/[id]/page.tsx` migrando `detalle.jsx` (info del juego + tabla de mejores puntuaciones vía `seededScores`); usar `notFound()` de `next/navigation` si el `id` no existe en `GAMES`.
6. Crear `app/juegos/[id]/jugar/page.tsx` (`"use client"`) migrando `reproductor.jsx` tal cual (HUD, temporizador de puntaje, pausa, animaciones CSS, modal de fin de partida), conectando el guardado del modal a `saveScore()` de `useSession()`; `notFound()` si el `id` no existe.
7. Crear `app/salon-de-la-fama/page.tsx` (`"use client"`) migrando `salon.jsx` (tabs por juego, podio, tabla), sustituyendo la fila "tu mejor marca" por el resultado real de `bestScoreFor(tab)` y ocultándola si es `null`.
8. Crear `app/auth/page.tsx` (`"use client"`) migrando `auth.jsx` (tabs iniciar sesión/crear cuenta, invitado), llamando a `login()` de `useSession()` y redirigiendo a `/` con `useRouter().push("/")`.
9. Revisar `app/globals.css` contra las clases usadas por las pantallas migradas y agregar solo las que falten (la mayoría ya está migrada según lo confirmado).

## Acceptance criteria

- [ ] `/` muestra la Biblioteca con buscador y filtro de categorías funcionando sobre `GAMES` de `app/data.ts`.
- [ ] Cada tarjeta de juego en la Biblioteca navega a `/juegos/[id]` al hacer click.
- [ ] `/juegos/[id]` muestra la info del juego y una tabla de mejores puntuaciones generada con `seededScores`.
- [ ] Visitar `/juegos/algo-inexistente` muestra la página 404 de Next.js.
- [ ] El botón "JUGAR AHORA" en Detalle navega a `/juegos/[id]/jugar`.
- [ ] `/juegos/[id]/jugar` muestra el HUD y el marco CRT con animación decorativa, y el puntaje sube automáticamente mientras no esté en pausa ni terminado.
- [ ] El botón "PAUSA"/"REANUDAR" detiene y reanuda el incremento de puntaje.
- [ ] El botón "FIN" abre el modal de fin de partida con el puntaje final alcanzado.
- [ ] Guardar la puntuación desde el modal persiste en `localStorage` (`av_scores`) y muestra el toast de confirmación.
- [ ] `/salon-de-la-fama` muestra el podio y la tabla del juego seleccionado, cambiando con las tabs.
- [ ] Si hay sesión iniciada y existe un puntaje guardado para el juego seleccionado, se muestra la fila "tu mejor marca" con ese puntaje real.
- [ ] Si hay sesión iniciada pero no hay puntaje guardado para ese juego, la fila "tu mejor marca" no aparece.
- [ ] `/auth` permite iniciar sesión, crear cuenta o entrar como invitado, y redirige a `/` tras cualquiera de las tres opciones.
- [ ] Iniciar sesión persiste en `localStorage` (`av_user`) y el Nav muestra el nombre de usuario tras recargar la página.
- [ ] Cerrar sesión desde el Nav borra `av_user` y vuelve a mostrar "Iniciar sesión".
- [ ] El Nav resalta la sección activa según la ruta actual, incluyendo cuando se está en Detalle o Reproductor (se resalta "Biblioteca").
- [ ] `npm run build` compila sin errores de TypeScript ni de ESLint.

## Decisions

- **Sí:** rutas reales de Next.js App Router (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/salon-de-la-fama`, `/auth`) en vez del hash-routing de `app.jsx`. Da URLs compartibles y sigue las convenciones de Next 16 exigidas por `AGENTS.md`.
- **Sí:** sesión y puntajes mock funcionales con `localStorage` (`av_user`, `av_scores`), igual que el prototipo. Confirmado por el usuario para que el Reproductor (que depende de `user` y `onSaveScore`) tenga sentido tal como está copiado.
- **Sí:** Reproductor copiado igual que el prototipo (puntaje decorativo que sube solo). Decisión explícita del usuario: es un placeholder temporal hasta que se implementen las pantallas de los juegos reales.
- **Sí:** un solo archivo `app/data.ts` para los datos ficticios, en vez de una carpeta con varios archivos. El usuario indicó que eventualmente esto vendrá de una base de datos, así que se mantiene centralizado y fácil de reemplazar después.
- **Sí:** la fila "tu mejor marca" del Salón de la Fama usa el puntaje real guardado por el usuario (vía `bestScoreFor`) y se oculta si no existe, en vez del valor inventado del prototipo (`rows[5]?.score - 2400`) que siempre aparecía. Más honesto ahora que el guardado de puntaje es real.
- **No:** implementar lógica real de ningún juego. Excluido explícitamente por el usuario en el pedido inicial.
- **No:** backend, base de datos o autenticación real. Todo el estado es mock de frontend (localStorage), documentado como temporal en `app/data.ts` y `session-provider.tsx`.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| `localStorage` deshabilitado (modo privado del navegador) | La sesión y los puntajes simplemente no persisten entre recargas; la app sigue funcionando sin errores (fallback a `null`/vacío). |
| Los datos ficticios de `app/data.ts` eventualmente serán reemplazados por una base de datos real | Mantenerlos aislados en ese único archivo facilita el swap futuro sin tocar las pantallas. |

## What is **not** in this spec

- Lógica real de ningún juego (Bloque Buster, Caída, Serpentina, Glotón, Invasores, Rocas, Ranaria, Duelo Pixel).
- Backend, API o base de datos real.
- Autenticación real (OAuth, verificación de contraseña).
- Sistema de créditos/monedas funcional.
- Pruebas automatizadas.
- Internacionalización / cambio de idioma.

Cada uno de estos, si se implementa, va en su propio spec.

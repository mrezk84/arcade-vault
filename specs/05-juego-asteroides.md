# SPEC 05 — Juego Asteroids como juego nuevo, con montaje genérico por juego

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-09-30
> **Objective:** Agregar al catálogo un juego nuevo con id `asteroids` (portado a TypeScript desde `references/started-games/02-asteroids/`), que vive dentro de su `<canvas>`, es pausado por el contenedor de la app y notifica a React puntaje, vidas, nivel y fin de partida, mediante un mecanismo genérico que mantiene cada juego aislado.

## Why this spec exists

Es el primer juego real de la plataforma. El SPEC 01 dejó el reproductor con un puntaje falso por temporizador y una ruta genérica `/juegos/[id]/jugar`. Este spec no hace un caso especial para un juego: define el contrato que cumplirán todos los juegos (el juego vive en su canvas, la app lo controla y el juego notifica sus cambios de estado) y un registro que asocia cada id con su componente.

`asteroids` no es `rocas`. En `app/data.ts` ya existe `rocas` (placeholder con una descripción parecida); son juegos distintos, con ids, datos y código separados. Este spec no toca `rocas`.

El juego de referencia usa globals, `window` y `document`, lo que choca con React (doble montaje en desarrollo, listeners sin limpiar), por eso se porta en vez de incrustarse tal cual.

## Scope

**In:**

- Nueva entrada en `GAMES` (`app/data.ts`) con `id: "asteroids"`, título `ASTEROIDS`, categoría `SHOOTER`, y una clase de portada nueva `cover-asteroids` en `app/globals.css`. La entrada `rocas` no se modifica.
- Port a TypeScript de `references/started-games/02-asteroids/game.js` a `lib/games/asteroids/`, conservando el gameplay: nave con rotación, empuje e inercia, disparo, asteroides de tamaños 3/2/1 que se parten, partículas, 3 vidas, invencibilidad de 3 s al reaparecer, mundo toroidal, niveles con `3 + level` asteroides y power-up de disparo triple (`3x`). Las constantes de balance se copian sin cambios.
- **El juego vive dentro del canvas:** todo su estado y su bucle (`requestAnimationFrame`, input, física, colisiones y dibujo) están en el motor, que solo conoce el `<canvas>` que recibe. No depende de React.
- **La app controla el juego:** `GamePlayer` (el contenedor ya dibujado con HUD, PAUSA, FIN y modal) decide cuándo se pausa, reanuda, reinicia o termina el juego, llamando a los métodos que el motor expone.
- **El canvas notifica a React** cada cambio de estado mediante callbacks: puntaje, vidas, nivel y fin de partida. Los callbacks se invocan solo cuando el valor cambia.
- Contrato genérico de juego en `lib/games/types.ts` (`GameCallbacks`, `GameController`, `GameMount`) que cualquier juego futuro debe cumplir.
- Registro `lib/games/registry.ts`: `Record<string, GameMount>` que asocia el id del juego con su componente cliente. Solo contiene `asteroids` por ahora. `GamePlayer` busca el id en el registro: si existe, renderiza ese juego; si no, conserva el placeholder de siempre. No hay ninguna condición `if (game.id === ...)` en `GamePlayer`.
- Componente cliente `components/games/asteroids/asteroids-game.tsx` que monta el canvas, crea el motor en un `useEffect` y lo destruye al desmontar.
- Ruta: se reutiliza la ruta genérica existente `/juegos/[id]/jugar`. El juego queda en `/juegos/asteroids/jugar`. No se crea ninguna ruta específica por juego.
- Aislamiento por carpetas: cada juego vive en `lib/games/<id>/` (lógica) y `components/games/<id>/` (montaje). Nada de `asteroids` se importa fuera de esas carpetas y del registro.
- Integración con la plataforma: el HUD superior muestra los valores reales; PAUSA/REANUDAR pausa el motor; FIN termina la partida; el modal "FIN DEL JUEGO" aparece cuando el motor notifica el fin; "GUARDAR PUNTUACIÓN" usa `saveScore` con `game: "asteroids"`; "JUGAR DE NUEVO" reinicia el motor.
- Teclado: `←` `→` rotan, `↑` propulsa, `Espacio` dispara, atendidos por el juego. La pausa por teclado (`P` y `Esc`) la atiende `GamePlayer`, no el juego. El juego evita el scroll de la página con las flechas y `Espacio` mientras está activo.
- Canvas lógico de 800×600 escalado por CSS al ancho disponible, en proporción 4:3, dentro de `.crt-screen`.
- **El juego conserva su HUD y sus controles propios** dentro del canvas, tal como en el original: `SCORE`, `NIVEL`, iconos de vidas, el indicador `3x  N.Ns` del power-up activo y el overlay `GAME OVER`. No se borra nada. La plataforma tiene además su propio HUD; ambos se muestran a la vez y muestran los mismos valores, porque el HUD de la app se alimenta de los callbacks del juego (única fuente de verdad: el motor).
- Los controles de teclado los maneja el propio juego (`keys` y `justPressed` dentro del motor). Única excepción respecto del original: `Espacio` ya no reinicia desde la pantalla `GAME OVER`, porque el reinicio lo ofrece el modal de la app ("JUGAR DE NUEVO").

**Out of scope (para futuros specs):**

- Modificar el juego `rocas` o su entrada en el catálogo.
- Controles táctiles o para móvil (la etiqueta "TECLADO / TÁCTIL" de la ficha es fija para todos los juegos y no se toca).
- OVNIs, sonido, música, jefes u otros power-ups.
- Rediseño visual del juego a la paleta neón (se mantiene el estilo vectorial blanco sobre negro del original).
- Ranking global real y guardado en Supabase (los puntajes siguen en `localStorage["av_scores"]`).
- Convertir los otros juegos del catálogo.
- Pruebas automatizadas (no hay test runner).
- Modificar o borrar `references/started-games/02-asteroids/`.

## Data model

Este spec no introduce datos persistentes nuevos: los puntajes reutilizan `SavedScore` del SPEC 01 con `game: "asteroids"`. Define el contrato genérico entre cualquier juego y la app:

```ts
// lib/games/types.ts
export type GameCallbacks = {
  onScore: (score: number) => void; // canvas -> React, cuando cambia el puntaje
  onLives: (lives: number) => void; // canvas -> React, cuando cambian las vidas
  onLevel: (level: number) => void; // canvas -> React, cuando cambia el nivel
  onGameOver: (finalScore: number) => void; // canvas -> React, una sola vez por partida
};

export type GameController = {
  pause: () => void; // React -> canvas
  resume: () => void;
  restart: () => void; // score=0, lives=3, level=1
  end: () => void; // termina la partida y dispara onGameOver
  destroy: () => void; // cancela el loop y quita listeners
};

// Componente de montaje que cada juego registra
export type GameMountProps = {
  callbacks: GameCallbacks;
  onReady: (controller: GameController) => void; // entrega el controlador a GamePlayer
};
export type GameMount = React.ComponentType<GameMountProps>;
```

```ts
// lib/games/registry.ts
export const GAME_REGISTRY: Record<string, GameMount> = {
  asteroids: AsteroidsGame,
};

// lib/games/asteroids/engine.ts
export function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameController;
```

```ts
// Estado interno del motor (antes eran globals en game.js)
type Phase = "playing" | "dead" | "gameover";
// Entidades en lib/games/asteroids/entities.ts: Bullet, Asteroid, PowerUp, Ship, Particle
// Constantes en lib/games/asteroids/constants.ts: W = 800, H = 600, RADII, SPEEDS, POINTS, ...
```

Convenciones:

- Coordenadas con origen arriba a la izquierda; velocidades en px/s; `dt` en segundos, con tope de 0.05 s (igual que el original).
- Flujo de control: React llama a `GameController`; el juego responde solo mediante `GameCallbacks`. El juego no lee estado de React.

## Implementation plan

1. Leer `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` (Client Components y `"use client"` en Next 16), tal como exige `AGENTS.md`. Invocar `/frontend-design` antes del paso 6, como indica `CLAUDE.md`.
2. Crear `lib/games/types.ts` con el contrato genérico y `lib/games/registry.ts` con el registro vacío. `GamePlayer` aún no lo usa; el sistema sigue funcionando igual.
3. Crear `lib/games/asteroids/constants.ts` y `lib/games/asteroids/entities.ts` con el port tipado de `Bullet`, `Asteroid`, `PowerUp`, `Ship` y `Particle`. `draw(ctx)` recibe el contexto en vez de usar un global. Comprobar con `npx tsc --noEmit`.
4. Crear `lib/games/asteroids/engine.ts` con `createAsteroidsGame`: input, bucle `requestAnimationFrame`, `update`, `draw` (mundo, HUD y overlay `GAME OVER` como en el original), colisiones, niveles, fases, y los métodos `pause`/`resume`/`restart`/`end`/`destroy`. Al reanudar se reinicia `lastTime`. Notifica con los callbacks solo cuando el valor cambia.
5. Crear `components/games/asteroids/asteroids-game.tsx`: canvas 800×600 escalado por CSS, `useEffect` que crea el motor, llama a `onReady(controller)` y llama a `destroy()` en el cleanup. Registrar el componente en `GAME_REGISTRY` con la clave `asteroids`.
6. Modificar `components/game-player.tsx`: buscar `GAME_REGISTRY[game.id]`; si existe, renderizarlo en `.crt-screen` en lugar de `.game-arena` y no correr el temporizador de puntaje falso; guardar el `GameController` recibido en `onReady`; tomar `score`/`lives`/`level` de los callbacks; abrir el modal en `onGameOver`; conectar PAUSA, FIN y JUGAR DE NUEVO al controlador; agregar los atajos `P` y `Esc`. Si el id no está en el registro, todo queda como antes.
7. Agregar la entrada `asteroids` a `GAMES` en `app/data.ts` y la clase `cover-asteroids` en `app/globals.css`, reutilizando el lenguaje visual de las otras portadas.
8. Verificar manualmente con `npm run dev` en `/juegos/asteroids/jugar` y ejecutar `npm run build`.

## Acceptance criteria

- [ ] `GAMES` contiene una entrada `id: "asteroids"` distinta de `rocas`, y la entrada `rocas` no cambió.
- [ ] `/juegos/asteroids` muestra la ficha del juego y su botón "JUGAR AHORA" lleva a `/juegos/asteroids/jugar`.
- [ ] `/juegos/asteroids/jugar` carga sin errores ni warnings en la consola.
- [ ] No existe ninguna ruta específica de `asteroids` en `app/`; se usa `app/juegos/[id]/jugar/page.tsx`.
- [ ] `game-player.tsx` no contiene el texto `asteroids`; el juego se resuelve solo por `GAME_REGISTRY`.
- [ ] `/juegos/rocas/jugar` y `/juegos/caida/jugar` siguen mostrando el placeholder anterior.
- [ ] La nave rota con `←` `→`, acelera con `↑` con inercia, y dispara con `Espacio` con un cooldown de 0.2 s.
- [ ] Un asteroide grande destruido suma 20, uno mediano 50 y uno pequeño 100, y el puntaje del HUD superior de la app se actualiza.
- [ ] Un asteroide grande se parte en 2 medianos, un mediano en 2 pequeños, y un pequeño desaparece sin partirse.
- [ ] Nave, balas y asteroides reaparecen por el borde opuesto al cruzar el canvas.
- [ ] El canvas muestra su HUD original (`SCORE`, `NIVEL`, iconos de vidas) y el HUD de la app está visible al mismo tiempo, con los mismos valores de puntaje, vidas y nivel en todo momento.
- [ ] Al chocar con un asteroide el HUD de la app y el del canvas muestran una vida menos, y la nave reaparece a los 2 s con 3 s de invencibilidad parpadeante.
- [ ] Al destruir todos los asteroides el HUD pasa a nivel 2 y aparecen `3 + nivel` asteroides.
- [ ] Al recoger un power-up `3x` la nave dispara 3 balas abiertas durante 5 s, y el canvas muestra la cuenta regresiva.
- [ ] Los callbacks `onScore`, `onLives` y `onLevel` se llaman solo cuando el valor cambia, no en cada frame.
- [ ] Al perder la última vida el canvas muestra el overlay `GAME OVER`, el juego llama a `onGameOver` una sola vez y aparece el modal "FIN DEL JUEGO" con el puntaje final correcto; el canvas deja de responder al teclado.
- [ ] El botón PAUSA, `P` y `Esc` pausan el juego desde la app (nada se mueve, cooldown y timers no avanzan) y al reanudar no hay saltos bruscos.
- [ ] El botón FIN termina la partida y abre el modal, mediante `onGameOver`.
- [ ] "GUARDAR PUNTUACIÓN" guarda una entrada en `localStorage["av_scores"]` con `game: "asteroids"`, y se refleja como "tu mejor marca" en `/salon-de-la-fama`.
- [ ] "JUGAR DE NUEVO" reinicia con puntaje 0, 3 vidas y nivel 1.
- [ ] Las flechas y `Espacio` no hacen scroll de la página mientras se juega, y se puede escribir en el input de iniciales del modal.
- [ ] Al salir de la página no quedan listeners de teclado ni un `requestAnimationFrame` activo.
- [ ] El canvas se ve completo y en proporción 4:3 con ventana de 1280 px y de 768 px.
- [ ] `npm run build` compila sin errores de TypeScript ni de ESLint.

## Decisions

- **Sí:** `asteroids` es un juego nuevo con id propio, separado de `rocas`. Decisión del usuario, para evitar que se mezclen datos, puntajes y código.
- **Sí:** id `asteroids` (en inglés, igual que la carpeta de referencia y el nombre "Asteroids" que indicó el usuario). Es una interpretación: el usuario mencionó también "Asteroides"; si se prefiere ese id, se cambia en `data.ts`, el registro y las carpetas.
- **Sí:** contrato genérico (`GameCallbacks`, `GameController`) y registro por id, sin casos especiales por juego en `GamePlayer`. Decisión del usuario: ruta genérica y juegos aislados.
- **Sí:** el juego vive dentro del canvas y notifica cambios de estado a React (puntaje, vidas, nivel, fin). Decisión del usuario.
- **Sí:** la app controla la pausa (y el reinicio y el fin) desde `GamePlayer`. El juego no decide cuándo pausar. Decisión del usuario.
- **Sí:** port a TypeScript en `lib/games/asteroids/`. Permite limpiar recursos y comunicarse con React; el patrón sirve para los siguientes juegos.
- **No:** iframe a `public/` ni `next/script` con el `game.js` original. El iframe no da acceso limpio al puntaje ni a la pausa; los globals chocan con el ciclo de vida de React.
- **No:** rutas específicas por juego (`app/juegos/asteroids/...`). La ruta dinámica `[id]` ya cubre todos los juegos.
- **Sí:** se usan los dos HUD a la vez: el del juego (dentro del canvas, sin borrar nada del original) y el de la plataforma (`GamePlayer`). Decisión del usuario. El juego notifica a React y el HUD de la app se alimenta de esas notificaciones.
- **Sí:** pausa, fin de partida y guardado de puntaje a cargo de la plataforma. Ya existen en `GamePlayer`.
- **Sí:** el motor es la única fuente de verdad de puntaje, vidas y nivel; ambos HUD leen de él. Evita que los dos se desincronicen.
- **Sí:** solo teclado y canvas 800×600 escalado por CSS. Es lo que soporta el original.
- **Sí:** balance original sin cambios; estilo vectorial blanco sobre negro dentro del marco CRT.
- **No:** reiniciar con `Espacio` en el `GAME OVER` del canvas. Lo reemplaza el modal de la plataforma; mantenerlo exigiría un callback extra (`onRestart`) para que React cierre el modal. Si se quiere conservar, se agrega en otro spec.
- **No:** tocar `rocas` ni `references/started-games/02-asteroids/`.

## Risks

| Riesgo                                                                                 | Mitigación                                                                                                   |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Doble montaje de efectos en React Strict Mode (desarrollo) crea dos bucles de juego.   | `destroy()` cancela el `requestAnimationFrame` y quita los listeners; el `useEffect` lo llama en su cleanup. |
| `GamePlayer` usa un controlador de un montaje ya destruido (`onReady` tardío o doble). | `GamePlayer` reemplaza el controlador guardado en cada `onReady` y lo descarta al desmontar.                 |
| Llamar a `setState` en cada frame degrada el rendimiento.                              | Los callbacks se disparan solo cuando cambia el valor.                                                       |
| El input del modal (iniciales) captura teclas mientras el motor escucha.               | Al terminar la partida el motor ignora el teclado y no llama a `preventDefault`.                             |
| Salto de `dt` al reanudar tras pausa o cambiar de pestaña.                             | Tope de 0.05 s y `resume()` reinicia `lastTime`.                                                             |
| Los pseudo-elementos de `.crt-screen` pueden tapar o deformar el canvas.               | Verificar visualmente en el paso 5 y ajustar z-index o tamaño sin cambiar el marco CRT.                      |
| Confusión entre `rocas` y `asteroids` (descripciones parecidas).                       | Ids, carpetas y registro separados; criterio de aceptación de que `rocas` no cambia.                         |

## What is **not** in this spec

- Cambios al juego `rocas`.
- Controles táctiles / móvil.
- OVNIs, sonido, música y otros power-ups.
- Rediseño visual a la paleta neón.
- Ranking global real ni persistencia en Supabase.
- Conversión de los demás juegos del catálogo.
- Pruebas automatizadas.
- Cambios en `references/started-games/02-asteroids/`.

Cada uno de estos, si se implementa, va en su propio spec.

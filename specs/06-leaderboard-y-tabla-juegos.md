# SPEC 06 — Leaderboard real y tabla `games` en Supabase

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 04, SPEC 05
> **Date:** 2026-10-01
> **Objective:** Crear en Supabase las tablas `games` y `scores` para que el catálogo de juegos y el ranking top 10 por juego se lean y se guarden en la base de datos, en lugar de usar `GAMES`, `seededScores` y `localStorage["av_scores"]`.

## Why this spec exists

Hoy el catálogo vive en `app/data.ts` y los puntajes del Salón de la Fama son ficticios (`seededScores`); los puntajes reales del jugador solo existen en su navegador. Eso impide competir: nadie ve los puntajes de nadie. Supabase ya está integrado (SPEC 04) pero no tiene tablas. Este spec crea las dos primeras y conecta la UI existente a ellas, sin añadir autenticación (queda para otro spec).

## Scope

**In:**

- Migración en `supabase/migrations/` con la tabla `games` (catálogo) sembrada con los 9 juegos actuales de `GAMES` (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `asteroids`, `ranaria`, `duelo-pixel`; el seed copia el contenido tal cual, incluidos `rocas` y `asteroids` como juegos distintos).
- Tabla `scores` con FK a `games`, validaciones por `CHECK` y RLS: `select` e `insert` públicos, sin `update` ni `delete`.
- Vista `game_stats` (`security_invoker`) con mejor puntaje y cantidad de puntajes registrados por juego.
- Capa de acceso en `lib/data/games.ts` y `lib/data/scores.ts`, usando los clientes de `lib/supabase/` del SPEC 04. Tipos TypeScript escritos a mano, sin generar.
- **Catálogo desde la DB:** Home (`app/page.tsx`), Biblioteca (`app/juegos/page.tsx`), ficha (`app/juegos/[id]/page.tsx`), reproductor (`app/juegos/[id]/jugar/page.tsx`) y Salón de la Fama leen `games` y `game_stats` en lugar de `GAMES`. `Game.best` se reemplaza por el valor calculado de `game_stats`.
- **Leaderboard real:** `/salon-de-la-fama` mantiene pestañas por juego, podio y tabla, pero con el top 10 de `scores` (orden `score` desc, desempate por `created_at` asc). Sin puntajes: estado vacío explícito.
- **Top 5 en la ficha:** `app/juegos/[id]/page.tsx` muestra el top 5 real del juego en lugar de `seededScores`.
- **Guardado:** "GUARDAR PUNTUACIÓN" en `GamePlayer` inserta en `scores` (`game_id`, `name`, `score`). Si falla, se muestra un error y se puede reintentar; solo tras éxito aparece "PUNTUACIÓN GUARDADA". El botón se deshabilita con nombre vacío.
- "Tu mejor marca" en el Salón: consulta el `max(score)` de `scores` donde `name` = nombre de la sesión mock y `game_id` = pestaña activa.
- El Salón se refresca al guardar un puntaje (al volver a entrar a la página se recarga; sin Realtime).
- Eliminar de `app/data.ts` `GAMES`, `PLAYERS`, `seededScores`, `ScoreRow`, y los campos `best` y `plays` del tipo `Game`. Se conservan `CATS` y el tipo `Game` (sin esos campos).
- Eliminar `saveScore`, `bestScoreFor`, `SavedScore` y el store de `av_scores` de `components/session-provider.tsx`. Se conserva la sesión mock (`av_user`).

**Out of scope (para futuros specs):**

- Supabase Auth, perfiles de usuario y puntajes ligados a un usuario (el nombre es texto libre).
- Realtime (actualización en vivo del ranking).
- Edge Functions y validación anti-trampa del lado servidor.
- Migrar los puntajes existentes de `localStorage["av_scores"]` (son datos de prueba y se ignoran).
- Puntajes de semilla en `scores`: la tabla arranca vacía.
- Ranking global entre todos los juegos, paginación y top mayor a 10.
- Una página administrativa para editar el catálogo.
- Un contador real de "partidas jugadas" (solo se cuentan puntajes guardados).
- Tipos generados con la CLI de Supabase.

## Data model

```sql
-- supabase/migrations/<timestamp>_games_and_scores.sql
create table public.games (
  id         text primary key,                 -- 'asteroids', 'caida', ...
  title      text not null,
  short      text not null,
  long       text not null,
  cat        text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover      text not null,                    -- clase CSS, ej. 'cover-asteroids'
  color      text not null check (color in ('cyan','magenta','yellow','green')),
  sort_order int  not null                      -- orden actual de GAMES
);

create table public.scores (
  id         uuid primary key default gen_random_uuid(),
  game_id    text not null references public.games(id),
  name       text not null check (char_length(name) between 1 and 10),
  score      int  not null check (score >= 0 and score <= 10000000),
  created_at timestamptz not null default now()
);
create index scores_game_score_idx on public.scores (game_id, score desc, created_at);

create view public.game_stats with (security_invoker = true) as
  select g.id as game_id,
         coalesce(max(s.score), 0) as best,
         count(s.id)::int          as total
  from public.games g left join public.scores s on s.game_id = g.id
  group by g.id;

-- RLS: games -> select público; scores -> select e insert públicos (rol anon).
```

```ts
// lib/data/games.ts
export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string;
  color: "cyan" | "magenta" | "yellow" | "green";
};
export type GameWithStats = Game & { best: number; total: number };

// lib/data/scores.ts
export type ScoreRow = {
  rank: number;
  name: string;
  score: number;
  date: string;
};
export async function getTopScores(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]>;
export async function getBestFor(
  gameId: string,
  name: string,
): Promise<{ score: number; at: string } | null>;
export async function submitScore(entry: {
  gameId: string;
  name: string;
  score: number;
}): Promise<{ ok: true } | { ok: false; error: string }>;
```

Convenciones:

- El nombre se guarda en mayúsculas, 1 a 10 caracteres (igual que el input actual de `GamePlayer`).
- `score` máximo 10.000.000 como tope de cordura; no es una defensa anti-trampa.
- Una misma persona puede aparecer varias veces en el top 10 (se listan puntajes, no jugadores únicos).
- Los componentes de servidor usan `lib/supabase/server.ts`; los de cliente (`GamePlayer`, Salón de la Fama con pestañas) usan `lib/supabase/client.ts`.

## Implementation plan

1. Leer en `node_modules/next/dist/docs/` las guías de Server y Client Components, data fetching y caching (Next 16), tal como exige `AGENTS.md`. Invocar `/frontend-design` antes del paso 7, como indica `CLAUDE.md`.
2. Escribir la migración (`games`, `scores`, `game_stats`, índices y RLS) y el seed de `games` con el contenido actual de `GAMES`. Aplicarla con el MCP de Supabase (`apply_migration`) y revisar `get_advisors` por problemas de seguridad. El sistema no cambia todavía.
3. Crear `lib/data/games.ts` con el tipo `Game` y las funciones que leen `games` y `game_stats` (lista y por id). Verificar con una llamada desde un Route Handler temporal o desde la consola.
4. Pasar Home, Biblioteca, ficha y `jugar/page.tsx` al catálogo de la DB (reemplazar `GAMES`; `best` desde `game_stats`; la ficha muestra `total` como "Puntajes" en lugar de "Partidas"). Mover los filtros de `app/juegos/page.tsx` de modo que sigan funcionando con los datos recibidos.
5. Crear `lib/data/scores.ts` (`getTopScores`, `getBestFor`, `submitScore`) y conectar "GUARDAR PUNTUACIÓN" en `GamePlayer` con `submitScore`, con estados guardando, error y guardado.
6. Reemplazar `seededScores` por `getTopScores` en la ficha (top 5) y en `/salon-de-la-fama` (top 10, estado vacío, "tu mejor marca" con `getBestFor`). Eliminar `saveScore`, `bestScoreFor` y `av_scores` de `session-provider.tsx`, y `GAMES`, `PLAYERS`, `seededScores`, `ScoreRow`, `best` y `plays` de `app/data.ts`.
7. Verificar con `npm run dev` y ejecutar `npm run lint` y `npm run build`.

## Acceptance criteria

- [ ] Existen las tablas `games` y `scores` y la vista `game_stats` en Supabase, creadas con un archivo en `supabase/migrations/`.
- [ ] `games` contiene exactamente los 9 juegos que tenía `GAMES`, con los mismos `id`, `title`, `cat`, `cover` y `color`, y `rocas` y `asteroids` como filas distintas.
- [ ] `scores` arranca vacía y RLS está activado en `games` y `scores`; `get_advisors` no reporta tablas sin RLS.
- [ ] Con la publishable key se puede hacer `select` en `games`, `scores` y `game_stats` e `insert` en `scores`; `update` y `delete` en `scores` fallan.
- [ ] Insertar un puntaje con `name` vacío, `name` de más de 10 caracteres, `score` negativo, `score` mayor a 10.000.000 o `game_id` inexistente es rechazado por la base.
- [ ] `app/data.ts` ya no exporta `GAMES`, `PLAYERS` ni `seededScores`, y `Game` ya no tiene `best` ni `plays`.
- [ ] Ningún archivo contiene `av_scores`, `saveScore` ni `bestScoreFor`.
- [ ] Home, `/juegos`, `/juegos/[id]` y `/juegos/[id]/jugar` muestran los mismos 9 juegos que antes, leídos de la DB; el filtro por categoría y la búsqueda de `/juegos` siguen funcionando.
- [ ] Un id inexistente en `/juegos/xyz` y `/juegos/xyz/jugar` responde 404.
- [ ] Con `scores` vacía, `/salon-de-la-fama` muestra un estado vacío por pestaña (sin podio ni filas ficticias) y la ficha muestra "Mejor global" en 0.
- [ ] Tras guardar un puntaje de 1.500 como `AAA` en `asteroids`, `/salon-de-la-fama` en la pestaña `ASTEROIDS` lo muestra en el rango 01 y la ficha de `asteroids` lo muestra en su top 5.
- [ ] El Salón de la Fama muestra como máximo 10 filas por juego, ordenadas por puntaje descendente; el podio muestra solo los puestos que existen.
- [ ] Un puntaje guardado desde un navegador es visible desde otro navegador distinto.
- [ ] Con el nombre vacío, "GUARDAR PUNTUACIÓN" está deshabilitado.
- [ ] Si el insert falla (por ejemplo, sin red), el modal muestra un mensaje de error, permite reintentar y no muestra "PUNTUACIÓN GUARDADA".
- [ ] Con sesión mock iniciada como `AAA`, el Salón muestra "TU MEJOR MARCA" con su máximo en el juego activo; sin sesión, no aparece.
- [ ] "Mejor global" de la ficha y de la Biblioteca coincide con el rango 01 del Salón para ese juego.
- [ ] Ningún archivo versionado contiene `service_role` ni la contraseña de la DB.
- [ ] `npm run lint` y `npm run build` terminan sin errores de TypeScript ni de ESLint.

## Decisions

- **Sí:** puntajes en Supabase y no en `localStorage`. Un ranking solo tiene sentido si es compartido. Decisión del usuario.
- **Sí:** insertar sin Auth, con iniciales de texto libre. La plataforma aún no tiene usuarios reales; Auth va en otro spec. Decisión del usuario.
- **Sí:** tabla `games` como fuente de verdad del catálogo (identidad y metadatos), con `scores.game_id` como FK. Evita dos fuentes de verdad. Decisión del usuario.
- **Sí:** `cover` y `color` se guardan en la DB como strings (clase CSS y nombre de color) aunque sean detalles visuales. Mantiene el catálogo completo en un solo lugar y los estilos siguen en `globals.css`.
- **Sí:** `best` y total de puntajes se calculan con la vista `game_stats`, no se guardan. Un valor guardado se desincroniza.
- **Sí:** quitar `plays` y mostrar "Puntajes" (total de puntajes guardados). No hay forma honesta de contar partidas jugadas sin guardar cada partida.
- **Sí:** reemplazar los datos ficticios por reales, con estado vacío. Mezclar semilla y reales confunde un ranking competitivo. Decisión del usuario.
- **Sí:** ignorar los datos de `localStorage["av_scores"]`. Son de prueba.
- **Sí:** validación básica con `CHECK` en la DB (nombre 1–10, score 0–10.000.000). No evita trampas, solo basura obvia.
- **Sí:** top 10 por juego sin Realtime, y top 5 en la ficha. Decisión del usuario.
- **Sí:** el ranking lista puntajes, no jugadores únicos. Más simple; el "mejor por jugador" requiere identidad real (Auth).
- **Sí:** tipos TypeScript escritos a mano y capa `lib/data/`. Con dos tablas no justifica la generación de tipos.
- **No:** Edge Function validadora con `service_role`. Sube el alcance; se evalúa cuando haya Auth y riesgo real de trampas.
- **No:** Supabase Auth ni perfiles. Specs posteriores.
- **No:** Realtime. Otro spec.
- **No:** migrar `av_scores`. Dato de prueba.
- **No:** seed de puntajes de ejemplo en la DB.

## Risks

| Riesgo                                                                                                | Mitigación                                                                                                                 |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Insert público: cualquiera puede publicar puntajes falsos desde la consola o con `curl`.              | Se acepta en este spec; `CHECK` limita los valores absurdos. Edge Function y Auth se tratan en un spec posterior.          |
| Spam o abuso de inserciones (sin rate limit).                                                         | Se acepta por ahora; se revisa junto con la validación server-side.                                                        |
| Quitar `GAMES` rompe páginas que lo importan (Home, `/juegos`, ficha, jugar, Salón).                  | El paso 4 y 6 cubren todos los usos; el criterio de aceptación exige que `GAMES` no exista y que `build` pase.             |
| Si Supabase no responde, las páginas del catálogo quedan sin datos.                                   | Mostrar un mensaje de error en las páginas afectadas en vez de romper; no se añade un fallback local al catálogo.          |
| Caché de Next 16: el Salón o la ficha muestran un ranking desactualizado tras guardar.                | Leer en el paso 1 la guía de caching; los datos del ranking se piden sin caché estática o se invalidan tras `submitScore`. |
| Un nombre libre puede contener contenido ofensivo.                                                    | No se modera en este spec; límite de 10 caracteres. Moderación pendiente para el spec de Auth.                             |
| Los archivos duplicados `* 2.ts` sin versionar en `lib/` y `components/` (residuos) pueden confundir. | No se tocan en este spec; revisar y limpiar antes de implementar para no importar un archivo equivocado.                   |

## What is **not** in this spec

- Supabase Auth, perfiles o puntajes ligados a un usuario.
- Realtime.
- Edge Functions o validación anti-trampa del lado servidor.
- Migración de `localStorage["av_scores"]`.
- Puntajes de semilla en la base.
- Ranking global entre juegos, paginación y top mayor a 10.
- Administración del catálogo.
- Contador real de partidas jugadas.
- Tipos generados por la CLI de Supabase.

Cada uno de estos, si se implementa, va en su propio spec.

# SPEC 02 — Home (landing) y About+Contacto

> **Status:** Apoobado
> **Depends on:** SPEC 01
> **Date:** 2026-09-17
> **Objective:** Portar la Home (landing) y la pantalla About+Contacto del prototipo en `references/templates/home-about/` a Next.js App Router, moviendo la Biblioteca de `/` a `/juegos`, agregando `/about`, y actualizando el Nav para reflejar las nuevas rutas.

## Scope

**In:**

- Nueva Home (landing) en `/`, migrada desde `home.jsx`: hero con siluetas decorativas, sección "¿Por qué Arcade Vault?", preview de juegos (`GAMES.slice(0, 6)` de `app/data.ts`), stats, actividad en vivo (ticker de puntuaciones y top jugadores), pricing y CTA final.
- Biblioteca (buscador, chips de categoría, grid) movida de `/` a `/juegos`, sin cambios de contenido ni comportamiento respecto a spec 01.
- Nueva pantalla About+Contacto en `/about`, migrada desde `about.jsx`: misión, highlights, divisor decorativo y formulario de contacto controlado (nombre, correo, mensaje) que simula el envío con una animación de terminal.
- `components/nav.tsx` actualizado: enlaces "Inicio" (`/`) y "Acerca de" (`/about`) agregados al menú desktop y móvil, enlace "Biblioteca" apuntando a `/juegos`, y `isActive` ajustado a las nuevas rutas.
- Hook compartido de scroll-reveal (`components/use-reveal.ts`, `"use client"`) usado por Home y About para animar la aparición de las secciones marcadas `.reveal`.
- CSS de Home/About migrado de `references/templates/home-about/styles.css` a `app/globals.css`, agregando solo las clases que falten (sin duplicar lo ya migrado en spec 01).
- Actualización de los enlaces "volver a biblioteca" que hoy apuntan a `/` (`app/juegos/[id]/page.tsx`, `app/salon-de-la-fama/page.tsx`, botón del modal de fin de partida en `components/game-player.tsx`) para que apunten a `/juegos`.

**Out of scope (para futuros specs):**

- Envío real de correo o backend para el formulario de contacto (queda puramente decorativo, sin persistencia).
- Datos reales de actividad en vivo o ranking en Home (el ticker y el top de jugadores quedan hardcodeados y decorativos, igual que el Reproductor mock de spec 01).
- Sistema de créditos/monedas o pagos funcionales (el plan "$0 / siempre" en Home sigue siendo solo visual).
- Lógica real de cualquier juego.
- Pruebas automatizadas (no hay test runner configurado).
- Internacionalización.

## Data model

No se introduce ningún modelo de datos nuevo ni persistente. El ticker de "últimas puntuaciones" y el top de jugadores de Home son arrays decorativos hardcodeados dentro del componente (igual que en `home.jsx`), sin conectarse a `app/data.ts` ni a `localStorage`. El formulario de contacto de About usa únicamente estado local de React (`useState`) que no se persiste.

## Implementation plan

1. Crear `components/use-reveal.ts` (`"use client"`) con el hook compartido de scroll-reveal (IntersectionObserver sobre `.reveal`, agrega la clase `.in` al entrar en viewport), replicando la lógica duplicada en `home.jsx` y `about.jsx`.
2. Revisar `references/templates/home-about/styles.css` y agregar a `app/globals.css` únicamente las clases que falten para Home, About y el reveal (`.home-*`, `.about-*`, `.feature-*`, `.mini-*`, `.activity-*`, `.pricing-*`, `.contact-*`, `.highlight-*`, `.terminal-success`, `.reveal`/`.reveal.in`, etc.).
3. Crear `app/juegos/page.tsx` moviendo tal cual el contenido actual de Biblioteca (buscador, chips de categoría, grid) desde `app/page.tsx`.
4. Reemplazar `app/page.tsx` por la nueva Home (`"use client"`), migrando `home.jsx` completo (hero, secciones, `FloatingSilhouettes`, `MiniCard`, `FeatureIcon`) y usando `next/link`/`useRouter` hacia `/juegos`, `/auth`, `/juegos/[id]` y `/salon-de-la-fama` en lugar de la función `navigate` del prototipo.
5. Crear `app/about/page.tsx` (`"use client"`), migrando `about.jsx` completo (hero de misión, highlights, divisor, formulario de contacto con `useState` y animación de terminal de éxito, `HighlightIcon`).
6. Actualizar `components/nav.tsx`: agregar "Inicio" y "Acerca de" en desktop y móvil, cambiar el href de "Biblioteca" a `/juegos`, y ajustar `isActive` para las claves `home`/`biblioteca`/`salon`/`about` (Detalle y Reproductor siguen resaltando "Biblioteca").
7. Actualizar a `/juegos` los enlaces que hoy apuntan a `/` en `app/juegos/[id]/page.tsx`, `app/salon-de-la-fama/page.tsx` y `components/game-player.tsx`.
8. Confirmar que `app/auth/page.tsx` sigue redirigiendo a `/` tras iniciar sesión, crear cuenta o entrar como invitado (ahora aterriza en Home) — no requiere cambios de código.

## Acceptance criteria

- [ ] `/` muestra la nueva Home con hero, "¿Por qué Arcade Vault?", preview de juegos, stats, actividad en vivo, pricing y CTA final.
- [ ] Los botones "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" en Home navegan a `/juegos`.
- [ ] Los botones "CREAR CUENTA" y "EMPEZAR GRATIS →" en Home navegan a `/auth`.
- [ ] Las mini-tarjetas de "Juegos disponibles ahora" en Home navegan a `/juegos/[id]` del juego correspondiente.
- [ ] El botón "VER SALÓN →" en Home navega a `/salon-de-la-fama`.
- [ ] `/juegos` muestra la Biblioteca (buscador, chips de categoría, grid) con el mismo comportamiento que tenía en `/` bajo spec 01.
- [ ] `/about` muestra la sección "Acerca de" y el formulario de contacto.
- [ ] Enviar el formulario de contacto en `/about` con algún campo vacío dispara la animación de "shake" y no avanza.
- [ ] Enviar el formulario con los tres campos completos muestra la animación de terminal de éxito, incluyendo el nombre ingresado.
- [ ] El botón "ENVIAR OTRO MENSAJE" reinicia el formulario a su estado vacío.
- [ ] El Nav muestra "Inicio", "Biblioteca", "Salón de la Fama" y "Acerca de", resaltando el activo según la ruta actual (Detalle y Reproductor resaltan "Biblioteca").
- [ ] El logo del Nav navega a `/`.
- [ ] El botón "volver a Biblioteca" en Detalle (`/juegos/[id]`), en Salón de la Fama, y el botón correspondiente del modal de fin de partida en el Reproductor navegan a `/juegos`.
- [ ] Iniciar sesión, crear cuenta o entrar como invitado desde `/auth` redirige a `/`.
- [ ] Las secciones marcadas `reveal` en Home y About aparecen con la animación de entrada al hacer scroll hasta ellas.
- [ ] `npm run build` compila sin errores de TypeScript ni de ESLint.

## Decisions

- **Sí:** paquete completo Home + About + Nav actualizado, tal como está en `references/templates/home-about/`, en vez de solo la landing. El propio `nav.jsx` del template ya asume ambas pantallas nuevas.
- **Sí:** `/` pasa a ser la nueva Home y la Biblioteca se muda a `/juegos`. Así cada pantalla del prototipo tiene su propia URL, igual que en el `nav.jsx` del template.
- **Sí:** ruta `/about` (en inglés) para la pantalla Acerca de, en vez de `/acerca-de`. Decisión explícita del usuario, aunque el resto del sitio esté en español.
- **Sí:** tras `/auth`, redirigir a `/` (Home) en vez de a `/juegos`. Decisión explícita del usuario.
- **Sí:** ticker de actividad y top de jugadores en Home quedan decorativos y hardcodeados en el componente, sin conectarlos a `app/data.ts`. Mismo criterio que el Reproductor mock de spec 01 (placeholder temporal explícito).
- **Sí:** formulario de contacto puramente decorativo (animación de terminal), sin backend ni persistencia en `localStorage`.
- **No:** envío real de correo o backend para contacto — excluido explícitamente.
- **No:** datos reales de actividad/ranking en vivo — quedan como placeholder decorativo hasta que exista backend real.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Mover la Biblioteca de `/` a `/juegos` rompe cualquier enlace interno que aún apunte a `/` esperando el grid de juegos. | Se actualizan en este mismo spec todos los enlaces internos conocidos (Nav, Detalle, Salón de la Fama, Reproductor); no hay enlaces externos que mitigar porque el proyecto no tiene usuarios reales todavía. |
| El CSS migrado desde `styles.css` puede colisionar con clases ya definidas en `app/globals.css` por spec 01 (nombres genéricos como `.card`, `.btn`, etc.). | Se agregan solo las clases específicas de Home/About que falten, revisando primero cuáles ya existen en `app/globals.css`. |

## What is **not** in this spec

- Envío real de correo o backend para el formulario de contacto.
- Datos reales de actividad en vivo o ranking en Home.
- Sistema de créditos/monedas o pagos funcionales.
- Lógica real de ningún juego.
- Pruebas automatizadas.
- Internacionalización / cambio de idioma.

Cada uno de estos, si se implementa, va en su propio spec.

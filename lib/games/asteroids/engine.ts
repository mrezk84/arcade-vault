import type { GameCallbacks, GameController } from "../types";
import {
  H,
  POINTS,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  W,
} from "./constants";
import {
  Asteroid,
  Bullet,
  Particle,
  PowerUp,
  Ship,
  dist,
  rand,
  type Keys,
} from "./entities";

type Phase = "playing" | "dead" | "gameover";

// Teclas que el juego atiende y para las que evita el scroll de la página
const GAME_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
]);

export function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameController {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  canvas.width = W;
  canvas.height = H;

  // ── Input ───────────────────────────────────────────────────────────────────
  let keys: Keys = {};
  let justPressed: Keys = {};

  function pressed(code: string) {
    const val = justPressed[code];
    justPressed[code] = false;
    return val;
  }

  // Con la partida en pausa o terminada el motor ignora el teclado y no llama
  // a preventDefault, para que el resto de la página (p. ej. el input de
  // iniciales del modal) reciba las teclas con normalidad.
  function isInputActive() {
    return !paused && phase !== "gameover";
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!isInputActive() || !GAME_KEYS.has(e.code)) return;
    e.preventDefault();
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  }

  function onKeyUp(e: KeyboardEvent) {
    keys[e.code] = false;
  }

  // ── Estado (antes globals en game.js) ───────────────────────────────────────
  let ship: Ship;
  let bullets: Bullet[];
  let asteroids: Asteroid[];
  let particles: Particle[];
  let powerUps: PowerUp[];
  let score: number;
  let lives: number;
  let level: number;
  let phase: Phase;
  let deadTimer = 0;
  let powerUpSpawned: boolean;
  let killsSinceSpawn: number;

  let paused = false;
  let destroyed = false;
  let rafId: number | null = null;
  let lastTime: number | null = null;

  // Últimos valores notificados: los callbacks solo se llaman si cambian
  let notifiedScore: number | null = null;
  let notifiedLives: number | null = null;
  let notifiedLevel: number | null = null;
  let gameOverNotified = false;

  function notify() {
    if (destroyed) return;
    if (score !== notifiedScore) {
      notifiedScore = score;
      callbacks.onScore(score);
    }
    if (lives !== notifiedLives) {
      notifiedLives = lives;
      callbacks.onLives(lives);
    }
    if (level !== notifiedLevel) {
      notifiedLevel = level;
      callbacks.onLevel(level);
    }
    if (phase === "gameover" && !gameOverNotified) {
      gameOverNotified = true;
      callbacks.onGameOver(score);
    }
  }

  function spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }

  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = 3;
    level = 1;
    phase = "playing";
    gameOverNotified = false;
    keys = {};
    justPressed = {};
    spawnAsteroids(4);
  }

  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }

  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }

  function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      phase = "gameover";
    } else {
      phase = "dead";
      deadTimer = 2;
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (phase === "gameover") {
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      return;
    }

    if (phase === "dead") {
      deadTimer -= dt;
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        phase = "playing";
        ship.reset();
      }
      return;
    }

    // Disparar
    if (pressed("Space")) {
      bullets.push(...ship.tryShoot());
    }

    ship.update(dt, keys);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));

    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);

    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }

    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= 5;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);

    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }

    // Nivel completado
    if (asteroids.length === 0) nextLevel();
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function drawLifeIcon(x: number, y: number) {
    ctx!.save();
    ctx!.translate(x, y);
    ctx!.rotate(-Math.PI / 2);
    ctx!.strokeStyle = "#fff";
    ctx!.lineWidth = 1.2;
    ctx!.lineJoin = "round";
    ctx!.beginPath();
    ctx!.moveTo(9, 0);
    ctx!.lineTo(-6, -5);
    ctx!.lineTo(-3, 0);
    ctx!.lineTo(-6, 5);
    ctx!.closePath();
    ctx!.stroke();
    ctx!.restore();
  }

  function drawHUD(c: CanvasRenderingContext2D) {
    c.fillStyle = "#fff";
    c.font = "15px monospace";

    c.textAlign = "left";
    c.fillText(`SCORE  ${score}`, 14, 26);

    c.textAlign = "center";
    c.fillText(`NIVEL ${level}`, W / 2, 26);

    for (let i = 0; i < lives; i++) drawLifeIcon(W - 16 - i * 22, 18);

    if (ship.tripleShot > 0) {
      c.textAlign = "left";
      c.fillStyle = "#0ff";
      c.fillText(`3x  ${ship.tripleShot.toFixed(1)}s`, 14, 46);
    }
  }

  function drawOverlay(
    c: CanvasRenderingContext2D,
    title: string,
    sub: string,
  ) {
    c.textAlign = "center";
    c.fillStyle = "#fff";
    c.font = "bold 46px monospace";
    c.fillText(title, W / 2, H / 2 - 18);
    c.font = "18px monospace";
    c.fillStyle = "rgba(255,255,255,0.65)";
    c.fillText(sub, W / 2, H / 2 + 22);
  }

  function draw() {
    const c = ctx!;
    c.fillStyle = "#000";
    c.fillRect(0, 0, W, H);

    particles.forEach((p) => p.draw(c));
    asteroids.forEach((a) => a.draw(c));
    powerUps.forEach((p) => p.draw(c));
    bullets.forEach((b) => b.draw(c));
    ship.draw(c);

    drawHUD(c);

    // Sin "ESPACIO PARA REINICIAR": el reinicio lo ofrece el modal de la app
    if (phase === "gameover") drawOverlay(c, "GAME OVER", `PUNTAJE: ${score}`);
  }

  // ── Loop principal ──────────────────────────────────────────────────────────
  function loop(ts: number) {
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    update(dt);
    draw();
    notify();
    rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    lastTime = null;
    if (rafId === null) rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  // ── Controlador (React -> canvas) ───────────────────────────────────────────
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  initGame();
  draw();
  notify();
  startLoop();

  return {
    pause() {
      if (destroyed || paused) return;
      paused = true;
      stopLoop();
      // Evita teclas "pegadas" si se suelta una mientras está en pausa
      keys = {};
      justPressed = {};
    },

    resume() {
      if (destroyed || !paused) return;
      paused = false;
      startLoop(); // reinicia lastTime: sin salto de dt
    },

    restart() {
      if (destroyed) return;
      initGame();
      paused = false;
      draw();
      notify();
      startLoop();
    },

    end() {
      if (destroyed || phase === "gameover") return;
      phase = "gameover";
      draw(); // muestra el overlay aunque el bucle esté detenido por la pausa
      notify();
    },

    destroy() {
      destroyed = true;
      stopLoop();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    },
  };
}

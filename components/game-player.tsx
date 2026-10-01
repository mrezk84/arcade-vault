"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Game } from "@/lib/data/games";
import { useSession } from "@/components/session-provider";
import { submitScore } from "@/lib/data/scores";
import { GAME_REGISTRY } from "@/lib/games/registry";
import type { GameCallbacks, GameController } from "@/lib/games/types";

export function GamePlayer({ game }: { game: Game }) {
  const router = useRouter();
  const { user } = useSession();

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState(user ? user.name : "INVITADO");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Si el juego está en el registro, se monta su componente; si no, queda el placeholder.
  const GameMount = GAME_REGISTRY[game.id];
  const controllerRef = useRef<GameController | null>(null);

  const callbacks = useMemo<GameCallbacks>(
    () => ({
      onScore: setScore,
      onLives: setLives,
      onLevel: setLevel,
      onGameOver: (finalScore) => {
        setScore(finalScore);
        setPaused(false);
        setOver(true);
      },
    }),
    [],
  );

  const handleReady = useCallback((controller: GameController) => {
    controllerRef.current = controller;
  }, []);

  // Puntaje falso solo para los juegos que aún no tienen motor real
  useEffect(() => {
    if (GameMount || over || paused) return;
    const t = setInterval(() => {
      setScore((s) => {
        const next = s + Math.floor(10 + Math.random() * 90);
        if (next > 0 && next % 2500 < 100) setLevel((l) => l + 1);
        return next;
      });
    }, 220);
    return () => clearInterval(t);
  }, [GameMount, over, paused]);

  const togglePause = useCallback(() => {
    const next = !paused;
    if (next) controllerRef.current?.pause();
    else controllerRef.current?.resume();
    setPaused(next);
  }, [paused]);

  // Atajos P y Esc: los atiende la app, no el juego
  useEffect(() => {
    if (!GameMount || over) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyP" && e.code !== "Escape") return;
      e.preventDefault();
      togglePause();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [GameMount, over, togglePause]);

  const endGame = () => {
    if (GameMount) controllerRef.current?.end(); // responde con onGameOver
    else setOver(true);
  };
  const restart = () => {
    controllerRef.current?.restart();
    setScore(0);
    setLives(3);
    setLevel(1);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setSaveError(null);
  };

  const saveCurrentScore = async () => {
    setSaving(true);
    setSaveError(null);
    const result = await submitScore({ gameId: game.id, name, score });
    setSaving(false);
    if (result.ok) {
      setSaved(true);
      // Deja ver "PUNTUACIÓN GUARDADA" y pasa a la ficha: ranking y "JUGAR AHORA".
      setTimeout(() => router.push(`/juegos/${game.id}`), 1800);
    } else setSaveError(result.error);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={togglePause}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <button className="btn ghost" onClick={() => router.push(`/juegos/${game.id}`)}>
            SALIR
          </button>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {GameMount ? (
            <GameMount callbacks={callbacks} onReady={handleReady} />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div className="crt-content" style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div className="mono" style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 10, letterSpacing: "0.16em" }}>
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>
            {game.title} · CRT-83 · 60 HZ
          </span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="TUS INICIALES"
                />
                <button
                  className="btn yellow"
                  onClick={saveCurrentScore}
                  disabled={saving || name.trim() === ""}
                >
                  {saving ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            {saveError && (
              <div role="alert" style={{ color: "var(--magenta)", marginTop: 12 }}>
                {saveError}
              </div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <button className="btn magenta" onClick={() => router.push("/juegos")}>
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

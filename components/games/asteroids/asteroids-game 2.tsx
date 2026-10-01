"use client";

import { useEffect, useRef } from "react";
import { createAsteroidsGame } from "@/lib/games/asteroids/engine";
import type { GameMountProps } from "@/lib/games/types";

// Canvas lógico de 800×600, escalado por CSS al ancho disponible (4:3).
export function AsteroidsGame({ callbacks, onReady }: GameMountProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // El motor se crea una sola vez; los callbacks y onReady se leen desde refs
  // para que un re-render de GamePlayer no lo reinicie.
  const callbacksRef = useRef(callbacks);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    callbacksRef.current = callbacks;
    onReadyRef.current = onReady;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const controller = createAsteroidsGame(canvas, {
      onScore: (v) => callbacksRef.current.onScore(v),
      onLives: (v) => callbacksRef.current.onLives(v),
      onLevel: (v) => callbacksRef.current.onLevel(v),
      onGameOver: (v) => callbacksRef.current.onGameOver(v),
    });
    onReadyRef.current(controller);
    return () => controller.destroy();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      aria-label="Asteroids"
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}

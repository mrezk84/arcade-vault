import type { ComponentType } from "react";

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

export type GameMount = ComponentType<GameMountProps>;

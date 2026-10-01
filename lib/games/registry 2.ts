import { AsteroidsGame } from "@/components/games/asteroids/asteroids-game";
import type { GameMount } from "./types";

// Asocia el id de cada juego con su componente de montaje.
export const GAME_REGISTRY: Record<string, GameMount> = {
  asteroids: AsteroidsGame,
};

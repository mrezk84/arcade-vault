import type { GameMount } from "./types";

// Asocia el id de cada juego con su componente de montaje.
// Se llena a medida que se agregan juegos (ver SPEC 05, paso 5).
export const GAME_REGISTRY: Record<string, GameMount> = {};

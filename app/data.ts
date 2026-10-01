// app/data.ts — constantes de UI compartidas (el catálogo y los puntajes viven en Supabase)

export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string; // clase CSS de portada, ej. "cover-bricks"
  color: "cyan" | "magenta" | "yellow" | "green";
};

export const CATS: string[] = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];

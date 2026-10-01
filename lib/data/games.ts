import { createClient } from "@/lib/supabase/server";

export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string; // clase CSS de portada, ej. "cover-bricks"
  color: "cyan" | "magenta" | "yellow" | "green";
};

export type GameWithStats = Game & { best: number; total: number };

type GameStatsRow = { game_id: string; best: number; total: number };

const GAME_COLUMNS = "id, title, short, long, cat, cover, color";

// Solo para Server Components y Route Handlers (usa el cliente de servidor).
export async function getGames(): Promise<GameWithStats[]> {
  const supabase = await createClient();
  const [games, stats] = await Promise.all([
    supabase.from("games").select(GAME_COLUMNS).order("sort_order"),
    supabase.from("game_stats").select("game_id, best, total"),
  ]);
  if (games.error) throw new Error(`No se pudo leer el catálogo: ${games.error.message}`);
  if (stats.error) throw new Error(`No se pudieron leer las estadísticas: ${stats.error.message}`);

  const byGame = new Map((stats.data as GameStatsRow[]).map((s) => [s.game_id, s]));
  return (games.data as Game[]).map((g) => ({
    ...g,
    best: byGame.get(g.id)?.best ?? 0,
    total: byGame.get(g.id)?.total ?? 0,
  }));
}

export async function getGame(id: string): Promise<GameWithStats | null> {
  const supabase = await createClient();
  const [game, stats] = await Promise.all([
    supabase.from("games").select(GAME_COLUMNS).eq("id", id).maybeSingle(),
    supabase.from("game_stats").select("game_id, best, total").eq("game_id", id).maybeSingle(),
  ]);
  if (game.error) throw new Error(`No se pudo leer el juego: ${game.error.message}`);
  if (stats.error) throw new Error(`No se pudieron leer las estadísticas: ${stats.error.message}`);
  if (!game.data) return null;

  const s = stats.data as GameStatsRow | null;
  return { ...(game.data as Game), best: s?.best ?? 0, total: s?.total ?? 0 };
}

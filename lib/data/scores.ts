import { createClient } from "@/lib/supabase/client";

export type ScoreRow = { rank: number; name: string; score: number; date: string };

type ScoreDbRow = { name: string; score: number; created_at: string };

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// Usa el cliente público (publishable key): sirve en Server y Client Components.
export async function getTopScores(gameId: string, limit: number): Promise<ScoreRow[]> {
  const { data, error } = await createClient()
    .from("scores")
    .select("name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`No se pudo leer el ranking: ${error.message}`);

  return (data as ScoreDbRow[]).map((r, i) => ({
    rank: i + 1,
    name: r.name,
    score: r.score,
    date: formatDate(r.created_at),
  }));
}

export async function getBestFor(
  gameId: string,
  name: string,
): Promise<{ score: number; at: string } | null> {
  const { data, error } = await createClient()
    .from("scores")
    .select("score, created_at")
    .eq("game_id", gameId)
    .eq("name", name.trim().toUpperCase())
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`No se pudo leer tu mejor marca: ${error.message}`);
  return data ? { score: data.score, at: data.created_at } : null;
}

export async function submitScore(entry: {
  gameId: string;
  name: string;
  score: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = entry.name.trim().toUpperCase().slice(0, 10);
  if (name.length === 0) return { ok: false, error: "Escribe tus iniciales para guardar." };

  try {
    const { error } = await createClient()
      .from("scores")
      .insert({ game_id: entry.gameId, name, score: entry.score });
    if (error) return { ok: false, error: "No se pudo guardar tu puntuación. Inténtalo de nuevo." };
    return { ok: true };
  } catch {
    return { ok: false, error: "No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo." };
  }
}

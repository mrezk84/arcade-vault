import { HallView } from "@/components/hall-view";
import { getGames } from "@/lib/data/games";

export default async function HallOfFamePage() {
  const games = await getGames();
  return <HallView games={games} />;
}

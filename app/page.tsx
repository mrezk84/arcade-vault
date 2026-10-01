import { HomeView } from "@/components/home-view";
import { getGames } from "@/lib/data/games";

export default async function HomePage() {
  const games = await getGames();
  return <HomeView games={games} />;
}

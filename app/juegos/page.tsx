import { LibraryView } from "@/components/library-view";
import { getGames } from "@/lib/data/games";

export default async function BibliotecaPage() {
  const games = await getGames();
  return <LibraryView games={games} />;
}

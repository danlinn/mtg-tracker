interface GameEntry {
  isWinner: boolean;
  game: {
    players: { id: string }[];
  };
}

interface DeckWithEntries {
  id: string;
  name: string;
  commander: string;
  commander2: string | null;
  commanderImage?: string | null;
  commander2Image?: string | null;
  colorW?: boolean;
  colorU?: boolean;
  colorB?: boolean;
  colorR?: boolean;
  colorG?: boolean;
  bracket?: number | null;
  edhp?: number | null;
  lastPlayedAt?: Date | null;
  gameEntries: GameEntry[];
}

export interface DeckStatResult {
  id: string;
  name: string;
  commander: string;
  commander2: string | null;
  games: number;
  wins: number;
  winRate: number;
  winRateByPlayerCount: Record<number, { games: number; wins: number; winRate: number }>;
  lastPlayedAt: string | null;
}

export function calculateDeckStats(deck: DeckWithEntries): DeckStatResult {
  const totalEntries = deck.gameEntries.length;
  const totalWins = deck.gameEntries.filter((e) => e.isWinner).length;

  const byPlayerCount: Record<number, { games: number; wins: number }> = {};
  for (const entry of deck.gameEntries) {
    const count = entry.game.players.length;
    if (!byPlayerCount[count]) byPlayerCount[count] = { games: 0, wins: 0 };
    byPlayerCount[count].games++;
    if (entry.isWinner) byPlayerCount[count].wins++;
  }

  const winRateByPlayerCount: Record<number, { games: number; wins: number; winRate: number }> = {};
  for (const [count, data] of Object.entries(byPlayerCount)) {
    winRateByPlayerCount[Number(count)] = {
      ...data,
      winRate: data.games > 0 ? Math.round((data.wins / data.games) * 100) : 0,
    };
  }

  return {
    id: deck.id,
    name: deck.name,
    commander: deck.commander,
    commander2: deck.commander2,
    games: totalEntries,
    wins: totalWins,
    winRate: totalEntries > 0 ? Math.round((totalWins / totalEntries) * 100) : 0,
    winRateByPlayerCount,
    lastPlayedAt: deck.lastPlayedAt?.toISOString() ?? null,
  };
}

export function sortByLastPlayed<T extends { lastPlayedAt: string | null }>(stats: T[]): T[] {
  return stats.sort((a, b) => {
    if (!a.lastPlayedAt && !b.lastPlayedAt) return 0;
    if (!a.lastPlayedAt) return 1;
    if (!b.lastPlayedAt) return -1;
    return new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime();
  });
}

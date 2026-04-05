"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface GamePlayer {
  user: { id: string; name: string };
  deck: { id: string; name: string; commander: string; edhp: number | null; bracket: number | null };
  isWinner: boolean;
}

interface Game {
  id: string;
  playedAt: string;
  notes: string | null;
  asterisk: boolean;
  players: GamePlayer[];
}

function getWinLabel(game: Game): { text: string; color: string } | null {
  const winner = game.players.find((p) => p.isWinner);
  if (!winner) return null;

  const losers = game.players.filter((p) => !p.isWinner);
  const winBracket = winner.deck.bracket;
  const winEdhp = winner.deck.edhp;

  // Highest loser values
  const maxLoserBracket = losers.reduce<number | null>((max, l) => {
    if (l.deck.bracket == null) return max;
    return max == null ? l.deck.bracket : Math.max(max, l.deck.bracket);
  }, null);
  const maxLoserEdhp = losers.reduce<number | null>((max, l) => {
    if (l.deck.edhp == null) return max;
    return max == null ? l.deck.edhp : Math.max(max, l.deck.edhp);
  }, null);

  const bracketDiff = winBracket != null && maxLoserBracket != null ? maxLoserBracket - winBracket : null;
  const edhpDiff = winEdhp != null && maxLoserEdhp != null ? maxLoserEdhp - winEdhp : null;

  // Easy win: winner is 2+ brackets above OR 3.0+ edhp above highest loser
  if ((bracketDiff != null && bracketDiff <= -2) || (edhpDiff != null && edhpDiff <= -3.0)) {
    return { text: "Easy Win", color: "text-gray-400" };
  }

  // Big win: winner is 2+ brackets below OR 3.0+ edhp below a loser
  if ((bracketDiff != null && bracketDiff >= 2) || (edhpDiff != null && edhpDiff >= 3.0)) {
    return { text: "Big Win!", color: "text-yellow-500" };
  }

  // Nice win: any bracket difference OR 1.5+ edhp difference (winner lower)
  if ((bracketDiff != null && bracketDiff >= 1) || (edhpDiff != null && edhpDiff >= 1.5)) {
    return { text: "Nice Win", color: "text-blue-500" };
  }

  return null;
}

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/games?page=${page}&perPage=${perPage}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setGames(data.games);
        setTotalPages(data.totalPages);
        setTotal(data.total);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [page, perPage]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Game History</h1>
        <Link
          href="/games/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Log Game
        </Link>
      </div>

      {games.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No games recorded yet.</p>
          <Link href="/games/new" className="text-blue-600 hover:underline">
            Log your first game
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {games.map((game) => {
            const winner = game.players.find((p) => p.isWinner);
            const winLabel = getWinLabel(game);
            return (
              <div
                key={game.id}
                className="p-4 rounded-lg border border-gray-200 bg-white"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">
                    {new Date(game.playedAt).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" })}
                    {game.asterisk && <span className="text-yellow-500 ml-1" title="Asterisk">*</span>}
                  </span>
                  <div className="flex items-center gap-2">
                    {winLabel && (
                      <span className={`text-xs font-bold ${winLabel.color}`}>
                        {winLabel.text}
                      </span>
                    )}
                    <span className="text-sm font-medium text-green-600">
                      Winner: {winner?.user.name}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {game.players.map((p) => (
                    <div
                      key={p.user.id}
                      className={`text-sm p-2 rounded ${
                        p.isWinner
                          ? "bg-green-50 border border-green-200"
                          : "bg-gray-50"
                      }`}
                    >
                      <div className="font-medium text-gray-900">
                        {p.user.name}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {p.deck.commander}{p.deck.edhp != null || p.deck.bracket != null ? ` p:${p.deck.edhp != null ? p.deck.edhp.toFixed(2) : "-"}/b:${p.deck.bracket ?? "-"}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
                {game.notes && (
                  <div className="mt-2 text-xs text-gray-500 italic">
                    {game.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {total > 0 && (
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Per page:</span>
            <select
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1 bg-white text-gray-900"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-gray-400">{total} total</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 text-sm rounded-lg border border-gray-300 disabled:opacity-30 hover:bg-gray-50 transition-colors"
            >
              Prev
            </button>
            <span className="text-sm text-gray-500">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 text-sm rounded-lg border border-gray-300 disabled:opacity-30 hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

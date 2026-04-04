"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface GamePlayer {
  user: { id: string; name: string };
  deck: { id: string; name: string; commander: string };
  isWinner: boolean;
}

interface Game {
  id: string;
  playedAt: string;
  players: GamePlayer[];
}

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/games")
      .then((r) => r.json())
      .then((data) => {
        setGames(data);
        setLoading(false);
      });
  }, []);

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
            return (
              <div
                key={game.id}
                className="p-4 rounded-lg border border-gray-200 bg-white"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">
                    {new Date(game.playedAt).toLocaleDateString()}
                  </span>
                  <span className="text-sm font-medium text-green-600">
                    Winner: {winner?.user.name}
                  </span>
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
                        {p.deck.commander}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Player {
  id: string;
  name: string;
  games: number;
  wins: number;
  winRate: number;
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => {
        setPlayers(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">&larr; Dashboard</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold">Players</h1>
      </div>

      {players.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No players yet.
        </div>
      ) : (
        <div className="space-y-2">
          {players.map((player) => (
            <Link
              key={player.id}
              href={`/players/${player.id}`}
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div>
                <div className="font-medium text-gray-900">{player.name}</div>
                <div className="text-sm text-gray-500">
                  {player.games} games played
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">
                  {player.wins}W - {player.games - player.wins}L
                </div>
                <div className="text-sm text-gray-500">
                  {player.winRate}% win rate
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

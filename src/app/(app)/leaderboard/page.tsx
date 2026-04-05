"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface LeaderboardEntry {
  id: string;
  name: string;
  games: number;
  wins: number;
  winRate: number;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => {
        setEntries(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Leaderboard</h1>

      {entries.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No games recorded yet.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <Link
              key={entry.id}
              href={`/players/${entry.id}`}
              className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0
                    ? "bg-yellow-400 text-yellow-900"
                    : index === 1
                    ? "bg-gray-300 text-gray-700"
                    : index === 2
                    ? "bg-orange-300 text-orange-800"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{entry.name}</div>
                <div className="text-sm text-gray-500">
                  {entry.games} games played
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">
                  {entry.wins}W - {entry.games - entry.wins}L
                </div>
                <div className="text-sm text-gray-500">
                  {entry.winRate}% win rate
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

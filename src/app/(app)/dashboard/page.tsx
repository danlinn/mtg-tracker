"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PlayerCountStat {
  games: number;
  wins: number;
  winRate: number;
}

interface DeckStat {
  id: string;
  name: string;
  commander: string;
  commander2: string | null;
  games: number;
  wins: number;
  winRate: number;
  winRateByPlayerCount: Record<number, PlayerCountStat>;
}

interface Stats {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  deckStats: DeckStat[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  if (!stats) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Games" value={stats.totalGames} />
        <StatCard label="Wins" value={stats.wins} />
        <StatCard label="Losses" value={stats.losses} />
        <StatCard label="Win Rate" value={`${stats.winRate}%`} />
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <Link
          href="/games/new"
          className="flex-1 bg-blue-600 text-white text-center py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Log Game
        </Link>
        <Link
          href="/decks/new"
          className="flex-1 border border-gray-300 text-center py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Add Deck
        </Link>
      </div>

      {/* Deck performance */}
      {stats.deckStats.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Deck Performance</h2>
          <div className="space-y-2">
            {stats.deckStats.map((deck) => (
              <Link
                key={deck.id}
                href={`/decks/${deck.id}/edit`}
                className="block p-3 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{deck.name}</div>
                    <div className="text-sm text-gray-500">{deck.commander}{deck.commander2 ? ` & ${deck.commander2}` : ""}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {deck.wins}W - {deck.games - deck.wins}L
                    </div>
                    <div className="text-sm text-gray-500">
                      {deck.winRate}% win rate
                    </div>
                  </div>
                </div>
                {deck.games > 0 && (
                  <div className="flex gap-3 mt-2 pt-2 border-t border-gray-100">
                    {([2, 3, 4] as const).map((count) => {
                      const stat = deck.winRateByPlayerCount[count];
                      return (
                        <div
                          key={count}
                          className="flex-1 text-center text-xs"
                        >
                          <div className="text-gray-400">{count}-player</div>
                          {stat ? (
                            <div className="font-semibold text-gray-700">
                              {stat.winRate}%{" "}
                              <span className="text-gray-400 font-normal">
                                ({stat.games})
                              </span>
                            </div>
                          ) : (
                            <div className="text-gray-300">—</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {stats.totalGames === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No games recorded yet.</p>
          <p className="text-sm mt-1">
            Add a deck and log your first game to get started!
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}

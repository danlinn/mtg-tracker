"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

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
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string })?.id;
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  if (!stats) {
    return <div className="text-center py-12 text-text-tertiary">Loading...</div>;
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
          href="/tracker"
          className="flex-1 bg-accent text-accent-text text-center py-3 rounded-lg font-medium hover:bg-accent-hover transition-colors"
        >
          Track Game
        </Link>
        <Link
          href="/games/new"
          className="flex-1 border border-border-strong text-center py-3 rounded-lg font-medium hover:bg-surface-hover transition-colors"
        >
          Log Game
        </Link>
        <Link
          href="/decks/new"
          className="flex-1 border border-border-strong text-center py-3 rounded-lg font-medium hover:bg-surface-hover transition-colors"
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
                href={userId ? `/players/${userId}/decks/${deck.id}` : `/decks/${deck.id}/edit`}
                className="block p-3 rounded-lg border border-border bg-surface hover:border-accent hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-text-primary">{deck.name}</div>
                    <div className="text-sm text-text-tertiary">{deck.commander}{deck.commander2 ? ` & ${deck.commander2}` : ""}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-text-primary">
                      {deck.wins}W - {deck.games - deck.wins}L
                    </div>
                    <div className="text-sm text-text-tertiary">
                      {deck.winRate}% win rate
                    </div>
                  </div>
                </div>
                {deck.games > 0 && (
                  <div className="flex gap-3 mt-2 pt-2 border-t border-border-light">
                    {([2, 3, 4] as const).map((count) => {
                      const stat = deck.winRateByPlayerCount[count];
                      return (
                        <div
                          key={count}
                          className="flex-1 text-center text-xs"
                        >
                          <div className="text-text-muted">{count}-player</div>
                          {stat ? (
                            <div className="font-semibold text-text-secondary">
                              {stat.winRate}%{" "}
                              <span className="text-text-muted font-normal">
                                ({stat.games})
                              </span>
                            </div>
                          ) : (
                            <div className="text-text-muted">—</div>
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
        <div className="text-center py-8 text-text-tertiary">
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
    <div className="bg-surface border border-border rounded-lg p-4 text-center">
      <div className="text-2xl font-bold text-text-primary">{value}</div>
      <div className="text-sm text-text-tertiary">{label}</div>
    </div>
  );
}

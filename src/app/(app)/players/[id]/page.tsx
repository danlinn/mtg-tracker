"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ColorPips from "@/components/ColorPips";

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
  commanderImage: string | null;
  commander2Image: string | null;
  colorW: boolean;
  colorU: boolean;
  colorB: boolean;
  colorR: boolean;
  colorG: boolean;
  bracket: number | null;
  edhp: number | null;
  games: number;
  wins: number;
  winRate: number;
  winRateByPlayerCount: Record<number, PlayerCountStat>;
}

interface PlayerProfile {
  id: string;
  name: string;
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  deckStats: DeckStat[];
}

export default function PlayerProfilePage() {
  const params = useParams();
  const playerId = params.id as string;
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/players/${playerId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Player not found");
        return r.json();
      })
      .then(setProfile)
      .catch(() => setError("Player not found"));
  }, [playerId]);

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/players" className="text-sm text-text-muted hover:text-text-secondary">&larr; Back to Players</Link>
        <div className="text-center py-12 text-text-tertiary">{error}</div>
      </div>
    );
  }

  if (!profile) {
    return <div className="text-center py-12 text-text-tertiary">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/players" className="text-text-muted hover:text-text-secondary">&larr; Players</Link>
        <span className="text-text-muted">/</span>
        <span className="text-text-secondary font-medium">{profile.name}</span>
      </div>

      <h1 className="text-2xl font-bold">{profile.name}</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Games" value={profile.totalGames} />
        <StatCard label="Wins" value={profile.wins} />
        <StatCard label="Losses" value={profile.losses} />
        <StatCard label="Win Rate" value={`${profile.winRate}%`} />
      </div>

      {/* Deck performance */}
      {profile.deckStats.length > 0 && (
        <div>
          <h2 className="section-heading text-lg font-semibold mb-3">Decks</h2>
          <div className="space-y-2">
            {profile.deckStats.map((deck) => (
              <Link
                key={deck.id}
                href={`/players/${playerId}/decks/${deck.id}`}
                className="block p-3 card-themed rounded-lg border border-border bg-surface card-hover-glow hover:border-accent hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  {deck.commanderImage && (
                    <img
                      src={deck.commanderImage}
                      alt={deck.commander}
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-text-primary">{deck.name}</div>
                        <div className="text-sm text-text-tertiary">
                          {deck.commander}{deck.commander2 ? ` & ${deck.commander2}` : ""}
                        </div>
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
                    <div className="flex items-center gap-3 mt-1">
                      <ColorPips
                        colors={{
                          W: deck.colorW,
                          U: deck.colorU,
                          B: deck.colorB,
                          R: deck.colorR,
                          G: deck.colorG,
                        }}
                      />
                      {deck.bracket != null && (
                        <span className="bg-surface-sunken text-text-secondary px-2 py-0.5 rounded text-xs">
                          Bracket {deck.bracket}
                        </span>
                      )}
                      {deck.edhp != null && (
                        <span className="bg-surface-sunken text-text-secondary px-2 py-0.5 rounded text-xs">
                          EDHP {deck.edhp.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {deck.games > 0 && (
                  <div className="flex gap-3 mt-2 pt-2 border-t border-border-light">
                    {([2, 3, 4] as const).map((count) => {
                      const stat = deck.winRateByPlayerCount[count];
                      return (
                        <div key={count} className="flex-1 text-center text-xs">
                          <div className="text-text-muted">{count}-player</div>
                          {stat ? (
                            <div className="font-semibold text-text-secondary">
                              {stat.winRate}%{" "}
                              <span className="text-text-muted font-normal">
                                ({stat.games})
                              </span>
                            </div>
                          ) : (
                            <div className="text-text-muted">&mdash;</div>
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

      {profile.totalGames === 0 && (
        <div className="text-center py-8 text-text-tertiary">
          No games recorded yet.
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 text-center">
      <div className="text-2xl font-bold text-text-primary">{value}</div>
      <div className="text-sm text-text-tertiary">{label}</div>
    </div>
  );
}

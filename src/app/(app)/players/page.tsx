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
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/leaderboard?page=${page}&perPage=${perPage}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setPlayers(data.entries);
        setTotalPages(data.totalPages);
        setTotal(data.total);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [page, perPage]);

  if (loading) {
    return <div className="text-center py-12 text-text-tertiary">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-text-muted hover:text-text-secondary">&larr; Dashboard</Link>
        <span className="text-text-muted">/</span>
        <h1 className="text-2xl font-bold">Players</h1>
      </div>

      {players.length === 0 && page === 1 ? (
        <div className="text-center py-12 text-text-tertiary">
          No players yet.
        </div>
      ) : (
        <div className="space-y-2">
          {players.map((player) => (
            <Link
              key={player.id}
              href={`/players/${player.id}`}
              className="flex items-center justify-between p-4 card-themed rounded-lg border border-border bg-surface card-hover-glow hover:border-accent hover:shadow-sm transition-all"
            >
              <div>
                <div className="font-medium text-text-primary">{player.name}</div>
                <div className="text-sm text-text-tertiary">
                  {player.games} games played
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-text-primary">
                  {player.wins}W - {player.games - player.wins}L
                </div>
                <div className="text-sm text-text-tertiary">
                  {player.winRate}% win rate
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {total > 0 && (
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-tertiary">Per page:</span>
            <select
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="text-sm border border-border-strong rounded-lg px-2 py-1 bg-surface text-text-primary"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-text-muted">{total} players</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 text-sm rounded-lg border border-border-strong disabled:opacity-30 hover:bg-surface-raised transition-colors"
            >
              Prev
            </button>
            <span className="text-sm text-text-tertiary">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 text-sm rounded-lg border border-border-strong disabled:opacity-30 hover:bg-surface-raised transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

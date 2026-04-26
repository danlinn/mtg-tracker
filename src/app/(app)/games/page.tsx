"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getWinLabel as getWinLabelRaw } from "@/lib/win-labels";

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
  playgroup: { id: string; name: string } | null;
  players: GamePlayer[];
}

const WIN_LABEL_DISPLAY = {
  nice: { text: "Nice Win", color: "text-blue-500" },
  big: { text: "Big Win!", color: "text-yellow-500" },
  easy: { text: "Easy Win", color: "text-text-muted" },
} as const;

function getWinLabel(game: Game): { text: string; color: string } | null {
  const label = getWinLabelRaw(game.players);
  return label ? WIN_LABEL_DISPLAY[label] : null;
}

export default function GamesPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";
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

  async function handleDelete(id: string) {
    if (!confirm("Delete this game? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/games/${id}`, { method: "DELETE" });
    if (res.ok) {
      setGames((prev) => prev.filter((g) => g.id !== id));
      setTotal((t) => t - 1);
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-text-tertiary">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Game History</h1>
        <Link
          href="/games/new"
          className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          Log Game
        </Link>
      </div>

      {games.length === 0 ? (
        <div className="text-center py-12 text-text-tertiary">
          <p>No games recorded yet.</p>
          <Link href="/games/new" className="text-accent hover:underline">
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
                className="p-4 rounded-lg border border-border bg-surface"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-tertiary">
                    {new Date(game.playedAt).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" })}
                    {game.asterisk && <span className="text-yellow-500 ml-1" title="Asterisk">*</span>}
                    {game.playgroup && (
                      <span className="ml-2 text-xs text-text-muted">{game.playgroup.name}</span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    {winLabel && (
                      <span className={`text-xs font-bold ${winLabel.color}`}>
                        {winLabel.text}
                      </span>
                    )}
                    <span className="text-sm font-medium text-success">
                      Winner: {winner?.user.name}
                    </span>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Link
                          href={`/games/${game.id}/edit`}
                          className="text-xs px-2 py-1 rounded bg-surface-sunken text-text-secondary hover:bg-surface-hover transition-colors"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(game.id)}
                          className="text-xs px-2 py-1 rounded bg-danger-bg text-danger hover:bg-red-100 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {game.players.map((p) => (
                    <div
                      key={p.user.id}
                      className={`text-sm p-2 rounded ${
                        p.isWinner
                          ? "bg-success-bg border border-green-200"
                          : "bg-surface-raised"
                      }`}
                    >
                      <div className="font-medium text-text-primary">
                        {p.user.name}
                      </div>
                      <div className="text-text-tertiary text-xs">
                        {p.deck.commander}{p.deck.edhp != null || p.deck.bracket != null ? ` p:${p.deck.edhp != null ? p.deck.edhp.toFixed(2) : "-"}/b:${p.deck.bracket ?? "-"}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
                {game.notes && (
                  <div className="mt-2 text-xs text-text-tertiary italic">
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
            <span className="text-sm text-text-muted">{total} total</span>
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

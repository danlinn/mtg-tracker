"use client";

import { useEffect, useState } from "react";

interface Player {
  userId: string;
  userName: string;
  deckName: string;
  isWinner: boolean;
}

interface Game {
  id: string;
  playedAt: string;
  playgroupId: string | null;
  playgroupName: string | null;
  notes: string | null;
  players: Player[];
}

interface Playgroup {
  id: string;
  name: string;
}

export default function AdminGamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [playgroups, setPlaygroups] = useState<Playgroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unassigned" | string>("all");
  const [saving, setSaving] = useState<string | null>(null);
  const [bulkTarget, setBulkTarget] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/games?perPage=200").then((r) => r.json()),
      fetch("/api/admin/playgroups").then((r) => r.json()),
    ]).then(([gamesData, pgData]) => {
      setGames(gamesData.games ?? []);
      setPlaygroups(pgData.playgroups ?? pgData ?? []);
      setLoading(false);
    });
  }, []);

  const filtered = games.filter((g) => {
    if (filter === "all") return true;
    if (filter === "unassigned") return !g.playgroupId;
    return g.playgroupId === filter;
  });

  const unassignedCount = games.filter((g) => !g.playgroupId).length;

  async function assignGame(gameId: string, playgroupId: string | null) {
    setSaving(gameId);
    setMessage("");
    const res = await fetch(`/api/admin/games/${gameId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playgroupId }),
    });
    if (res.ok) {
      setGames((prev) =>
        prev.map((g) =>
          g.id === gameId
            ? {
                ...g,
                playgroupId,
                playgroupName:
                  playgroups.find((pg) => pg.id === playgroupId)?.name ?? null,
              }
            : g
        )
      );
    }
    setSaving(null);
  }

  async function bulkAssign() {
    if (!bulkTarget) return;
    setBulkSaving(true);
    setMessage("");
    const res = await fetch("/api/admin/backfill-playgroup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playgroupId: bulkTarget }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(`Assigned ${data.gamesAssigned} game(s) to playgroup.`);
      setGames((prev) =>
        prev.map((g) =>
          g.playgroupId === null
            ? {
                ...g,
                playgroupId: bulkTarget,
                playgroupName:
                  playgroups.find((pg) => pg.id === bulkTarget)?.name ?? null,
              }
            : g
        )
      );
    } else {
      setMessage(data.error ?? "Failed to assign.");
    }
    setBulkSaving(false);
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Game Management</h1>

      {unassignedCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
          <div className="text-sm font-medium text-yellow-800">
            {unassignedCount} game{unassignedCount !== 1 ? "s" : ""} not assigned to a playgroup
          </div>
          <div className="flex items-center gap-2">
            <select
              value={bulkTarget}
              onChange={(e) => setBulkTarget(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
            >
              <option value="">Select playgroup...</option>
              {playgroups.map((pg) => (
                <option key={pg.id} value={pg.id}>
                  {pg.name}
                </option>
              ))}
            </select>
            <button
              onClick={bulkAssign}
              disabled={!bulkTarget || bulkSaving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {bulkSaving ? "Assigning..." : "Assign all"}
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm">
          {message}
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Filter:</span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
        >
          <option value="all">All ({games.length})</option>
          <option value="unassigned">Unassigned ({unassignedCount})</option>
          {playgroups.map((pg) => (
            <option key={pg.id} value={pg.id}>
              {pg.name} ({games.filter((g) => g.playgroupId === pg.id).length})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No games match this filter.</div>
        ) : (
          filtered.map((game) => (
            <div
              key={game.id}
              className={`border rounded-lg p-3 space-y-2 ${
                game.playgroupId ? "border-gray-200 bg-white" : "border-yellow-300 bg-yellow-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-900">
                  {new Date(game.playedAt).toLocaleDateString("en-US", {
                    timeZone: "America/Los_Angeles",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
                <div className="text-xs text-gray-500">
                  {game.playgroupId ? game.playgroupName : "Unassigned"}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {game.players.map((p) => (
                  <span
                    key={p.userId}
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      p.isWinner
                        ? "bg-green-100 text-green-800 font-semibold"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {p.userName} — {p.deckName}
                    {p.isWinner ? " ★" : ""}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={game.playgroupId ?? ""}
                  onChange={(e) =>
                    assignGame(game.id, e.target.value || null)
                  }
                  disabled={saving === game.id}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded bg-white text-gray-900 text-sm"
                >
                  <option value="">No playgroup</option>
                  {playgroups.map((pg) => (
                    <option key={pg.id} value={pg.id}>
                      {pg.name}
                    </option>
                  ))}
                </select>
                {saving === game.id && (
                  <span className="text-xs text-gray-400">Saving...</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

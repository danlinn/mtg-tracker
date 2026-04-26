"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

interface UserWithDecks {
  id: string;
  name: string;
  decks: { id: string; name: string; commander: string; edhp: number | null; bracket: number | null }[];
}

interface PlayerEntry {
  userId: string;
  deckId: string;
  isWinner: boolean;
}

interface GameData {
  id: string;
  playedAt: string;
  notes: string | null;
  asterisk: boolean;
  players: {
    user: { id: string; name: string };
    deck: { id: string; name: string; commander: string };
    isWinner: boolean;
  }[];
}

export default function EditGamePage() {
  const router = useRouter();
  const params = useParams();
  const gameId = params.id as string;

  const [users, setUsers] = useState<UserWithDecks[]>([]);
  const [playerCount, setPlayerCount] = useState(2);
  const [players, setPlayers] = useState<PlayerEntry[]>([]);
  const [playedAt, setPlayedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [asterisk, setAsterisk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch(`/api/admin/games/${gameId}`).then((r) => {
        if (!r.ok) throw new Error("Failed to load game");
        return r.json();
      }),
    ])
      .then(([usersData, gameData]: [UserWithDecks[], GameData]) => {
        setUsers(usersData);
        const gamePlayers = gameData.players.map((p) => ({
          userId: p.user.id,
          deckId: p.deck.id,
          isWinner: p.isWinner,
        }));
        setPlayers(gamePlayers);
        setPlayerCount(gamePlayers.length);
        setPlayedAt(
          new Date(gameData.playedAt).toLocaleDateString("en-CA", {
            timeZone: "America/Los_Angeles",
          })
        );
        setNotes(gameData.notes ?? "");
        setAsterisk(gameData.asterisk);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load game. Admin access required.");
        setLoading(false);
      });
  }, [gameId]);

  function updatePlayer(
    index: number,
    field: keyof PlayerEntry,
    value: string | boolean
  ) {
    setPlayers((prev) => {
      const updated = [...prev];
      if (field === "userId") {
        updated[index] = { ...updated[index], userId: value as string, deckId: "" };
      } else if (field === "deckId") {
        updated[index] = { ...updated[index], deckId: value as string };
      } else if (field === "isWinner") {
        updated.forEach((p, i) => {
          updated[i] = { ...p, isWinner: i === index };
        });
      }
      return updated;
    });
  }

  function handlePlayerCountChange(count: number) {
    setPlayerCount(count);
    setPlayers((prev) => {
      if (count > prev.length) {
        return [
          ...prev,
          ...Array.from({ length: count - prev.length }, () => ({
            userId: "",
            deckId: "",
            isWinner: false,
          })),
        ];
      }
      return prev.slice(0, count);
    });
  }

  function getDecksForUser(userId: string) {
    return users.find((u) => u.id === userId)?.decks ?? [];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const activePlayers = players.slice(0, playerCount);

    if (activePlayers.some((p) => !p.userId || !p.deckId)) {
      setError("All players must have a user and deck selected");
      setSaving(false);
      return;
    }

    if (!activePlayers.some((p) => p.isWinner)) {
      setError("Select a winner");
      setSaving(false);
      return;
    }

    const res = await fetch(`/api/admin/games/${gameId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playedAt, players: activePlayers, notes, asterisk }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to update game");
      setSaving(false);
      return;
    }

    router.push("/games");
  }

  if (loading) {
    return <div className="text-center py-12 text-text-tertiary">Loading...</div>;
  }

  if (error && players.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">{error}</p>
        <button
          onClick={() => router.push("/games")}
          className="mt-4 text-accent hover:underline"
        >
          Back to Games
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Game</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-danger-bg text-danger px-4 py-2 rounded text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="date" className="block text-sm font-medium mb-1">
            Date Played
          </label>
          <input
            id="date"
            type="date"
            value={playedAt}
            onChange={(e) => setPlayedAt(e.target.value)}
            className="w-full px-3 py-2 border border-border-strong rounded-lg bg-surface text-text-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Number of Players
          </label>
          <div className="flex gap-2">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handlePlayerCountChange(n)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  playerCount === n
                    ? "btn-primary bg-accent text-white"
                    : "bg-surface-sunken text-text-secondary hover:bg-surface-hover"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {players.slice(0, playerCount).map((player, index) => (
          <div
            key={index}
            className="border border-border rounded-lg p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Player {index + 1}</span>
              <button
                type="button"
                onClick={() => updatePlayer(index, "isWinner", true)}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  player.isWinner
                    ? "bg-green-500 text-white"
                    : "bg-surface-sunken text-text-secondary hover:bg-green-100"
                }`}
              >
                {player.isWinner ? "Winner" : "Set Winner"}
              </button>
            </div>
            <select
              value={player.userId}
              onChange={(e) => updatePlayer(index, "userId", e.target.value)}
              className="w-full px-3 py-2 border border-border-strong rounded-lg bg-surface text-text-primary text-sm"
            >
              <option value="">Select player...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            {player.userId && (
              <select
                value={player.deckId}
                onChange={(e) => updatePlayer(index, "deckId", e.target.value)}
                className="w-full px-3 py-2 border border-border-strong rounded-lg bg-surface text-text-primary text-sm"
              >
                <option value="">Select deck...</option>
                {getDecksForUser(player.userId).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.commander})
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}

        <div>
          <label htmlFor="notes" className="block text-sm font-medium mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional game notes..."
            rows={2}
            className="w-full px-3 py-2 border border-border-strong rounded-lg bg-surface text-text-primary text-sm"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={asterisk}
            onChange={(e) => setAsterisk(e.target.checked)}
            className="w-4 h-4 rounded border-border-strong"
          />
          <span className="text-sm font-medium">Asterisk *</span>
        </label>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/games")}
            className="flex-1 border border-border-strong py-3 rounded-lg font-medium hover:bg-surface-raised transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 btn-primary bg-accent text-white py-3 rounded-lg font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

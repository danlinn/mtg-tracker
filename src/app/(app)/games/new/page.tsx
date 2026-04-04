"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

export default function NewGamePage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserWithDecks[]>([]);
  const [playerCount, setPlayerCount] = useState(4);
  const [players, setPlayers] = useState<PlayerEntry[]>(
    Array.from({ length: 4 }, () => ({ userId: "", deckId: "", isWinner: false }))
  );
  const [playedAt, setPlayedAt] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setUsers);
  }, []);

  function updatePlayer(index: number, field: keyof PlayerEntry, value: string | boolean) {
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
    setLoading(true);
    setError("");

    const activePlayers = players.slice(0, playerCount);

    if (activePlayers.some((p) => !p.userId || !p.deckId)) {
      setError("All players must have a user and deck selected");
      setLoading(false);
      return;
    }

    if (!activePlayers.some((p) => p.isWinner)) {
      setError("Select a winner");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playedAt, players: activePlayers }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to log game");
      setLoading(false);
      return;
    }

    router.push("/games");
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Log Game</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
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
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {players.slice(0, playerCount).map((player, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Player {index + 1}</span>
              <button
                type="button"
                onClick={() => updatePlayer(index, "isWinner", true)}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  player.isWinner
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-green-100"
                }`}
              >
                {player.isWinner ? "Winner" : "Set Winner"}
              </button>
            </div>
            <select
              value={player.userId}
              onChange={(e) => updatePlayer(index, "userId", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
              >
                <option value="">Select deck...</option>
                {getDecksForUser(player.userId).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.commander}){d.edhp != null || d.bracket != null ? ` p:${d.edhp != null ? d.edhp.toFixed(2) : "-"}/b:${d.bracket ?? "-"}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving..." : "Log Game"}
        </button>
      </form>
    </div>
  );
}

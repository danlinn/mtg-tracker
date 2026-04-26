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

const ADD_DECK = "__add_deck__";
const FORM_DRAFT_KEY = "mtg-log-game-draft";
const LAST_GAME_KEY_PREFIX = "mtg-last-game-";

interface SavedDraft {
  playerCount: number;
  players: PlayerEntry[];
  playedAt: string;
  notes: string;
  asterisk: boolean;
  activePlaygroupId: string;
}

function loadDraft(): SavedDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FORM_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveDraft(draft: SavedDraft) {
  if (typeof window === "undefined") return;
  localStorage.setItem(FORM_DRAFT_KEY, JSON.stringify(draft));
}

function clearDraft() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(FORM_DRAFT_KEY);
}

function loadLastGame(playgroupId: string): { playerCount: number; players: PlayerEntry[] } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_GAME_KEY_PREFIX + playgroupId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLastGame(playgroupId: string, playerCount: number, players: PlayerEntry[]) {
  if (typeof window === "undefined") return;
  // Save without winners so prefill doesn't carry last game's winner
  const playersNoWinner = players.map((p) => ({ ...p, isWinner: false }));
  localStorage.setItem(
    LAST_GAME_KEY_PREFIX + playgroupId,
    JSON.stringify({ playerCount, players: playersNoWinner })
  );
}

export default function NewGamePage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserWithDecks[]>([]);
  const [activePlaygroupId, setActivePlaygroupId] = useState<string>("all");
  const [playerCount, setPlayerCount] = useState(4);
  const [players, setPlayers] = useState<PlayerEntry[]>(
    Array.from({ length: 4 }, () => ({ userId: "", deckId: "", isWinner: false }))
  );
  const [playedAt, setPlayedAt] = useState(
    new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" })
  );
  const [notes, setNotes] = useState("");
  const [asterisk, setAsterisk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Load active playgroup and users on mount
  useEffect(() => {
    async function init() {
      const activeRes = await fetch("/api/playgroups/active");
      const activeData = activeRes.ok ? await activeRes.json() : { playgroupId: "all" };
      const pgId = activeData.playgroupId ?? "all";
      setActivePlaygroupId(pgId);

      const usersRes = await fetch(`/api/users?playgroupId=${pgId}`);
      const usersData = usersRes.ok ? await usersRes.json() : [];
      setUsers(Array.isArray(usersData) ? usersData : []);

      // Priority: draft (returning from Add Deck) > last game for playgroup > default
      const draft = loadDraft();
      if (draft && draft.activePlaygroupId === pgId) {
        setPlayerCount(draft.playerCount);
        setPlayers(draft.players);
        setPlayedAt(draft.playedAt);
        setNotes(draft.notes);
        setAsterisk(draft.asterisk);
        clearDraft();
      } else {
        const last = loadLastGame(pgId);
        if (last) {
          setPlayerCount(last.playerCount);
          setPlayers(last.players);
        }
      }
      setInitialized(true);
    }
    init();
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

  function handleDeckChange(index: number, value: string) {
    if (value === ADD_DECK) {
      // Save current form state and navigate to add deck
      saveDraft({
        playerCount,
        players,
        playedAt,
        notes,
        asterisk,
        activePlaygroupId,
      });
      const userId = players[index]?.userId;
      if (userId) {
        router.push(`/admin/users/${userId}/decks/new?returnTo=/games/new`);
      } else {
        router.push("/decks/new?returnTo=/games/new");
      }
      return;
    }
    updatePlayer(index, "deckId", value);
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
      body: JSON.stringify({ playedAt, players: activePlayers, notes, asterisk }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to log game");
      setLoading(false);
      return;
    }

    // Save as last game for this playgroup
    saveLastGame(activePlaygroupId, playerCount, activePlayers);
    clearDraft();
    router.push("/games");
  }

  if (!initialized) {
    return <div className="text-center py-12 text-text-tertiary">Loading...</div>;
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Log Game</h1>
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
          <div key={index} className="border border-border rounded-lg p-3 space-y-2">
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
                onChange={(e) => handleDeckChange(index, e.target.value)}
                className="w-full px-3 py-2 border border-border-strong rounded-lg bg-surface text-text-primary text-sm"
              >
                <option value="">Select deck...</option>
                {getDecksForUser(player.userId).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.commander}){d.edhp != null || d.bracket != null ? ` p:${d.edhp != null ? d.edhp.toFixed(2) : "-"}/b:${d.bracket ?? "-"}` : ""}
                  </option>
                ))}
                <option value={ADD_DECK}>+ Add Deck...</option>
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

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary bg-accent text-white py-3 rounded-lg font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving..." : "Log Game"}
        </button>
      </form>
    </div>
  );
}

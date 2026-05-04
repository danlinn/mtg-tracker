import type { UserWithDecks, DeckInfo } from "./types";

interface SetupScreenProps {
  playerCount: number;
  setPlayerCount: (n: number) => void;
  startLife: number;
  setStartLife: (n: number) => void;
  seatsForCount: { userId: string; deckId: string }[];
  users: UserWithDecks[];
  updateSeat: (idx: number, field: "userId" | "deckId", value: string) => void;
  handleDeckSelect: (value: string, seatIdx: number, context: "setup" | "overlay") => void;
  getDecksFor: (userId: string) => DeckInfo[];
  handleStart: () => void;
  ADD_DECK: string;
}

export function SetupScreen({
  playerCount,
  setPlayerCount,
  startLife,
  setStartLife,
  seatsForCount,
  users,
  updateSeat,
  handleDeckSelect,
  getDecksFor,
  handleStart,
  ADD_DECK,
}: SetupScreenProps) {
  return (
    <div className="max-w-md mx-auto space-y-5 py-6">
      <h1 className="text-2xl font-bold text-center">Life Tracker</h1>

      <div>
        <label className="block text-sm font-medium mb-2">Players</label>
        <div className="flex gap-2">
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => setPlayerCount(n)}
              className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
                playerCount === n
                  ? "bg-accent text-accent-text"
                  : "bg-surface-raised text-text-secondary hover:bg-surface-hover"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Starting Life</label>
        <div className="flex gap-2">
          {[20, 30, 40].map((n) => (
            <button
              key={n}
              onClick={() => setStartLife(n)}
              className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
                startLife === n
                  ? "bg-accent text-accent-text"
                  : "bg-surface-raised text-text-secondary hover:bg-surface-hover"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Per-seat player/deck assignment (optional) */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Assign Players (optional)
        </label>
        <p className="text-xs text-text-muted">
          Fill these in to auto-log the game when a winner is decided.
        </p>
        {seatsForCount.map((seat, i) => {
          return (
            <div key={i} className="border border-border-light rounded-lg p-2 space-y-2">
              <div className="text-xs font-semibold text-text-tertiary">Seat {i + 1}</div>
              <select
                value={seat.userId}
                onChange={(e) => updateSeat(i, "userId", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary text-sm"
              >
                <option value="">Select player...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              {seat.userId && (
                <select
                  value={seat.deckId}
                  onChange={(e) => handleDeckSelect(e.target.value, i, "setup")}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary text-sm"
                >
                  <option value="">Select deck...</option>
                  {getDecksFor(seat.userId).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.commander})
                    </option>
                  ))}
                  <option value={ADD_DECK}>+ Add Deck...</option>
                </select>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleStart}
        className="w-full bg-accent text-accent-text py-3 rounded-lg font-semibold hover:bg-accent-hover transition-colors"
      >
        Start Game
      </button>

      <p className="text-xs text-text-muted text-center">
        Tap the top of any counter to increase, bottom to decrease. Commander
        damage auto-adjusts life. When only one player remains alive, you&apos;ll
        jump to the log game screen (if seats are assigned).
      </p>
    </div>
  );
}

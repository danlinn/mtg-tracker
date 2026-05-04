import type { Player, UserWithDecks, DeckInfo } from "./types";

interface LogGameOverlayProps {
  players: Player[];
  winnerIdx: number;
  users: UserWithDecks[];
  logPlayedAt: string;
  setLogPlayedAt: (v: string) => void;
  logNotes: string;
  setLogNotes: (v: string) => void;
  logAsterisk: boolean;
  setLogAsterisk: (v: boolean) => void;
  logSaving: boolean;
  logError: string;
  logSavedId: string | null;
  onDismiss: () => void;
  onSave: () => void;
  onNewGame: () => void;
  onPlayerChange: (seatIdx: number, userId: string) => void;
  handleDeckSelect: (value: string, seatIdx: number, context: "setup" | "overlay") => void;
  getDecksFor: (userId: string) => DeckInfo[];
  ADD_DECK: string;
}

export function LogGameOverlay({
  players,
  winnerIdx,
  users,
  logPlayedAt,
  setLogPlayedAt,
  logNotes,
  setLogNotes,
  logAsterisk,
  setLogAsterisk,
  logSaving,
  logError,
  logSavedId,
  onDismiss,
  onSave,
  onNewGame,
  onPlayerChange,
  handleDeckSelect,
  getDecksFor,
  ADD_DECK,
}: LogGameOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
      <div className="bg-surface rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border-light sticky top-0 bg-surface">
          <h3 className="font-semibold text-text-primary text-lg">Log game</h3>
          <button
            type="button"
            onClick={onDismiss}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:bg-surface-raised"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {logSavedId ? (
            <div className="space-y-3">
              <div className="bg-success-bg text-success px-3 py-2 rounded text-sm font-medium">
                Game logged.
              </div>
              <button
                type="button"
                onClick={() => {
                  onNewGame();
                }}
                className="w-full py-2 rounded-lg bg-accent text-accent-text font-medium"
              >
                Start new game
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="w-full py-2 rounded-lg border border-border text-text-secondary font-medium hover:bg-surface-hover"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {logError && (
                <div className="bg-danger-bg text-danger px-3 py-2 rounded text-sm">
                  {logError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1 text-text-secondary">
                  Date played
                </label>
                <input
                  type="date"
                  value={logPlayedAt}
                  onChange={(e) => setLogPlayedAt(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-secondary">
                  Seats
                </label>
                {players.map((p, i) => {
                  const user = users.find((u) => u.id === p.userId);
                  const deck = user?.decks.find((d) => d.id === p.deckId);
                  const isWinner = i === winnerIdx;
                  return (
                    <div
                      key={i}
                      className={`border rounded-lg p-2 text-sm ${
                        isWinner
                          ? "border-success bg-success-bg"
                          : "border-border-light"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-text-tertiary">
                          Seat {i + 1}
                        </span>
                        {isWinner && (
                          <span className="text-xs font-bold text-success uppercase">
                            Winner
                          </span>
                        )}
                      </div>
                      <select
                        value={p.userId}
                        onChange={(e) => {
                          onPlayerChange(i, e.target.value);
                        }}
                        className="w-full px-2 py-1 border border-border rounded bg-surface text-text-primary text-sm mb-1"
                      >
                        <option value="">Select player...</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                      {p.userId && (
                        <select
                          value={p.deckId}
                          onChange={(e) => handleDeckSelect(e.target.value, i, "overlay")}
                          className="w-full px-2 py-1 border border-border rounded bg-surface text-text-primary text-sm"
                        >
                          <option value="">Select deck...</option>
                          {getDecksFor(p.userId).map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.commander})
                            </option>
                          ))}
                          <option value={ADD_DECK}>+ Add Deck...</option>
                        </select>
                      )}
                      {deck && (
                        <div className="text-xs text-text-muted mt-1">
                          {deck.name} — {deck.commander}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-text-secondary">
                  Notes
                </label>
                <textarea
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder="Optional..."
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary text-sm"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={logAsterisk}
                  onChange={(e) => setLogAsterisk(e.target.checked)}
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm font-medium text-text-secondary">Asterisk *</span>
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onDismiss}
                  className="flex-1 py-2 rounded-lg border border-border text-text-secondary font-medium hover:bg-surface-hover"
                >
                  Not yet
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={logSaving}
                  className="flex-1 py-2 rounded-lg bg-accent text-accent-text font-medium disabled:opacity-50"
                >
                  {logSaving ? "Saving..." : "Log game"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => onNewGame()}
                className="w-full py-2 rounded-lg text-text-muted text-sm hover:text-text-secondary hover:bg-surface-hover"
              >
                Discard and start new game
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

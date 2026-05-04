import type { Player, UserWithDecks, DeckInfo } from "./types";

interface AssignSeatOverlayProps {
  seatIndex: number;
  player: Player;
  users: UserWithDecks[];
  onPlayerChange: (userId: string) => void;
  handleDeckSelect: (value: string, seatIdx: number, context: "setup" | "overlay") => void;
  getDecksFor: (userId: string) => DeckInfo[];
  onClose: () => void;
  ADD_DECK: string;
}

export function AssignSeatOverlay({
  seatIndex,
  player,
  users,
  onPlayerChange,
  handleDeckSelect,
  getDecksFor,
  onClose,
  ADD_DECK,
}: AssignSeatOverlayProps) {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div
        className="bg-surface rounded-lg p-4 max-w-sm w-full space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-text-primary">
          Assign Seat {seatIndex + 1}
        </h3>
        <select
          value={player.userId ?? ""}
          onChange={(e) => {
            onPlayerChange(e.target.value);
          }}
          className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary text-sm"
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
            value={player.deckId ?? ""}
            onChange={(e) => handleDeckSelect(e.target.value, seatIndex, "overlay")}
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary text-sm"
          >
            <option value="">Select deck...</option>
            {getDecksFor(player.userId).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.commander})
              </option>
            ))}
            <option value={ADD_DECK}>+ Add Deck...</option>
          </select>
        )}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 rounded-lg bg-accent text-accent-text font-medium"
        >
          Done
        </button>
      </div>
    </div>
  );
}

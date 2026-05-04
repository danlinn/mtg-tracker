interface ConfirmDialogProps {
  action: "reset" | "newGame";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ action, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-surface rounded-lg p-5 max-w-sm w-full space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-text-primary text-lg">
          {action === "reset" ? "Reset the game?" : "Start a new game?"}
        </h3>
        <p className="text-sm text-text-tertiary">
          {action === "reset"
            ? "Life totals and commander damage will be reset. Player assignments stay."
            : "The current game will be discarded and you'll return to setup."}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg border border-border text-text-secondary font-medium hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2 rounded-lg bg-accent text-accent-text font-medium"
          >
            {action === "reset" ? "Reset" : "New Game"}
          </button>
        </div>
      </div>
    </div>
  );
}

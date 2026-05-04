import { useRef } from "react";
import { textOn } from "@/lib/themePalettes";
import type { Player } from "./types";

export interface PlayerBoxProps {
  player: Player;
  index: number;
  opponents: { index: number; player: Player; hasPartner: boolean }[];
  onLifeChange: (delta: number) => void;
  onCommanderDamage: (damageKey: string, delta: number) => void;
  onOpenColor: () => void;
  onAssign?: () => void;
  onStartSwap?: () => void;
  rotate?: boolean;
  dead?: boolean;
  deckLabel?: string;
  swapState?: "source" | "target" | null;
  textureOverlay?: string;
}

export function PlayerBox({
  player,
  index,
  opponents,
  onLifeChange,
  onCommanderDamage,
  onOpenColor,
  onAssign,
  onStartSwap,
  rotate,
  dead,
  deckLabel,
  swapState,
  textureOverlay,
}: PlayerBoxProps) {
  const textColor = textOn(player.bgColor);
  const lethal = Object.values(player.damage).some((d) => d >= 21);
  const needsAssignment = !player.userId && !!onAssign;
  const canSwap = !!onStartSwap && !needsAssignment;

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  function startLongPress(e: React.TouchEvent | React.MouseEvent) {
    longPressTriggered.current = false;
    if (needsAssignment) {
      e.preventDefault();
      longPressTimer.current = setTimeout(() => {
        longPressTriggered.current = true;
        onAssign!();
      }, 500);
    } else if (canSwap) {
      e.preventDefault();
      longPressTimer.current = setTimeout(() => {
        longPressTriggered.current = true;
        onStartSwap!();
      }, 500);
    }
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleTap(delta: number) {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    onLifeChange(delta);
  }

  const longPressHandlers = (needsAssignment || canSwap)
    ? {
        onTouchStart: startLongPress,
        onTouchEnd: cancelLongPress,
        onTouchCancel: cancelLongPress,
        onMouseDown: startLongPress,
        onMouseUp: cancelLongPress,
        onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
      }
    : {};

  // Leave a dead zone above the commander damage bar so taps don't
  // hit both the life-change button and a commander-damage button.
  const hasCommander = opponents.length > 0;

  const swapRing = swapState === "source"
    ? "ring-4 ring-inset ring-yellow-400"
    : swapState === "target"
    ? "ring-4 ring-inset ring-green-400"
    : "";

  return (
    <div
      data-player-idx={index}
      className={`relative w-full h-full overflow-hidden select-none ${swapRing}`}
      style={{
        background: textureOverlay ? `${textureOverlay}, ${player.bgColor}` : player.bgColor,
        color: textColor,
        transform: rotate ? "rotate(180deg)" : undefined,
        filter: dead ? "grayscale(1)" : undefined,
        opacity: dead ? 0.45 : 1,
        transition: "filter 300ms, opacity 300ms",
      }}
    >
      {/* Tap zones — even split of the area above the info bar / commander damage.
           When opponents exist, reserve 8rem at the bottom (info bar + commander).
           Each zone gets exactly half the remaining space. */}
      <button
        type="button"
        onClick={() => handleTap(1)}
        className="absolute top-0 left-0 right-0 active:bg-white/10"
        style={hasCommander
          ? { height: "calc(50% - 4rem)" }
          : { height: "50%" }
        }
        aria-label={`Player ${index + 1} +1 life`}
        {...longPressHandlers}
      />
      <button
        type="button"
        onClick={() => handleTap(-1)}
        className="absolute left-0 right-0 active:bg-black/10"
        style={hasCommander
          ? { top: "calc(50% - 4rem)", height: "calc(50% - 4rem)" }
          : { top: "50%", height: "50%" }
        }
        aria-label={`Player ${index + 1} -1 life`}
        {...longPressHandlers}
      />

      <div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        style={{ paddingBottom: opponents.length > 0 ? "8rem" : 0 }}
      >
        <div className="text-7xl sm:text-8xl font-bold tabular-nums" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}>
          {player.life}
        </div>
        {dead && (
          <div className="text-xs font-bold uppercase mt-1 px-2 py-0.5 rounded bg-gray-900 text-white">
            Eliminated
          </div>
        )}
        {!dead && lethal && (
          <div className="text-xs font-bold uppercase mt-1 px-2 py-0.5 rounded bg-red-600 text-white">
            Lethal!
          </div>
        )}
      </div>

      {/* Info bar: name/deck + color picker, between life and commander damage */}
      {opponents.length > 0 && (
        <div
          className="absolute left-0 right-0 flex items-center justify-between px-2 z-10 pointer-events-none"
          style={{ bottom: "6.75rem" }}
        >
          <div
            className="text-xs font-semibold truncate flex-1 mr-2"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}
          >
            {deckLabel || (needsAssignment ? (
              <span className="opacity-60">Hold to assign</span>
            ) : null)}
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenColor(); }}
            className="w-8 h-8 flex items-center justify-center pointer-events-auto"
            aria-label="Change background color"
          >
            <span
              className="w-4 h-4 rounded-full shadow-md border block"
              style={{
                background: "conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)",
                borderColor: textColor,
              }}
            />
          </button>
        </div>
      )}

      {/* Fallback: when no commander damage bar, keep label + color picker at top */}
      {opponents.length === 0 && (
        <>
          {deckLabel ? (
            <div
              className="absolute top-2 left-2 right-12 text-xs font-semibold pointer-events-none truncate z-10"
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}
            >
              {deckLabel}
            </div>
          ) : needsAssignment ? (
            <div
              className="absolute top-2 left-2 right-12 text-xs font-medium pointer-events-none truncate z-10 opacity-60"
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}
            >
              Hold to assign player
            </div>
          ) : null}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenColor(); }}
            className="absolute top-0 right-0 w-11 h-11 z-10 flex items-center justify-center"
            aria-label="Change background color"
          >
            <span
              className="w-5 h-5 rounded-full shadow-md border block"
              style={{
                background: "conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)",
                borderColor: textColor,
              }}
            />
          </button>
        </>
      )}

      {opponents.length > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 flex items-stretch justify-start gap-2 px-2 pb-2 pt-1 z-10"
          style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
        >
          {opponents.map((opp) => {
            const oppBg = opp.player.bgColor;
            const oppText = textOn(oppBg);
            const keys = opp.hasPartner
              ? [{ key: String(opp.index), label: "A" }, { key: `${opp.index}b`, label: "B" }]
              : [{ key: String(opp.index), label: "" }];

            return (
              <div key={opp.index} className="flex-1 flex gap-0.5">
                {keys.map((k) => {
                  const dmg = player.damage[k.key] ?? 0;
                  const isLethal = dmg >= 21;
                  return (
                    <div
                      key={k.key}
                      className={`relative flex-1 h-24 rounded-lg overflow-hidden border-2 select-none ${
                        isLethal ? "border-red-500" : "border-white/30"
                      }`}
                      style={{ background: oppBg, color: oppText }}
                    >
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onCommanderDamage(k.key, 1); }}
                        className="absolute top-0 left-0 right-0 h-1/2 flex items-start justify-center pt-1 active:bg-white/10"
                        aria-label={`+1 commander damage${k.label ? ` (${k.label})` : ""} from player ${opp.index + 1}`}
                      >
                        <span className="text-[10px] font-bold opacity-70">▲</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onCommanderDamage(k.key, -1); }}
                        className="absolute bottom-0 left-0 right-0 h-1/2 flex items-end justify-center pb-1 active:bg-black/10"
                        aria-label={`-1 commander damage${k.label ? ` (${k.label})` : ""} from player ${opp.index + 1}`}
                      >
                        <span className="text-[10px] font-bold opacity-70">▼</span>
                      </button>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        {k.label && (
                          <span className="text-[8px] font-bold opacity-50">{k.label}</span>
                        )}
                        <span className={`${opp.hasPartner ? "text-lg" : "text-2xl"} font-bold tabular-nums`} style={{ textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>
                          {dmg}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

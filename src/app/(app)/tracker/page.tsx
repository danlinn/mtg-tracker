"use client";

import { useState, useCallback, useEffect } from "react";

type ColorKey = "W" | "U" | "B" | "R" | "G" | "C";

interface Player {
  life: number;
  icon: ColorKey;
  bgColor: string;
  damage: Record<number, number>; // damage[opponentIndex] = commander dmg from that opponent
}

// MTG mana-symbol palette — background color + text color for each
const MANA_META: Record<ColorKey, { label: string; bg: string; text: string }> = {
  W: { label: "W", bg: "#f5f5f4", text: "#1a1a1a" },
  U: { label: "U", bg: "#60a5fa", text: "#ffffff" },
  B: { label: "B", bg: "#404040", text: "#f5f5f4" },
  R: { label: "R", bg: "#f87171", text: "#ffffff" },
  G: { label: "G", bg: "#4ade80", text: "#ffffff" },
  C: { label: "C", bg: "#9ca3af", text: "#ffffff" },
};

// Defaults assigned to each seat at start
const DEFAULT_ICONS: ColorKey[] = ["R", "U", "G", "B"];
const COLOR_KEYS: ColorKey[] = ["W", "U", "B", "R", "G", "C"];

// Preset background colors for the color picker
const BG_PRESETS = [
  "#7f1d1d", "#9a3412", "#854d0e", "#166534", "#0c4a6e",
  "#1e3a8a", "#4c1d95", "#831843", "#450a0a", "#111827",
  "#0f172a", "#1f2937", "#f87171", "#fbbf24", "#4ade80",
  "#60a5fa", "#a78bfa", "#f472b6",
];

function makePlayers(count: number, startLife: number): Player[] {
  return Array.from({ length: count }, (_, i) => {
    const icon = DEFAULT_ICONS[i % DEFAULT_ICONS.length];
    return {
      life: startLife,
      icon,
      bgColor: MANA_META[icon].bg,
      damage: {},
    };
  });
}

// Pick readable text color for any given bg
function textOn(bg: string): string {
  const hex = bg.replace("#", "");
  if (hex.length < 6) return "#ffffff";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? "#111827" : "#ffffff";
}

interface PlayerBoxProps {
  player: Player;
  index: number;
  opponents: { index: number; player: Player }[];
  onLifeChange: (delta: number) => void;
  onCommanderDamage: (fromIdx: number, delta: number) => void;
  onOpenColor: () => void;
  onPickIcon: () => void;
  rotate?: boolean;
}

function PlayerBox({
  player,
  index,
  opponents,
  onLifeChange,
  onCommanderDamage,
  onOpenColor,
  onPickIcon,
  rotate,
}: PlayerBoxProps) {
  const textColor = textOn(player.bgColor);
  const iconMeta = MANA_META[player.icon];
  const lethal = Object.values(player.damage).some((d) => d >= 21);

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none"
      style={{
        backgroundColor: player.bgColor,
        color: textColor,
        transform: rotate ? "rotate(180deg)" : undefined,
      }}
    >
      {/* Top half: +1 life */}
      <button
        type="button"
        onClick={() => onLifeChange(1)}
        className="absolute top-0 left-0 right-0 h-1/2 active:bg-white/10"
        aria-label={`Player ${index + 1} +1 life`}
      />
      {/* Bottom half: -1 life */}
      <button
        type="button"
        onClick={() => onLifeChange(-1)}
        className="absolute bottom-0 left-0 right-0 h-1/2 active:bg-black/10"
        aria-label={`Player ${index + 1} -1 life`}
      />

      {/* Center: life total */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-7xl sm:text-8xl font-bold tabular-nums" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}>
          {player.life}
        </div>
        {lethal && (
          <div className="text-xs font-bold uppercase mt-1 px-2 py-0.5 rounded bg-red-600 text-white">
            Lethal!
          </div>
        )}
      </div>

      {/* Player icon (top-left) */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onPickIcon(); }}
        className="absolute top-2 left-2 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-md z-10"
        style={{ backgroundColor: iconMeta.bg, color: iconMeta.text }}
        aria-label="Change player icon"
      >
        {iconMeta.label}
      </button>

      {/* Color picker wheel (top-right) */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onOpenColor(); }}
        className="absolute top-2 right-2 w-10 h-10 rounded-full shadow-md z-10 border-2"
        style={{
          background: "conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)",
          borderColor: textColor,
        }}
        aria-label="Change background color"
      />

      {/* Commander damage row (bottom) */}
      {opponents.length > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 py-2 z-10"
          style={{ backgroundColor: "rgba(0,0,0,0.2)" }}
        >
          {opponents.map((opp) => {
            const dmg = player.damage[opp.index] ?? 0;
            const oppMeta = MANA_META[opp.player.icon];
            const isLethal = dmg >= 21;
            return (
              <div key={opp.index} className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onCommanderDamage(opp.index, 1); }}
                  onContextMenu={(e) => { e.preventDefault(); onCommanderDamage(opp.index, -1); }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow ${
                    isLethal ? "ring-2 ring-red-500" : ""
                  }`}
                  style={{ backgroundColor: oppMeta.bg, color: oppMeta.text }}
                  aria-label={`Commander damage from player ${opp.index + 1}`}
                >
                  {oppMeta.label}
                </button>
                <span className="text-xs font-bold tabular-nums" style={{ color: textColor }}>
                  {dmg}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TrackerPage() {
  const [setupDone, setSetupDone] = useState(false);
  const [playerCount, setPlayerCount] = useState(4);
  const [startLife, setStartLife] = useState(40);
  const [players, setPlayers] = useState<Player[]>([]);
  const [colorPickerFor, setColorPickerFor] = useState<number | null>(null);
  const [iconPickerFor, setIconPickerFor] = useState<number | null>(null);

  // Prevent screen from scrolling / zooming during play
  useEffect(() => {
    if (!setupDone) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [setupDone]);

  function handleStart() {
    setPlayers(makePlayers(playerCount, startLife));
    setSetupDone(true);
  }

  function handleReset() {
    if (!confirm("Reset the game?")) return;
    setPlayers(makePlayers(playerCount, startLife));
  }

  function handleNewGame() {
    setSetupDone(false);
  }

  const updatePlayer = useCallback((idx: number, updater: (p: Player) => Player) => {
    setPlayers((prev) => prev.map((p, i) => (i === idx ? updater(p) : p)));
  }, []);

  const handleLife = useCallback((idx: number, delta: number) => {
    updatePlayer(idx, (p) => ({ ...p, life: p.life + delta }));
  }, [updatePlayer]);

  const handleCommanderDamage = useCallback((toIdx: number, fromIdx: number, delta: number) => {
    setPlayers((prev) => prev.map((p, i) => {
      if (i !== toIdx) return p;
      const current = p.damage[fromIdx] ?? 0;
      const nextDmg = Math.max(0, current + delta);
      const actualDelta = nextDmg - current;
      return {
        ...p,
        life: p.life - actualDelta,
        damage: { ...p.damage, [fromIdx]: nextDmg },
      };
    }));
  }, []);

  // Setup screen
  if (!setupDone) {
    return (
      <div className="max-w-sm mx-auto space-y-6 py-8">
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
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleStart}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Start Game
        </button>

        <p className="text-xs text-gray-500 text-center">
          Tap top of a life total to add, bottom to subtract. Tap a commander
          damage icon to add damage (auto-deducts life). Right-click / long-press
          the icon to remove.
        </p>
      </div>
    );
  }

  // Game layout
  const opponents = (idx: number) =>
    players.map((p, i) => ({ index: i, player: p })).filter((p) => p.index !== idx);

  // Layout by player count
  let layout: React.ReactNode;
  if (playerCount === 2) {
    layout = (
      <div className="fixed inset-0 flex flex-col" style={{ top: "56px" }}>
        <div className="flex-1 min-h-0">
          <PlayerBox
            player={players[0]}
            index={0}
            opponents={opponents(0)}
            onLifeChange={(d) => handleLife(0, d)}
            onCommanderDamage={(from, d) => handleCommanderDamage(0, from, d)}
            onOpenColor={() => setColorPickerFor(0)}
            onPickIcon={() => setIconPickerFor(0)}
            rotate
          />
        </div>
        <div className="flex-1 min-h-0 border-t border-white/20">
          <PlayerBox
            player={players[1]}
            index={1}
            opponents={opponents(1)}
            onLifeChange={(d) => handleLife(1, d)}
            onCommanderDamage={(from, d) => handleCommanderDamage(1, from, d)}
            onOpenColor={() => setColorPickerFor(1)}
            onPickIcon={() => setIconPickerFor(1)}
          />
        </div>
      </div>
    );
  } else if (playerCount === 3) {
    layout = (
      <div className="fixed inset-0 flex flex-col" style={{ top: "56px" }}>
        <div className="flex-1 min-h-0">
          <PlayerBox
            player={players[0]}
            index={0}
            opponents={opponents(0)}
            onLifeChange={(d) => handleLife(0, d)}
            onCommanderDamage={(from, d) => handleCommanderDamage(0, from, d)}
            onOpenColor={() => setColorPickerFor(0)}
            onPickIcon={() => setIconPickerFor(0)}
            rotate
          />
        </div>
        <div className="flex-1 min-h-0 border-t border-white/20 flex">
          <div className="flex-1 min-w-0">
            <PlayerBox
              player={players[1]}
              index={1}
              opponents={opponents(1)}
              onLifeChange={(d) => handleLife(1, d)}
              onCommanderDamage={(from, d) => handleCommanderDamage(1, from, d)}
              onOpenColor={() => setColorPickerFor(1)}
              onPickIcon={() => setIconPickerFor(1)}
            />
          </div>
          <div className="flex-1 min-w-0 border-l border-white/20">
            <PlayerBox
              player={players[2]}
              index={2}
              opponents={opponents(2)}
              onLifeChange={(d) => handleLife(2, d)}
              onCommanderDamage={(from, d) => handleCommanderDamage(2, from, d)}
              onOpenColor={() => setColorPickerFor(2)}
              onPickIcon={() => setIconPickerFor(2)}
            />
          </div>
        </div>
      </div>
    );
  } else {
    // 4 players
    layout = (
      <div className="fixed inset-0 flex flex-col" style={{ top: "56px" }}>
        <div className="flex-1 min-h-0 flex">
          <div className="flex-1 min-w-0">
            <PlayerBox
              player={players[0]}
              index={0}
              opponents={opponents(0)}
              onLifeChange={(d) => handleLife(0, d)}
              onCommanderDamage={(from, d) => handleCommanderDamage(0, from, d)}
              onOpenColor={() => setColorPickerFor(0)}
              onPickIcon={() => setIconPickerFor(0)}
              rotate
            />
          </div>
          <div className="flex-1 min-w-0 border-l border-white/20">
            <PlayerBox
              player={players[1]}
              index={1}
              opponents={opponents(1)}
              onLifeChange={(d) => handleLife(1, d)}
              onCommanderDamage={(from, d) => handleCommanderDamage(1, from, d)}
              onOpenColor={() => setColorPickerFor(1)}
              onPickIcon={() => setIconPickerFor(1)}
              rotate
            />
          </div>
        </div>
        <div className="flex-1 min-h-0 border-t border-white/20 flex">
          <div className="flex-1 min-w-0">
            <PlayerBox
              player={players[2]}
              index={2}
              opponents={opponents(2)}
              onLifeChange={(d) => handleLife(2, d)}
              onCommanderDamage={(from, d) => handleCommanderDamage(2, from, d)}
              onOpenColor={() => setColorPickerFor(2)}
              onPickIcon={() => setIconPickerFor(2)}
            />
          </div>
          <div className="flex-1 min-w-0 border-l border-white/20">
            <PlayerBox
              player={players[3]}
              index={3}
              opponents={opponents(3)}
              onLifeChange={(d) => handleLife(3, d)}
              onCommanderDamage={(from, d) => handleCommanderDamage(3, from, d)}
              onOpenColor={() => setColorPickerFor(3)}
              onPickIcon={() => setIconPickerFor(3)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {layout}

      {/* Floating control: reset / new game */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        <button
          onClick={handleReset}
          className="px-3 py-1.5 rounded-full bg-gray-900/80 text-white text-xs font-medium backdrop-blur"
        >
          Reset
        </button>
        <button
          onClick={handleNewGame}
          className="px-3 py-1.5 rounded-full bg-gray-900/80 text-white text-xs font-medium backdrop-blur"
        >
          New Game
        </button>
      </div>

      {/* Color picker modal */}
      {colorPickerFor !== null && (
        <div
          className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4"
          onClick={() => setColorPickerFor(null)}
        >
          <div
            className="bg-white rounded-lg p-4 max-w-sm w-full space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-gray-900">Pick a color</h3>
            <div className="grid grid-cols-6 gap-2">
              {BG_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    updatePlayer(colorPickerFor, (p) => ({ ...p, bgColor: c }));
                    setColorPickerFor(null);
                  }}
                  className="w-full aspect-square rounded-lg border border-gray-200"
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Custom:</label>
              <input
                type="color"
                value={players[colorPickerFor].bgColor}
                onChange={(e) => {
                  const v = e.target.value;
                  updatePlayer(colorPickerFor, (p) => ({ ...p, bgColor: v }));
                }}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>
            <button
              onClick={() => setColorPickerFor(null)}
              className="w-full py-2 rounded-lg bg-blue-600 text-white font-medium"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Icon picker modal */}
      {iconPickerFor !== null && (
        <div
          className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4"
          onClick={() => setIconPickerFor(null)}
        >
          <div
            className="bg-white rounded-lg p-4 max-w-sm w-full space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-gray-900">Pick an icon</h3>
            <div className="flex gap-3 justify-center">
              {COLOR_KEYS.map((c) => {
                const meta = MANA_META[c];
                return (
                  <button
                    key={c}
                    onClick={() => {
                      updatePlayer(iconPickerFor, (p) => ({ ...p, icon: c }));
                      setIconPickerFor(null);
                    }}
                    className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold shadow-md"
                    style={{ backgroundColor: meta.bg, color: meta.text }}
                    aria-label={meta.label}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setIconPickerFor(null)}
              className="w-full py-2 rounded-lg bg-blue-600 text-white font-medium"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}

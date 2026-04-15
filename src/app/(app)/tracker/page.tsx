"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type ColorKey = "W" | "U" | "B" | "R" | "G" | "C";

interface Player {
  life: number;
  icon: ColorKey;
  bgColor: string;
  damage: Record<number, number>;
  userId: string; // playgroup user assigned to this seat (optional, empty = unassigned)
  deckId: string; // deck assigned to this seat (optional)
}

interface UserWithDecks {
  id: string;
  name: string;
  decks: { id: string; name: string; commander: string }[];
}

// Gem-toned MTG palette. Each color's `hex` is used for backgrounds
// and gradients; Scryfall's official mana SVG is used for the icon.
const MANA_META: Record<
  ColorKey,
  { label: string; hex: string; text: string; svg: string }
> = {
  W: { label: "W", hex: "#e8dfb8", text: "#2d261a", svg: "https://svgs.scryfall.io/card-symbols/W.svg" }, // pearl
  U: { label: "U", hex: "#0e6bb0", text: "#ffffff", svg: "https://svgs.scryfall.io/card-symbols/U.svg" }, // sapphire
  B: { label: "B", hex: "#1c1a1a", text: "#e8dfb8", svg: "https://svgs.scryfall.io/card-symbols/B.svg" }, // onyx
  R: { label: "R", hex: "#b21e35", text: "#ffffff", svg: "https://svgs.scryfall.io/card-symbols/R.svg" }, // ruby
  G: { label: "G", hex: "#1d6b3a", text: "#ffffff", svg: "https://svgs.scryfall.io/card-symbols/G.svg" }, // emerald
  C: { label: "C", hex: "#8a8a8a", text: "#ffffff", svg: "https://svgs.scryfall.io/card-symbols/C.svg" }, // colorless
};

// Defaults for seats 1-4 (gem order)
const DEFAULT_ICONS: ColorKey[] = ["R", "U", "G", "B"];
const COLOR_KEYS: ColorKey[] = ["W", "U", "B", "R", "G", "C"];
// Gradient order: Black, Blue, Red, Green, White — matches the deck cards
const GRADIENT_ORDER: ColorKey[] = ["B", "U", "R", "G", "W"];
const COMBO_KEYS: ColorKey[] = ["W", "U", "B", "R", "G"]; // WUBRG only (no C in combos)

// Generate a CSS background for a given combo of colors.
// Single color = solid; multi-color = linear gradient in BURGW order.
function bgForCombo(combo: ColorKey[]): string {
  if (combo.length === 0) return MANA_META.C.hex;
  const ordered = GRADIENT_ORDER.filter((c) => combo.includes(c));
  if (ordered.length === 1) return MANA_META[ordered[0]].hex;
  return `linear-gradient(135deg, ${ordered.map((c) => MANA_META[c].hex).join(", ")})`;
}

// All 31 non-empty subsets of WUBRG + colorless = 32 presets
function allCombos(): { key: string; combo: ColorKey[]; bg: string }[] {
  const out: { key: string; combo: ColorKey[]; bg: string }[] = [
    { key: "C", combo: [], bg: MANA_META.C.hex },
  ];
  for (let mask = 1; mask < 1 << 5; mask++) {
    const combo: ColorKey[] = [];
    COMBO_KEYS.forEach((c, i) => {
      if (mask & (1 << i)) combo.push(c);
    });
    const ordered = GRADIENT_ORDER.filter((c) => combo.includes(c));
    out.push({ key: ordered.join(""), combo: ordered, bg: bgForCombo(combo) });
  }
  // Sort by: color count ascending, then by GRADIENT_ORDER index of first color
  return out.sort((a, b) => {
    if (a.combo.length !== b.combo.length) return a.combo.length - b.combo.length;
    return a.key.localeCompare(b.key);
  });
}

const BG_PRESETS = allCombos();

// Matches the /games/new page's localStorage draft shape
const FORM_DRAFT_KEY = "mtg-log-game-draft";

// Per-tab session persistence so navigating to other pages doesn't
// wipe the in-flight game. Cleared only on "New Game" or when the
// browser tab closes.
const SESSION_KEY = "mtg-tracker-session";

interface TrackerSession {
  setupDone: boolean;
  playerCount: number;
  startLife: number;
  players: Player[];
  seatAssignments: { userId: string; deckId: string }[];
}

function loadSession(): TrackerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(session: TrackerSession) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Non-fatal
  }
}

function clearSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
}

function makePlayers(count: number, startLife: number): Player[] {
  return Array.from({ length: count }, (_, i) => {
    const icon = DEFAULT_ICONS[i % DEFAULT_ICONS.length];
    return {
      life: startLife,
      icon,
      bgColor: MANA_META[icon].hex,
      damage: {},
      userId: "",
      deckId: "",
    };
  });
}

function textOn(bg: string): string {
  // Gradients: sample the first hex in the string
  const match = bg.match(/#[0-9a-fA-F]{6}/);
  if (!match) return "#ffffff";
  const hex = match[0].replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? "#111827" : "#ffffff";
}

// Determine the right CSS property for a color value that may be a
// hex, rgb(), or a `linear-gradient(...)` expression.
function backgroundStyle(bg: string): React.CSSProperties {
  return { background: bg };
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
  dead?: boolean;
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
  dead,
}: PlayerBoxProps) {
  const textColor = textOn(player.bgColor);
  const iconMeta = MANA_META[player.icon];
  const lethal = Object.values(player.damage).some((d) => d >= 21);

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none"
      style={{
        background: player.bgColor,
        color: textColor,
        transform: rotate ? "rotate(180deg)" : undefined,
        filter: dead ? "grayscale(1)" : undefined,
        opacity: dead ? 0.45 : 1,
        transition: "filter 300ms, opacity 300ms",
      }}
    >
      {/* Tap zones — still active when dead, so you can revive */}
      <button
        type="button"
        onClick={() => onLifeChange(1)}
        className="absolute top-0 left-0 right-0 h-1/2 active:bg-white/10"
        aria-label={`Player ${index + 1} +1 life`}
      />
      <button
        type="button"
        onClick={() => onLifeChange(-1)}
        className="absolute bottom-0 left-0 right-0 h-1/2 active:bg-black/10"
        aria-label={`Player ${index + 1} -1 life`}
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
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

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onPickIcon(); }}
        className="absolute top-2 left-2 w-10 h-10 rounded-full bg-white shadow-md z-10 p-1 flex items-center justify-center"
        aria-label="Change player icon"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconMeta.svg} alt={iconMeta.label} className="w-full h-full" />
      </button>

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

      {opponents.length > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 flex items-stretch justify-center gap-2 px-2 pb-2 pt-1 z-10"
          style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
        >
          {opponents.map((opp) => {
            const dmg = player.damage[opp.index] ?? 0;
            const oppMeta = MANA_META[opp.player.icon];
            const isLethal = dmg >= 21;
            return (
              <div
                key={opp.index}
                className={`relative flex-1 max-w-[120px] h-20 rounded-lg overflow-hidden border-2 select-none ${
                  isLethal ? "border-red-500" : "border-white/30"
                }`}
                style={{ backgroundColor: oppMeta.hex, color: oppMeta.text }}
              >
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onCommanderDamage(opp.index, 1); }}
                  className="absolute top-0 left-0 right-0 h-1/2 flex items-start justify-center pt-1 active:bg-white/10"
                  aria-label={`+1 commander damage from player ${opp.index + 1}`}
                >
                  <span className="text-[10px] font-bold opacity-70">▲</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onCommanderDamage(opp.index, -1); }}
                  className="absolute bottom-0 left-0 right-0 h-1/2 flex items-end justify-center pb-1 active:bg-black/10"
                  aria-label={`-1 commander damage from player ${opp.index + 1}`}
                >
                  <span className="text-[10px] font-bold opacity-70">▼</span>
                </button>
                <div className="absolute inset-0 flex items-center justify-center gap-1.5 pointer-events-none">
                  <span className="w-6 h-6 rounded-full bg-white p-0.5 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={oppMeta.svg} alt={oppMeta.label} className="w-full h-full" />
                  </span>
                  <span className="text-2xl font-bold tabular-nums">{dmg}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TrackerPage() {
  const router = useRouter();
  // Hydrate from sessionStorage if we have a game in progress this tab
  const saved = typeof window !== "undefined" ? loadSession() : null;
  const [setupDone, setSetupDone] = useState(saved?.setupDone ?? false);
  const [playerCount, setPlayerCount] = useState(saved?.playerCount ?? 4);
  const [startLife, setStartLife] = useState(saved?.startLife ?? 40);
  const [players, setPlayers] = useState<Player[]>(saved?.players ?? []);
  const [users, setUsers] = useState<UserWithDecks[]>([]);
  const [colorPickerFor, setColorPickerFor] = useState<number | null>(null);
  const [iconPickerFor, setIconPickerFor] = useState<number | null>(null);
  const [seatAssignments, setSeatAssignments] = useState<
    { userId: string; deckId: string }[]
  >(saved?.seatAssignments ?? []);
  const autoLogTriggeredRef = useRef(false);

  // Persist to sessionStorage on every relevant change
  useEffect(() => {
    saveSession({ setupDone, playerCount, startLife, players, seatAssignments });
  }, [setupDone, playerCount, startLife, players, seatAssignments]);

  // Load users (scoped to active playgroup via helper)
  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []));
  }, []);

  // Derive seats sized to the current playerCount without writing state
  // in an effect (pads with empty entries or truncates).
  const seatsForCount = Array.from({ length: playerCount }, (_, i) =>
    seatAssignments[i] ?? { userId: "", deckId: "" }
  );

  // Prevent screen from scrolling during play
  useEffect(() => {
    if (!setupDone) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [setupDone]);

  // Win detection: when exactly one player is alive, auto-log the game
  useEffect(() => {
    if (!setupDone || autoLogTriggeredRef.current || players.length === 0) return;
    const alive = players
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.life > 0);
    if (alive.length !== 1) return;

    // Only auto-log if every seat has both user and deck assigned
    const allAssigned = players.every((p) => p.userId && p.deckId);
    if (!allAssigned) return;

    const winnerIdx = alive[0].i;
    autoLogTriggeredRef.current = true;

    (async () => {
      // Get active playgroup id to match the log-game page's draft check
      let activePlaygroupId = "all";
      try {
        const res = await fetch("/api/playgroups/active");
        const data = await res.json();
        activePlaygroupId = data.playgroupId ?? "all";
      } catch {
        // non-fatal
      }

      const draft = {
        playerCount: players.length,
        players: players.map((p, i) => ({
          userId: p.userId,
          deckId: p.deckId,
          isWinner: i === winnerIdx,
        })),
        playedAt: new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }),
        notes: "",
        asterisk: false,
        activePlaygroupId,
      };
      localStorage.setItem(FORM_DRAFT_KEY, JSON.stringify(draft));
      // Clear the tracker session so returning to /tracker starts fresh
      clearSession();
      router.push("/games/new");
    })();
  }, [setupDone, players, router]);

  function handleStart() {
    const ps = makePlayers(playerCount, startLife).map((p, i) => ({
      ...p,
      userId: seatsForCount[i]?.userId ?? "",
      deckId: seatsForCount[i]?.deckId ?? "",
    }));
    setPlayers(ps);
    setSetupDone(true);
    autoLogTriggeredRef.current = false;
  }

  function handleReset() {
    if (!confirm("Reset the game?")) return;
    setPlayers((prev) =>
      prev.map((p) => ({ ...p, life: startLife, damage: {} }))
    );
    autoLogTriggeredRef.current = false;
  }

  function handleNewGame() {
    setSetupDone(false);
    setPlayers([]);
    autoLogTriggeredRef.current = false;
    clearSession();
  }

  const updatePlayer = useCallback(
    (idx: number, updater: (p: Player) => Player) => {
      setPlayers((prev) => prev.map((p, i) => (i === idx ? updater(p) : p)));
    },
    []
  );

  const handleLife = useCallback(
    (idx: number, delta: number) => {
      updatePlayer(idx, (p) => ({ ...p, life: p.life + delta }));
    },
    [updatePlayer]
  );

  const handleCommanderDamage = useCallback(
    (toIdx: number, fromIdx: number, delta: number) => {
      setPlayers((prev) =>
        prev.map((p, i) => {
          if (i !== toIdx) return p;
          const current = p.damage[fromIdx] ?? 0;
          const nextDmg = Math.max(0, current + delta);
          const actualDelta = nextDmg - current;
          return {
            ...p,
            life: p.life - actualDelta,
            damage: { ...p.damage, [fromIdx]: nextDmg },
          };
        })
      );
    },
    []
  );

  function updateSeat(idx: number, field: "userId" | "deckId", value: string) {
    setSeatAssignments((prev) =>
      prev.map((s, i) => {
        if (i !== idx) return s;
        if (field === "userId") return { userId: value, deckId: "" };
        return { ...s, [field]: value };
      })
    );
  }

  function getDecksFor(userId: string) {
    return users.find((u) => u.id === userId)?.decks ?? [];
  }

  // Setup screen
  if (!setupDone) {
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

        {/* Per-seat player/deck assignment (optional) */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Assign Players (optional)
          </label>
          <p className="text-xs text-gray-500">
            Fill these in to auto-log the game when a winner is decided.
          </p>
          {seatsForCount.map((seat, i) => {
            return (
              <div key={i} className="border border-gray-200 rounded-lg p-2 space-y-2">
                <div className="text-xs font-semibold text-gray-600">Seat {i + 1}</div>
                <select
                  value={seat.userId}
                  onChange={(e) => updateSeat(i, "userId", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
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
                    onChange={(e) => updateSeat(i, "deckId", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
                  >
                    <option value="">Select deck...</option>
                    {getDecksFor(seat.userId).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.commander})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={handleStart}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Start Game
        </button>

        <p className="text-xs text-gray-500 text-center">
          Tap the top of any counter to increase, bottom to decrease. Commander
          damage auto-adjusts life. When only one player remains alive, you&apos;ll
          jump to the log game screen (if seats are assigned).
        </p>
      </div>
    );
  }

  // Game layout
  const opponents = (idx: number) =>
    players.map((p, i) => ({ index: i, player: p })).filter((p) => p.index !== idx);
  const isDead = (p: Player) => p.life <= 0;

  const renderBox = (idx: number, rotate?: boolean) => (
    <PlayerBox
      player={players[idx]}
      index={idx}
      opponents={opponents(idx)}
      onLifeChange={(d) => handleLife(idx, d)}
      onCommanderDamage={(from, d) => handleCommanderDamage(idx, from, d)}
      onOpenColor={() => setColorPickerFor(idx)}
      onPickIcon={() => setIconPickerFor(idx)}
      rotate={rotate}
      dead={isDead(players[idx])}
    />
  );

  let layout: React.ReactNode;
  if (playerCount === 2) {
    layout = (
      <div className="fixed inset-0 flex flex-col" style={{ top: "56px" }}>
        <div className="flex-1 min-h-0">{renderBox(0, true)}</div>
        <div className="flex-1 min-h-0 border-t border-white/20">{renderBox(1)}</div>
      </div>
    );
  } else if (playerCount === 3) {
    layout = (
      <div className="fixed inset-0 flex flex-col" style={{ top: "56px" }}>
        <div className="flex-1 min-h-0">{renderBox(0, true)}</div>
        <div className="flex-1 min-h-0 border-t border-white/20 flex">
          <div className="flex-1 min-w-0">{renderBox(1)}</div>
          <div className="flex-1 min-w-0 border-l border-white/20">{renderBox(2)}</div>
        </div>
      </div>
    );
  } else {
    layout = (
      <div className="fixed inset-0 flex flex-col" style={{ top: "56px" }}>
        <div className="flex-1 min-h-0 flex">
          <div className="flex-1 min-w-0">{renderBox(0, true)}</div>
          <div className="flex-1 min-w-0 border-l border-white/20">{renderBox(1, true)}</div>
        </div>
        <div className="flex-1 min-h-0 border-t border-white/20 flex">
          <div className="flex-1 min-w-0">{renderBox(2)}</div>
          <div className="flex-1 min-w-0 border-l border-white/20">{renderBox(3)}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {layout}

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
            <div className="grid grid-cols-6 gap-2 max-h-80 overflow-y-auto">
              {BG_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => {
                    updatePlayer(colorPickerFor, (p) => ({ ...p, bgColor: preset.bg }));
                    setColorPickerFor(null);
                  }}
                  className="w-full aspect-square rounded-lg border border-gray-300 flex items-end justify-center text-[10px] font-bold p-0.5"
                  style={backgroundStyle(preset.bg)}
                  aria-label={preset.key}
                >
                  <span className="px-1 rounded bg-black/40 text-white">{preset.key}</span>
                </button>
              ))}
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Custom:</label>
              <input
                type="color"
                value={
                  players[colorPickerFor].bgColor.startsWith("#")
                    ? players[colorPickerFor].bgColor
                    : "#000000"
                }
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
                    className="w-14 h-14 rounded-full bg-white shadow-md p-1.5 flex items-center justify-center"
                    aria-label={meta.label}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={meta.svg} alt={meta.label} className="w-full h-full" />
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

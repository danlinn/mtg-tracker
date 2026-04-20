"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useThemePalette } from "@/lib/theme";
import { DEFAULT_PALETTE } from "@/lib/themePalettes";
import type { Palette, ColorKey } from "@/lib/themePalettes";

interface Player {
  life: number;
  bgColor: string;
  bgKey: string | null; // palette combo key (e.g. "R", "BU"), null = custom color
  damage: Record<number, number>;
  userId: string;
  deckId: string;
}

interface UserWithDecks {
  id: string;
  name: string;
  decks: { id: string; name: string; commander: string }[];
}

// Gradient order: Black, Blue, Red, Green, White — matches the deck cards
const GRADIENT_ORDER: ColorKey[] = ["B", "U", "R", "G", "W"];
const COMBO_KEYS: ColorKey[] = ["W", "U", "B", "R", "G"]; // WUBRG only (no C in combos)

// Generate a CSS background for a given combo of colors.
// Single color = solid; multi-color = linear gradient in BURGW order.
function bgForCombo(combo: ColorKey[], palette: Palette): string {
  if (combo.length === 0) return palette.C.hex;
  const ordered = GRADIENT_ORDER.filter((c) => combo.includes(c));
  if (ordered.length === 1) return palette[ordered[0]].hex;
  return `linear-gradient(135deg, ${ordered.map((c) => palette[c].hex).join(", ")})`;
}

// All 31 non-empty subsets of WUBRG + colorless = 32 presets, computed
// from the active palette so preset swatches match the theme.
function allCombos(palette: Palette): { key: string; combo: ColorKey[]; bg: string }[] {
  const out: { key: string; combo: ColorKey[]; bg: string }[] = [
    { key: "C", combo: [], bg: palette.C.hex },
  ];
  for (let mask = 1; mask < 1 << 5; mask++) {
    const combo: ColorKey[] = [];
    COMBO_KEYS.forEach((c, i) => {
      if (mask & (1 << i)) combo.push(c);
    });
    const ordered = GRADIENT_ORDER.filter((c) => combo.includes(c));
    out.push({ key: ordered.join(""), combo: ordered, bg: bgForCombo(combo, palette) });
  }
  // Sort by: color count ascending, then by GRADIENT_ORDER index of first color
  return out.sort((a, b) => {
    if (a.combo.length !== b.combo.length) return a.combo.length - b.combo.length;
    return a.key.localeCompare(b.key);
  });
}

// Seats 1-4 each get a distinct default color key + resolved hex.
const DEFAULT_SEAT_KEYS: string[] = ["R", "U", "G", "B"];

function defaultSeatColors(palette: Palette): { hex: string; key: string }[] {
  return DEFAULT_SEAT_KEYS.map((k) => ({
    hex: palette[k as ColorKey].hex,
    key: k,
  }));
}

// Resolve a bgKey to a CSS background from the current palette.
function resolveBg(bgKey: string | null, bgColor: string, palette: Palette): string {
  if (!bgKey) return bgColor;
  // Single color key (e.g. "R", "C")
  if (bgKey.length === 1) {
    return bgKey === "C" ? palette.C.hex : palette[bgKey as ColorKey]?.hex ?? bgColor;
  }
  // Combo key (e.g. "BU", "BURG")
  const combo = bgKey.split("") as ColorKey[];
  return bgForCombo(combo, palette);
}

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
  seatOrder?: number[];
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

function makePlayers(count: number, startLife: number, palette: Palette): Player[] {
  const seats = defaultSeatColors(palette);
  return Array.from({ length: count }, (_, i) => {
    const seat = seats[i % seats.length];
    return {
      life: startLife,
      bgColor: seat.hex,
      bgKey: seat.key,
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

type Corner = "tl" | "tr" | "bl" | "br";

const CORNER_CLASSES: Record<Corner, string> = {
  tl: "top-2 left-2",
  tr: "top-2 right-2",
  bl: "bottom-24 left-2",
  br: "bottom-24 right-2",
};

interface PlayerBoxProps {
  player: Player;
  index: number;
  opponents: { index: number; player: Player }[];
  onLifeChange: (delta: number) => void;
  onCommanderDamage: (fromIdx: number, delta: number) => void;
  onOpenColor: () => void;
  palette: Palette;
  rotate?: boolean;
  dead?: boolean;
  playerName?: string;
  deckName?: string;
  colorCorner?: Corner;
  dragTarget?: boolean;
}

function PlayerBox({
  player,
  index,
  opponents,
  onLifeChange,
  onCommanderDamage,
  onOpenColor,
  palette,
  rotate,
  dead,
  playerName,
  deckName,
  colorCorner = "tr",
  dragTarget,
}: PlayerBoxProps) {
  const resolvedBg = resolveBg(player.bgKey, player.bgColor, palette);
  const textColor = textOn(resolvedBg);
  const lethal = Object.values(player.damage).some((d) => d >= 21);

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none"
      style={{
        background: resolvedBg,
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

      <div className="absolute inset-0 flex flex-col items-center pointer-events-none" style={{ justifyContent: "center", paddingBottom: opponents.length > 0 ? "5rem" : "0" }}>
        <div className="text-7xl sm:text-8xl font-bold tabular-nums" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}>
          {player.life}
        </div>
        {(playerName || deckName) && !dead && (
          <div className="text-[11px] font-medium mt-1 px-2 py-0.5 rounded bg-black/30 text-white max-w-[80%] truncate text-center">
            {playerName}{deckName ? ` — ${deckName}` : ""}
          </div>
        )}
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
        onClick={(e) => { e.stopPropagation(); onOpenColor(); }}
        className={`absolute ${CORNER_CLASSES[colorCorner]} w-10 h-10 rounded-full shadow-md z-10 border-2`}
        style={{
          background: "conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)",
          borderColor: textColor,
        }}
        aria-label="Change background color"
      />

      {opponents.length > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 flex items-stretch justify-start gap-2 px-2 pb-2 pt-1 z-10"
          style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
        >
          {opponents.map((opp) => {
            const dmg = player.damage[opp.index] ?? 0;
            const oppBg = resolveBg(opp.player.bgKey, opp.player.bgColor, palette);
            const oppText = textOn(oppBg);
            const isLethal = dmg >= 21;
            return (
              <div
                key={opp.index}
                className={`relative flex-1 max-w-[120px] h-20 rounded-lg overflow-hidden border-2 select-none ${
                  isLethal ? "border-red-500" : "border-white/30"
                }`}
                style={{ background: oppBg, color: oppText }}
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
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold tabular-nums" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>
                    {dmg}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {dragTarget && (
        <div
          className="absolute inset-0 z-30 pointer-events-none border-4 border-yellow-400"
          style={{ boxShadow: "inset 0 0 20px rgba(250, 204, 21, 0.4)" }}
        />
      )}
    </div>
  );
}

export default function TrackerPage() {
  const router = useRouter();
  const palette = useThemePalette();
  const BG_PRESETS = useMemo(() => allCombos(palette), [palette]);
  // Hydrate from sessionStorage if we have a game in progress this tab
  const saved = typeof window !== "undefined" ? loadSession() : null;
  const [setupDone, setSetupDone] = useState(saved?.setupDone ?? false);
  const [playerCount, setPlayerCount] = useState(saved?.playerCount ?? 4);
  const [startLife, setStartLife] = useState(saved?.startLife ?? 40);
  const [players, setPlayers] = useState<Player[]>(saved?.players ?? []);
  const [users, setUsers] = useState<UserWithDecks[]>([]);
  const [colorPickerFor, setColorPickerFor] = useState<number | null>(null);
  const [pickerShowDefaults, setPickerShowDefaults] = useState(false);
  const DEFAULT_BG_PRESETS = useMemo(() => allCombos(DEFAULT_PALETTE), []);
  const [seatAssignments, setSeatAssignments] = useState<
    { userId: string; deckId: string }[]
  >(saved?.seatAssignments ?? []);
  const autoLogTriggeredRef = useRef(false);

  // Seat order: maps visual position → player index. Swapping two
  // entries rearranges which player appears in which quadrant.
  const [seatOrder, setSeatOrder] = useState<number[]>(
    saved?.seatOrder ?? Array.from({ length: saved?.playerCount ?? 4 }, (_, i) => i)
  );
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  // Persist to sessionStorage on every relevant change
  useEffect(() => {
    saveSession({ setupDone, playerCount, startLife, players, seatAssignments, seatOrder });
  }, [setupDone, playerCount, startLife, players, seatAssignments, seatOrder]);

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
    const ps = makePlayers(playerCount, startLife, palette).map((p, i) => ({
      ...p,
      userId: seatsForCount[i]?.userId ?? "",
      deckId: seatsForCount[i]?.deckId ?? "",
    }));
    setPlayers(ps);
    setSeatOrder(Array.from({ length: playerCount }, (_, i) => i));
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
    if (!confirm("Start a new game? Current game will be lost.")) return;
    setSetupDone(false);
    setPlayers([]);
    autoLogTriggeredRef.current = false;
    clearSession();
  }

  function updatePlayer(idx: number, updater: (p: Player) => Player) {
    setPlayers((prev) => prev.map((p, i) => (i === idx ? updater(p) : p)));
  }

  function handleLife(idx: number, delta: number) {
    updatePlayer(idx, (p) => ({ ...p, life: p.life + delta }));
  }

  function handleCommanderDamage(toIdx: number, fromIdx: number, delta: number) {
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
  }

  function updateSeat(idx: number, field: "userId" | "deckId", value: string) {
    setSeatAssignments((prev) => {
      // Ensure the array is large enough for the index
      const padded = Array.from({ length: Math.max(prev.length, idx + 1) }, (_, i) =>
        prev[i] ?? { userId: "", deckId: "" }
      );
      return padded.map((s, i) => {
        if (i !== idx) return s;
        if (field === "userId") return { userId: value, deckId: "" };
        return { ...s, [field]: value };
      });
    });
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
  const isDead = (p: Player) =>
    p.life <= 0 || Object.values(p.damage).some((d) => d >= 21);

  function seatLabel(idx: number): { playerName?: string; deckName?: string } {
    const p = players[idx];
    if (!p) return {};
    const user = users.find((u) => u.id === p.userId);
    const deck = user?.decks.find((d) => d.id === p.deckId);
    return {
      playerName: user?.name,
      deckName: deck?.name,
    };
  }

  function swapSeats(a: number, b: number) {
    setSeatOrder((prev) => {
      const next = [...prev];
      [next[a], next[b]] = [next[b], next[a]];
      return next;
    });
  }

  function handleBoxTouchStart(visualPos: number, e: React.TouchEvent) {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    longPressTimer.current = setTimeout(() => {
      setDragFrom(visualPos);
    }, 500);
  }

  // Determine which visual slot a touch point falls in by coordinates.
  function slotFromPoint(x: number, y: number): number | null {
    const navH = window.innerWidth >= 1024 ? 104 : 56;
    const areaTop = navH;
    const areaH = window.innerHeight - areaTop;
    const relY = y - areaTop;
    if (relY < 0 || relY > areaH) return null;
    const midY = areaH / 2;
    const midX = window.innerWidth / 2;

    if (playerCount === 2) {
      return relY < midY ? 0 : 1;
    } else if (playerCount === 3) {
      if (relY < midY) return 0;
      return x < midX ? 1 : 2;
    } else {
      const row = relY < midY ? 0 : 1;
      const col = x < midX ? 0 : 1;
      return row * 2 + col;
    }
  }

  function handleBoxTouchMove(e: React.TouchEvent) {
    const touch = e.touches[0];
    if (longPressTimer.current && touchStartPos.current) {
      const dx = touch.clientX - touchStartPos.current.x;
      const dy = touch.clientY - touchStartPos.current.y;
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
    if (dragFrom === null) return;
    e.preventDefault();
    const pos = slotFromPoint(touch.clientX, touch.clientY);
    setDragOver(pos !== null && pos !== dragFrom ? pos : null);
  }

  function handleBoxTouchEnd() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (dragFrom !== null && dragOver !== null) {
      swapSeats(dragFrom, dragOver);
    }
    setDragFrom(null);
    setDragOver(null);
    touchStartPos.current = null;
  }

  const renderBox = (idx: number, rotate?: boolean, colorCorner?: Corner, isDragTarget?: boolean) => {
    const { playerName, deckName } = seatLabel(idx);
    return (
      <PlayerBox
        player={players[idx]}
        index={idx}
        opponents={opponents(idx)}
        onLifeChange={(d) => handleLife(idx, d)}
        onCommanderDamage={(from, d) => handleCommanderDamage(idx, from, d)}
        onOpenColor={() => setColorPickerFor(idx)}
        palette={palette}
        rotate={rotate}
        dead={isDead(players[idx])}
        playerName={playerName}
        deckName={deckName}
        colorCorner={colorCorner}
        dragTarget={isDragTarget}
      />
    );
  };

  // Layout fills the viewport on mobile (sticky 56px nav) and fills the
  // remaining space on desktop (where the nav is in flow and takes ~104px).
  // Using `fixed inset-0 top-*` is viewport-relative so it works the same
  // regardless of page scroll.
  // Map visual positions to the corner where the color wheel should sit
  // so it's always at a screen edge, never at a shared border.
  // For rotated boxes: CSS coords flip, so we specify the code-side position
  // that renders at the desired visual corner.
  function cornerForSlot(visualPos: number): Corner {
    if (playerCount === 2) {
      // Pos 0 = top (rotated): visual top-right → code bottom-left
      // Pos 1 = bottom: visual bottom-right
      return visualPos === 0 ? "bl" : "br";
    }
    if (playerCount === 3) {
      // Pos 0 = top full (rotated): visual top-right → code bottom-left
      // Pos 1 = bottom-left: visual bottom-left
      // Pos 2 = bottom-right: visual bottom-right
      if (visualPos === 0) return "bl";
      return visualPos === 1 ? "bl" : "br";
    }
    // 4 players (2×2):
    // Pos 0 = top-left (rotated): visual top-left → code bottom-right
    // Pos 1 = top-right (rotated): visual top-right → code bottom-left
    // Pos 2 = bottom-left: visual bottom-left
    // Pos 3 = bottom-right: visual bottom-right
    const corners: Corner[] = ["br", "bl", "bl", "br"];
    return corners[visualPos];
  }

  const slot = (visualPos: number, rotate?: boolean) => {
    const playerIdx = seatOrder[visualPos];
    const isDragSource = dragFrom === visualPos;
    const isDragTarget = dragOver === visualPos;
    return (
      <div
        data-seat={visualPos}
        className="flex-1 min-h-0 min-w-0 relative"
        style={{
          opacity: isDragSource ? 0.5 : 1,
          transition: "opacity 150ms",
        }}
        onTouchStart={(e) => handleBoxTouchStart(visualPos, e)}
        onTouchMove={(e) => handleBoxTouchMove(e)}
        onTouchEnd={handleBoxTouchEnd}
      >
        {renderBox(playerIdx, rotate, cornerForSlot(visualPos), isDragTarget)}
      </div>
    );
  };

  let layout: React.ReactNode;
  if (playerCount === 2) {
    layout = (
      <div className="fixed inset-0 top-14 lg:top-[104px] flex flex-col">
        {slot(0, true)}
        {slot(1)}
      </div>
    );
  } else if (playerCount === 3) {
    layout = (
      <div className="fixed inset-0 top-14 lg:top-[104px] flex flex-col">
        {slot(0, true)}
        <div className="flex-1 min-h-0 border-t border-white/20 flex">
          {slot(1)}
          {slot(2)}
        </div>
      </div>
    );
  } else {
    layout = (
      <div className="fixed inset-0 top-14 lg:top-[104px] flex flex-col">
        <div className="flex-1 min-h-0 flex">
          {slot(0, true)}
          {slot(1, true)}
        </div>
        <div className="flex-1 min-h-0 border-t border-white/20 flex">
          {slot(2)}
          {slot(3)}
        </div>
      </div>
    );
  }

  return (
    <>
      {layout}

      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex gap-3">
        <button
          onClick={handleReset}
          className="w-10 h-10 rounded-full bg-gray-900/80 text-white backdrop-blur flex items-center justify-center"
          aria-label="Reset game"
          title="Reset"
        >
          {/* Circle arrow (reset) */}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.49 9A9 9 0 005.64 5.64L4 4m16 16l-1.64-1.64A9 9 0 013.51 15" />
          </svg>
        </button>
        <button
          onClick={handleNewGame}
          className="w-10 h-10 rounded-full bg-gray-900/80 text-white backdrop-blur flex items-center justify-center"
          aria-label="New game"
          title="New Game"
        >
          {/* Plus sign */}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {colorPickerFor !== null && (
        <div
          className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4"
          onClick={() => { setColorPickerFor(null); setPickerShowDefaults(false); }}
        >
          <div
            className="bg-white rounded-lg p-4 max-w-sm w-full space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Pick a color</h3>
              <button
                onClick={() => setPickerShowDefaults(!pickerShowDefaults)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                {pickerShowDefaults ? "Themed colors" : "Default colors"}
              </button>
            </div>
            <div className="grid grid-cols-6 gap-2 max-h-80 overflow-y-auto">
              {(pickerShowDefaults ? DEFAULT_BG_PRESETS : BG_PRESETS).map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => {
                    updatePlayer(colorPickerFor, (p) => ({
                      ...p,
                      bgColor: preset.bg,
                      bgKey: pickerShowDefaults ? null : preset.key,
                    }));
                    setColorPickerFor(null);
                    setPickerShowDefaults(false);
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
                  updatePlayer(colorPickerFor, (p) => ({ ...p, bgColor: v, bgKey: null }));
                }}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>
            <button
              onClick={() => { setColorPickerFor(null); setPickerShowDefaults(false); }}
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

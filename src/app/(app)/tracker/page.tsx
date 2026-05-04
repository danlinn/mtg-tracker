"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTheme, useThemePalette, type ThemeName } from "@/lib/theme";
import type { Palette, ColorKey } from "@/lib/themePalettes";
import { textOn, comboForDeck } from "@/lib/themePalettes";
import { GRADIENT_ORDER, COMBO_KEYS, bgForComboStyled, GRADIENT_STYLES, THEME_DEFAULT_GRADIENT, type GradientStyleName } from "@/lib/gradientStyles";
import { THEME_DEFAULT_TEXTURE, getTextureBackground } from "@/lib/textures";
import { DEFAULT_SEAT_COMBOS, isAlive } from "@/lib/tracker-logic";
import PlaygroupSwitcher from "@/components/PlaygroupSwitcher";

interface Player {
  life: number;
  bgColor: string;
  colorCombo: ColorKey[] | null;
  gradientStyle: GradientStyleName;
  damage: Record<string, number>; // keys: "0", "0b" (partner), "1", "1b", etc
  userId: string;
  deckId: string;
}

interface DeckInfo {
  id: string;
  name: string;
  commander: string;
  commander2: string | null;
  colorW: boolean;
  colorU: boolean;
  colorB: boolean;
  colorR: boolean;
  colorG: boolean;
}

interface UserWithDecks {
  id: string;
  name: string;
  decks: DeckInfo[];
}

function bgForCombo(combo: ColorKey[], palette: Palette): string {
  return bgForComboStyled(combo, palette, "linear");
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

const STARTER_GRADIENTS: GradientStyleName[] = GRADIENT_STYLES
  .filter((s) => !s.minColors && !s.maxColors)
  .map((s) => s.name);

function makePlayers(count: number, startLife: number, palette: Palette, gradientStyle: GradientStyleName): Player[] {
  return Array.from({ length: count }, (_, i) => {
    const combo = DEFAULT_SEAT_COMBOS[i % DEFAULT_SEAT_COMBOS.length];
    const style = STARTER_GRADIENTS[i % STARTER_GRADIENTS.length] ?? gradientStyle;
    return {
      life: startLife,
      bgColor: bgForComboStyled(combo, palette, style),
      colorCombo: combo,
      gradientStyle: style,
      damage: {},
      userId: "",
      deckId: "",
    };
  });
}


// Determine the right CSS property for a color value that may be a
// hex, rgb(), or a `linear-gradient(...)` expression.
function backgroundStyle(bg: string): React.CSSProperties {
  return { background: bg };
}

interface PlayerBoxProps {
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

function PlayerBox({
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

export default function TrackerPage() {
  const { theme, setTheme } = useTheme();
  const palette = useThemePalette();
  const defaultGradient = THEME_DEFAULT_GRADIENT[theme] ?? "linear";
  const textureOverlay = getTextureBackground(THEME_DEFAULT_TEXTURE[theme] ?? "none");
  const BG_PRESETS = useMemo(() => allCombos(palette), [palette]);
  // Hydrate from sessionStorage if we have a game in progress this tab
  const saved = typeof window !== "undefined" ? loadSession() : null;
  const [setupDone, setSetupDone] = useState(saved?.setupDone ?? false);
  const [playerCount, setPlayerCount] = useState(saved?.playerCount ?? 4);
  const [startLife, setStartLife] = useState(saved?.startLife ?? 40);
  const [players, setPlayers] = useState<Player[]>(saved?.players ?? []);
  const [users, setUsers] = useState<UserWithDecks[]>([]);
  const [colorPickerFor, setColorPickerFor] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<"reset" | "newGame" | null>(null);
  const [seatAssignments, setSeatAssignments] = useState<
    { userId: string; deckId: string }[]
  >(saved?.seatAssignments ?? []);

  // Log-game overlay state. Opens automatically when exactly one
  // player is still alive; can be dismissed via the close button so
  // the user can revive someone instead of logging.
  const [logOverlayOpen, setLogOverlayOpen] = useState(false);
  const [logOverlayDismissed, setLogOverlayDismissed] = useState(false);
  const [logPlayedAt, setLogPlayedAt] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" })
  );
  const [logNotes, setLogNotes] = useState("");
  const [logAsterisk, setLogAsterisk] = useState(false);
  const [logSaving, setLogSaving] = useState(false);
  const [logError, setLogError] = useState("");
  const [logSavedId, setLogSavedId] = useState<string | null>(null);
  const [assignSeatFor, setAssignSeatFor] = useState<number | null>(null);
  const [swapSource, setSwapSource] = useState<number | null>(null);
  const [swapTarget, setSwapTarget] = useState<number | null>(null);
  const [showNav, setShowNav] = useState(false);

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

  // Re-derive bgColor from colorCombo when the palette changes (theme switch)
  useEffect(() => {
    if (players.length === 0) return;
    setPlayers((prev) =>
      prev.map((p) =>
        p.colorCombo
          ? { ...p, bgColor: bgForComboStyled(p.colorCombo, palette, p.gradientStyle), gradientStyle: defaultGradient }
          : p
      )
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette, defaultGradient]);

  // Prevent screen from scrolling during play
  useEffect(() => {
    if (!setupDone) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [setupDone]);

  // Keep the screen awake while the tracker is active
  useEffect(() => {
    if (!setupDone) return;
    let wakeLock: WakeLockSentinel | null = null;
    async function acquire() {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch { /* non-fatal — user denied or unsupported */ }
    }
    acquire();
    const reacquire = () => { if (document.visibilityState === "visible") acquire(); };
    document.addEventListener("visibilitychange", reacquire);
    return () => {
      document.removeEventListener("visibilitychange", reacquire);
      wakeLock?.release();
    };
  }, [setupDone]);


  // Winner detection: when exactly one player is alive, pop the log
  // overlay. Keeping it as an overlay (instead of navigating away)
  // means the user can close it and revive someone by tapping +1 life.
  const aliveIndices = players
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => isAlive(p))
    .map(({ i }) => i);
  const winnerIdx = aliveIndices.length === 1 ? aliveIndices[0] : null;

  // Auto-reset the dismiss flag whenever the "one alive" condition
  // becomes false (e.g. a revive or a new game). This way if the game
  // returns to one-alive again later, the overlay pops back up.
  useEffect(() => {
    if (winnerIdx === null) setLogOverlayDismissed(false);
  }, [winnerIdx]);

  // Auto-open the overlay the first time we reach one-alive (until
  // the user dismisses it for this window).
  useEffect(() => {
    if (setupDone && winnerIdx !== null && !logOverlayDismissed) {
      setLogOverlayOpen(true);
    } else {
      setLogOverlayOpen(false);
    }
  }, [setupDone, winnerIdx, logOverlayDismissed]);

  function deckComboForSeat(userId: string, deckId: string): ColorKey[] | null {
    if (!userId || !deckId) return null;
    const user = users.find((u) => u.id === userId);
    const deck = user?.decks.find((d) => d.id === deckId);
    if (!deck) return null;
    return comboForDeck(deck);
  }

  function handleStart() {
    const ps = makePlayers(playerCount, startLife, palette, defaultGradient).map((p, i) => {
      const seat = seatsForCount[i];
      const combo = deckComboForSeat(seat?.userId ?? "", seat?.deckId ?? "");
      return {
        ...p,
        userId: seat?.userId ?? "",
        deckId: seat?.deckId ?? "",
        ...(combo ? { colorCombo: combo, bgColor: bgForComboStyled(combo, palette, defaultGradient) } : {}),
      };
    });
    setPlayers(ps);
    setSetupDone(true);
    setLogOverlayDismissed(false);
    setLogSavedId(null);
    setLogNotes("");
    setLogAsterisk(false);
  }

  function handleReset() {
    setPlayers((prev) =>
      prev.map((p) => ({ ...p, life: startLife, damage: {} }))
    );
    setLogOverlayDismissed(false);
    setLogSavedId(null);
    setLogNotes("");
    setLogAsterisk(false);
  }

  function handleNewGame() {
    setSetupDone(false);
    setPlayers([]);
    setLogOverlayDismissed(false);
    setLogSavedId(null);
    setLogNotes("");
    setLogAsterisk(false);
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
    (toIdx: number, damageKey: string, delta: number) => {
      setPlayers((prev) =>
        prev.map((p, i) => {
          if (i !== toIdx) return p;
          const current = p.damage[damageKey] ?? 0;
          const nextDmg = Math.max(0, current + delta);
          const actualDelta = nextDmg - current;
          return {
            ...p,
            life: p.life - actualDelta,
            damage: { ...p.damage, [damageKey]: nextDmg },
          };
        })
      );
    },
    []
  );

  function updateSeat(idx: number, field: "userId" | "deckId", value: string) {
    setSeatAssignments((prev) => {
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

  function handleStartSwap(idx: number) {
    setSwapSource(idx);
    setSwapTarget(null);
  }

  function handleTouchMoveSwap(e: React.TouchEvent) {
    if (swapSource === null) return;
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const pod = el?.closest("[data-player-idx]");
    if (pod) {
      const targetIdx = Number(pod.getAttribute("data-player-idx"));
      setSwapTarget(targetIdx !== swapSource ? targetIdx : null);
    } else {
      setSwapTarget(null);
    }
  }

  function handleEndSwap() {
    if (swapSource !== null && swapTarget !== null && swapSource !== swapTarget) {
      setPlayers((prev) => {
        const next = [...prev];
        const temp = next[swapSource];
        next[swapSource] = next[swapTarget];
        next[swapTarget] = temp;
        return next;
      });
    }
    setSwapSource(null);
    setSwapTarget(null);
  }

  function getDecksFor(userId: string) {
    return users.find((u) => u.id === userId)?.decks ?? [];
  }

  const ADD_DECK = "__add_deck__";
  function handleDeckSelect(value: string, seatIdx: number, context: "setup" | "overlay") {
    if (value === ADD_DECK) {
      const userId = context === "setup"
        ? seatsForCount[seatIdx]?.userId
        : players[seatIdx]?.userId;
      if (userId) {
        window.location.href = `/decks/new?forUser=${userId}&returnTo=/tracker`;
      } else {
        window.location.href = "/decks/new?returnTo=/tracker";
      }
      return;
    }
    if (context === "setup") {
      updateSeat(seatIdx, "deckId", value);
    } else {
      setPlayers((prev) =>
        prev.map((pp, ii) => {
          if (ii !== seatIdx) return pp;
          const combo = deckComboForSeat(pp.userId, value);
          if (combo) {
            return { ...pp, deckId: value, colorCombo: combo, bgColor: bgForComboStyled(combo, palette, pp.gradientStyle ?? defaultGradient) };
          }
          return { ...pp, deckId: value };
        })
      );
    }
  }

  async function handleSaveGame() {
    if (winnerIdx === null) return;
    const missing = players.some((p) => !p.userId || !p.deckId);
    if (missing) {
      setLogError("Every seat needs a player and a deck.");
      return;
    }
    const userIds = players.map((p) => p.userId);
    if (new Set(userIds).size !== userIds.length) {
      setLogError("Each seat must be a different player.");
      return;
    }
    setLogSaving(true);
    setLogError("");
    try {
      let activePlaygroupId: string | undefined;
      try {
        const pgRes = await fetch("/api/playgroups/active");
        const pgData = await pgRes.json();
        activePlaygroupId = pgData.playgroupId ?? undefined;
      } catch { /* non-fatal */ }

      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playedAt: logPlayedAt,
          notes: logNotes,
          asterisk: logAsterisk,
          playgroupId: activePlaygroupId,
          players: players.map((p, i) => ({
            userId: p.userId,
            deckId: p.deckId,
            isWinner: i === winnerIdx,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail = data.error ?? `Server returned ${res.status}`;
        setLogError(`Failed to save: ${detail}`);
        setLogSaving(false);
        return;
      }
      const data = await res.json().catch(() => ({}));
      setLogSavedId(data?.id ?? "saved");
    } catch {
      setLogError("Network error. Please try again.");
    } finally {
      setLogSaving(false);
    }
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
                    onChange={(e) => handleDeckSelect(e.target.value, i, "setup")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
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
  // Sort opponents so their damage boxes align spatially with their
  // position on the board. For rotated pods, reverse the order since
  // 180° rotation mirrors the horizontal axis.
  function hasPartnerDeck(p: Player): boolean {
    if (!p.userId || !p.deckId) return false;
    const user = users.find((u) => u.id === p.userId);
    const deck = user?.decks.find((d) => d.id === p.deckId);
    return !!deck?.commander2;
  }

  function spatialOpponents(idx: number, rotate: boolean) {
    const opps = players
      .map((p, i) => ({ index: i, player: p, hasPartner: hasPartnerDeck(p) }))
      .filter((p) => p.index !== idx);

    if (playerCount <= 2) return opps;

    if (playerCount === 3) {
      // Layout: [0 full-width rotated] / [1] [2]
      const order: Record<number, number[]> = {
        0: [1, 2],   // screen L→R after rotation flip: [2,1] in code
        1: [0, 2],   // above, then right
        2: [1, 0],   // left, then above
      };
      const seq = rotate ? [...(order[idx] ?? [])].reverse() : (order[idx] ?? []);
      return seq.map((i) => opps.find((o) => o.index === i)!).filter(Boolean);
    }

    // 4-player: [0][1] rotated / [2][3]
    // Desired screen L→R for each player:
    const order: Record<number, number[]> = {
      0: [2, 3, 1],   // across-left, across-right, adjacent
      1: [0, 2, 3],   // adjacent, across-left, across-right
      2: [0, 1, 3],   // above-left, above-right, adjacent
      3: [2, 0, 1],   // adjacent, above-left, above-right
    };
    const seq = rotate ? [...(order[idx] ?? [])].reverse() : (order[idx] ?? []);
    return seq.map((i) => opps.find((o) => o.index === i)!).filter(Boolean);
  }

  const isDead = (p: Player) => !isAlive(p);

  const deckLabelFor = (p: Player) => {
    if (!p.userId || !p.deckId) return "";
    const user = users.find((u) => u.id === p.userId);
    const deck = user?.decks.find((d) => d.id === p.deckId);
    if (!deck) return "";
    return `${user?.name ?? ""} — ${deck.commander}`;
  };

  const swapStateFor = (idx: number) =>
    swapSource === idx ? "source" as const
    : swapTarget === idx ? "target" as const
    : null;

  const renderBox = (idx: number, rotate?: boolean) => (
    <PlayerBox
      player={players[idx]}
      index={idx}
      opponents={spatialOpponents(idx, !!rotate)}
      onLifeChange={(d) => handleLife(idx, d)}
      onCommanderDamage={(key, d) => handleCommanderDamage(idx, key, d)}
      onOpenColor={() => setColorPickerFor(idx)}
      onAssign={() => setAssignSeatFor(idx)}
      onStartSwap={() => handleStartSwap(idx)}
      rotate={rotate}
      dead={isDead(players[idx])}
      deckLabel={deckLabelFor(players[idx])}
      swapState={swapStateFor(idx)}
      textureOverlay={textureOverlay}
    />
  );

  // Layout fills the viewport below the nav. Uses absolute positioning
  // inside the tracker wrapper (which is also absolute), keeping
  // everything below the nav's z-50 stacking context.
  let layout: React.ReactNode;
  if (playerCount === 2) {
    layout = (
      <div className="absolute inset-0 flex flex-col">
        <div className="flex-1 min-h-0">{renderBox(0, true)}</div>
        <div className="flex-1 min-h-0 border-t border-white/20">{renderBox(1)}</div>
      </div>
    );
  } else if (playerCount === 3) {
    layout = (
      <div className="absolute inset-0 flex flex-col">
        <div className="flex-1 min-h-0">{renderBox(0, true)}</div>
        <div className="flex-1 min-h-0 border-t border-white/20 flex">
          <div className="flex-1 min-w-0">{renderBox(1)}</div>
          <div className="flex-1 min-w-0 border-l border-white/20">{renderBox(2)}</div>
        </div>
      </div>
    );
  } else {
    layout = (
      <div className="absolute inset-0 flex flex-col">
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
    <div
      className="fixed inset-0 z-40 overflow-hidden"
      onTouchMove={handleTouchMoveSwap}
      onTouchEnd={handleEndSwap}
      onTouchCancel={() => { setSwapSource(null); setSwapTarget(null); }}
      onMouseMove={(e) => {
        if (swapSource === null) return;
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const pod = el?.closest("[data-player-idx]");
        if (pod) {
          const targetIdx = Number(pod.getAttribute("data-player-idx"));
          setSwapTarget(targetIdx !== swapSource ? targetIdx : null);
        } else {
          setSwapTarget(null);
        }
      }}
      onMouseUp={handleEndSwap}
    >
      {layout}

      {/* Pull-down nav trigger */}
      {!showNav && (
        <div
          className="absolute top-0 left-0 right-0 h-8 z-50"
          onTouchStart={() => setShowNav(true)}
          onClick={() => setShowNav(true)}
        >
          <div className="w-12 h-1 bg-white/30 rounded-full mx-auto mt-3" />
        </div>
      )}

      {/* Nav overlay */}
      {showNav && (
        <div className="absolute inset-0 z-50 flex flex-col">
          <div className="bg-nav-bg/95 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="nav-logo font-bold text-lg text-nav-text-hover">MTG Tracker</span>
              <button
                type="button"
                onClick={() => setShowNav(false)}
                className="text-nav-text-muted hover:text-nav-text-hover p-2"
                aria-label="Close menu"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-4 pb-3 space-y-1 border-t border-nav-border">
              {[
                { href: "/dashboard", label: "Dashboard" },
                { href: "/decks", label: "Decks" },
                { href: "/games", label: "Games" },
                { href: "/players", label: "Players" },
                { href: "/stats", label: "Stats" },
                { href: "/leaderboard", label: "Leaderboard" },
                { href: "/playgroups", label: "Groups" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2 rounded text-sm font-medium text-nav-text hover:text-nav-text-hover hover:bg-nav-hover-bg"
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-2 pt-2 border-t border-nav-border space-y-1">
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-sm text-nav-text-muted">Group</span>
                  <PlaygroupSwitcher />
                </div>
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-sm text-nav-text-muted">Theme</span>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as ThemeName)}
                    className="bg-nav-select-bg text-nav-text text-sm rounded px-2 py-1 border border-nav-select-border"
                  >
                    {(["default","synth","cyber","flame","chris","phyrexia","stained-glass","dungeon","neon-dynasty","grixis"] as const).map((v) => (
                      <option key={v} value={v}>{v === "stained-glass" ? "Stained Glass" : v === "neon-dynasty" ? "Neon Dynasty" : v.charAt(0).toUpperCase() + v.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => {
                    if ("caches" in window) {
                      caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
                    }
                    window.location.reload();
                  }}
                  className="block w-full text-left px-3 py-2 text-sm text-nav-text-muted hover:text-nav-text-hover"
                >
                  Reload App
                </button>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="block w-full text-left px-3 py-2 text-sm text-nav-text-muted hover:text-nav-text-hover"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1" onClick={() => setShowNav(false)} />
        </div>
      )}

      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center gap-3"
      >
        <button
          type="button"
          onClick={() => setConfirmAction("reset")}
          className="w-12 h-12 rounded-full bg-gray-900/80 text-white backdrop-blur shadow-lg flex items-center justify-center active:bg-gray-900"
          aria-label="Reset game"
        >
          <svg
            className="w-6 h-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <polyline points="3 3 3 9 9 9" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setConfirmAction("newGame")}
          className="w-12 h-12 rounded-full bg-gray-900/80 text-white backdrop-blur shadow-lg flex items-center justify-center active:bg-gray-900"
          aria-label="New game"
        >
          <svg
            className="w-6 h-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {confirmAction && (
        <div
          className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
          onClick={() => setConfirmAction(null)}
        >
          <div
            className="bg-white rounded-lg p-5 max-w-sm w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-gray-900 text-lg">
              {confirmAction === "reset" ? "Reset the game?" : "Start a new game?"}
            </h3>
            <p className="text-sm text-gray-600">
              {confirmAction === "reset"
                ? "Life totals and commander damage will be reset. Player assignments stay."
                : "The current game will be discarded and you'll return to setup."}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmAction === "reset") {
                    handleReset();
                  } else {
                    handleNewGame();
                  }
                  setConfirmAction(null);
                }}
                className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-medium"
              >
                {confirmAction === "reset" ? "Reset" : "New Game"}
              </button>
            </div>
          </div>
        </div>
      )}

      {logOverlayOpen && winnerIdx !== null && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900 text-lg">Log game</h3>
              <button
                type="button"
                onClick={() => setLogOverlayDismissed(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100"
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
                  <div className="bg-green-50 text-green-700 px-3 py-2 rounded text-sm font-medium">
                    Game logged.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleNewGame();
                    }}
                    className="w-full py-2 rounded-lg bg-blue-600 text-white font-medium"
                  >
                    Start new game
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogOverlayDismissed(true)}
                    className="w-full py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  {logError && (
                    <div className="bg-red-50 text-red-700 px-3 py-2 rounded text-sm">
                      {logError}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Date played
                    </label>
                    <input
                      type="date"
                      value={logPlayedAt}
                      onChange={(e) => setLogPlayedAt(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
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
                              ? "border-green-500 bg-green-50"
                              : "border-gray-200"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-600">
                              Seat {i + 1}
                            </span>
                            {isWinner && (
                              <span className="text-xs font-bold text-green-700 uppercase">
                                Winner
                              </span>
                            )}
                          </div>
                          <select
                            value={p.userId}
                            onChange={(e) => {
                              const v = e.target.value;
                              setPlayers((prev) =>
                                prev.map((pp, ii) =>
                                  ii === i ? { ...pp, userId: v, deckId: "" } : pp
                                )
                              );
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded bg-white text-gray-900 text-sm mb-1"
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
                              className="w-full px-2 py-1 border border-gray-300 rounded bg-white text-gray-900 text-sm"
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
                            <div className="text-xs text-gray-500 mt-1">
                              {deck.name} — {deck.commander}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Notes
                    </label>
                    <textarea
                      value={logNotes}
                      onChange={(e) => setLogNotes(e.target.value)}
                      placeholder="Optional..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={logAsterisk}
                      onChange={(e) => setLogAsterisk(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">Asterisk *</span>
                  </label>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setLogOverlayDismissed(true)}
                      className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
                    >
                      Not yet
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveGame}
                      disabled={logSaving}
                      className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50"
                    >
                      {logSaving ? "Saving..." : "Log game"}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNewGame()}
                    className="w-full py-2 rounded-lg text-gray-500 text-sm hover:text-gray-700 hover:bg-gray-50"
                  >
                    Discard and start new game
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {assignSeatFor !== null && (
        <div
          className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setAssignSeatFor(null); }}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white rounded-lg p-4 max-w-sm w-full space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-gray-900">
              Assign Seat {assignSeatFor + 1}
            </h3>
            <select
              value={players[assignSeatFor]?.userId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setPlayers((prev) =>
                  prev.map((pp, ii) =>
                    ii === assignSeatFor ? { ...pp, userId: v, deckId: "" } : pp
                  )
                );
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
            >
              <option value="">Select player...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            {players[assignSeatFor]?.userId && (
              <select
                value={players[assignSeatFor]?.deckId ?? ""}
                onChange={(e) => handleDeckSelect(e.target.value, assignSeatFor!, "overlay")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
              >
                <option value="">Select deck...</option>
                {getDecksFor(players[assignSeatFor].userId).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.commander})
                  </option>
                ))}
                <option value={ADD_DECK}>+ Add Deck...</option>
              </select>
            )}
            <button
              type="button"
              onClick={() => setAssignSeatFor(null)}
              className="w-full py-2 rounded-lg bg-blue-600 text-white font-medium"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {colorPickerFor !== null && (
        <div
          className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setColorPickerFor(null); }}
        >
          <div
            className="bg-white rounded-lg p-4 max-w-sm w-full space-y-3 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-gray-900">Pick a color</h3>
            <div className="grid grid-cols-6 gap-2 max-h-80 overflow-y-auto">
              {BG_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => {
                    updatePlayer(colorPickerFor, (p) => {
                      const combo = preset.combo.length > 0 ? preset.combo : [];
                      return { ...p, bgColor: bgForComboStyled(combo, palette, p.gradientStyle ?? defaultGradient), colorCombo: combo };
                    });
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
                  updatePlayer(colorPickerFor, (p) => ({ ...p, bgColor: v, colorCombo: null }));
                }}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>
            {colorPickerFor !== null && players[colorPickerFor]?.colorCombo && players[colorPickerFor].colorCombo!.length > 1 && (
              <div>
                <label className="text-sm text-gray-600 block mb-1">Gradient style:</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {GRADIENT_STYLES.filter((s) => {
                    const n = players[colorPickerFor].colorCombo!.length;
                    if (s.minColors && n < s.minColors) return false;
                    if (s.maxColors && n > s.maxColors) return false;
                    return true;
                  }).map((style) => {
                    const p = players[colorPickerFor];
                    const preview = style.fn(p.colorCombo!, palette);
                    const isActive = (p.gradientStyle ?? defaultGradient) === style.name;
                    return (
                      <button
                        key={style.name}
                        onClick={() => {
                          updatePlayer(colorPickerFor, (pl) => ({
                            ...pl,
                            gradientStyle: style.name,
                            bgColor: bgForComboStyled(pl.colorCombo!, palette, style.name),
                          }));
                        }}
                        className={`aspect-square rounded-lg border-2 text-[8px] font-bold flex items-end justify-center pb-0.5 ${
                          isActive ? "border-blue-500 ring-1 ring-blue-300" : "border-gray-300"
                        }`}
                        style={{ background: preview }}
                        title={style.label}
                      >
                        <span className="bg-black/50 text-white px-1 rounded text-[7px]">{style.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (colorPickerFor !== null) {
                    const combo = DEFAULT_SEAT_COMBOS[colorPickerFor % DEFAULT_SEAT_COMBOS.length];
                    updatePlayer(colorPickerFor, (p) => ({ ...p, bgColor: bgForComboStyled(combo, palette, p.gradientStyle ?? defaultGradient), colorCombo: combo }));
                  }
                  setColorPickerFor(null);
                }}
                className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
              >
                Default color
              </button>
              <button
                onClick={() => setColorPickerFor(null)}
                className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

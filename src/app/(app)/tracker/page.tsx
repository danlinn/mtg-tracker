"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useTheme, useThemePalette } from "@/lib/theme";
import type { Palette, ColorKey } from "@/lib/themePalettes";
import { comboForDeck } from "@/lib/themePalettes";
import { bgForComboStyled, GRADIENT_STYLES, THEME_DEFAULT_GRADIENT, type GradientStyleName } from "@/lib/gradientStyles";
import { GRADIENT_ORDER, COMBO_KEYS } from "@/lib/gradientStyles";
import { THEME_DEFAULT_TEXTURE, getTextureBackground, type TextureName } from "@/lib/textures";
import { DEFAULT_SEAT_COMBOS, isAlive } from "@/lib/tracker-logic";
import type { Player, UserWithDecks } from "@/features/tracker/types";
import {
  PlayerBox,
  SetupScreen,
  ConfirmDialog,
  LogGameOverlay,
  AssignSeatOverlay,
  ColorPickerOverlay,
  TrackerNav,
} from "@/features/tracker";

// Generate a CSS background for a given combo of colors.
// Single color = solid; multi-color = linear gradient in BURGW order.
function bgForCombo(combo: ColorKey[], palette: Palette): string {
  if (combo.length === 0) return palette.C.hex;
  const ordered = GRADIENT_ORDER.filter((c) => combo.includes(c));
  if (ordered.length === 1) return palette[ordered[0]].hex;
  const stops = ordered.map((c, i) => {
    const hex = palette[c].hex;
    if (i === 0) return `${hex} 10%`;
    if (i === ordered.length - 1) return `${hex} 90%`;
    return hex;
  });
  return `linear-gradient(135deg, ${stops.join(", ")})`;
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

function makePlayers(count: number, startLife: number, palette: Palette, gradientStyle: GradientStyleName, texture: TextureName): Player[] {
  return Array.from({ length: count }, (_, i) => {
    const combo = DEFAULT_SEAT_COMBOS[i % DEFAULT_SEAT_COMBOS.length];
    const style = STARTER_GRADIENTS[i % STARTER_GRADIENTS.length] ?? gradientStyle;
    return {
      life: startLife,
      bgColor: bgForComboStyled(combo, palette, style),
      colorCombo: combo,
      gradientStyle: style,
      texture,
      damage: {},
      userId: "",
      deckId: "",
    };
  });
}

const ADD_DECK = "__add_deck__";

export default function TrackerPage() {
  const { theme, setTheme } = useTheme();
  const palette = useThemePalette();
  const defaultGradient = THEME_DEFAULT_GRADIENT[theme] ?? "linear";
  const defaultTexture: TextureName = THEME_DEFAULT_TEXTURE[theme] ?? "none";
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
          ? { ...p, bgColor: bgForComboStyled(p.colorCombo, palette, p.gradientStyle), gradientStyle: defaultGradient, texture: defaultTexture }
          : p
      )
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette, defaultGradient, defaultTexture]);

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
    const ps = makePlayers(playerCount, startLife, palette, defaultGradient, defaultTexture).map((p, i) => {
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
      <SetupScreen
        playerCount={playerCount}
        setPlayerCount={setPlayerCount}
        startLife={startLife}
        setStartLife={setStartLife}
        seatsForCount={seatsForCount}
        users={users}
        updateSeat={updateSeat}
        handleDeckSelect={handleDeckSelect}
        getDecksFor={getDecksFor}
        handleStart={handleStart}
        ADD_DECK={ADD_DECK}
      />
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

      <TrackerNav
        showNav={showNav}
        setShowNav={setShowNav}
        theme={theme}
        setTheme={setTheme}
      />

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
        <ConfirmDialog
          action={confirmAction}
          onConfirm={() => {
            if (confirmAction === "reset") {
              handleReset();
            } else {
              handleNewGame();
            }
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {logOverlayOpen && winnerIdx !== null && (
        <LogGameOverlay
          players={players}
          winnerIdx={winnerIdx}
          users={users}
          logPlayedAt={logPlayedAt}
          setLogPlayedAt={setLogPlayedAt}
          logNotes={logNotes}
          setLogNotes={setLogNotes}
          logAsterisk={logAsterisk}
          setLogAsterisk={setLogAsterisk}
          logSaving={logSaving}
          logError={logError}
          logSavedId={logSavedId}
          onDismiss={() => setLogOverlayDismissed(true)}
          onSave={handleSaveGame}
          onNewGame={handleNewGame}
          onPlayerChange={(seatIdx, userId) => {
            setPlayers((prev) =>
              prev.map((pp, ii) =>
                ii === seatIdx ? { ...pp, userId, deckId: "" } : pp
              )
            );
          }}
          handleDeckSelect={handleDeckSelect}
          getDecksFor={getDecksFor}
          ADD_DECK={ADD_DECK}
        />
      )}

      {assignSeatFor !== null && (
        <AssignSeatOverlay
          seatIndex={assignSeatFor}
          player={players[assignSeatFor]}
          users={users}
          onPlayerChange={(userId) => {
            setPlayers((prev) =>
              prev.map((pp, ii) =>
                ii === assignSeatFor ? { ...pp, userId, deckId: "" } : pp
              )
            );
          }}
          handleDeckSelect={handleDeckSelect}
          getDecksFor={getDecksFor}
          onClose={() => setAssignSeatFor(null)}
          ADD_DECK={ADD_DECK}
        />
      )}

      {colorPickerFor !== null && (
        <ColorPickerOverlay
          playerIndex={colorPickerFor}
          player={players[colorPickerFor]}
          palette={palette}
          defaultGradient={defaultGradient}
          defaultTexture={defaultTexture}
          BG_PRESETS={BG_PRESETS}
          updatePlayer={updatePlayer}
          onClose={() => setColorPickerFor(null)}
        />
      )}

    </div>
  );
}

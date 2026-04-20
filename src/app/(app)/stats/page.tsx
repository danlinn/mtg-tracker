"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ResponsiveContainer,
  Legend,
} from "recharts";
import ManaSymbol from "@/components/ManaSymbol";
import { useThemePalette } from "@/lib/theme";

type ColorKey = "W" | "U" | "B" | "R" | "G";

interface Deck {
  id: string;
  name: string;
  commander: string;
  colors: Record<ColorKey, boolean>;
}

interface GameEntry {
  isWinner: boolean;
  playedAt: string;
  playerCount: number;
  deck: Deck;
  winLabel: "nice" | "big" | "easy" | null;
}

interface StatsDetail {
  user: { id: string; name: string };
  games: GameEntry[];
  decks: Deck[];
}

interface PlayerOption {
  id: string;
  name: string;
}

// Labels are theme-independent; actual hex values come from the active
// theme palette via useThemePalette() inside the component.
const COLOR_LABELS: Record<ColorKey, string> = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
};

const COLOR_KEYS: ColorKey[] = ["W", "U", "B", "R", "G"];
// Same gradient order as decks page: Black, Blue, Red, Green, White
const GRADIENT_ORDER: ColorKey[] = ["B", "U", "R", "G", "W"];

// Recharts tooltip styling — dark background with white text for readability
const TOOLTIP_STYLE = {
  backgroundColor: "#111827",
  border: "1px solid #374151",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "12px",
};
const TOOLTIP_LABEL_STYLE = { color: "#ffffff", fontWeight: 600 };
const TOOLTIP_ITEM_STYLE = { color: "#e5e7eb" };

function comboId(combo: string): string {
  return combo === "Colorless" ? "g-colorless" : `g-${combo}`;
}

// Build gradient stops in the same BURGW order used by deck cards
function comboStops(
  combo: string,
  paletteHex: Record<ColorKey | "C", string>
): { offset: string; color: string }[] {
  if (combo === "Colorless") return [{ offset: "0%", color: paletteHex.C }];
  const chars = combo.split("") as ColorKey[];
  // Reorder to BURGW so the gradient matches deck card gradients
  const ordered = GRADIENT_ORDER.filter((c) => chars.includes(c));
  if (ordered.length === 1) return [{ offset: "0%", color: paletteHex[ordered[0]] }];
  return ordered.map((c, i) => ({
    offset: `${10 + (i / (ordered.length - 1)) * 80}%`,
    color: paletteHex[c],
  }));
}

export default function StatsPage() {
  const { data: session } = useSession();
  const selfId = (session?.user as { id?: string })?.id ?? "";
  const palette = useThemePalette();
  // Flattened palette hex for convenient lookups + radial gradients
  const paletteHex = useMemo(
    () => ({
      W: palette.W.hex,
      U: palette.U.hex,
      B: palette.B.hex,
      R: palette.R.hex,
      G: palette.G.hex,
      C: palette.C.hex,
    }),
    [palette]
  );

  const [playerId, setPlayerId] = useState<string>("");
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [data, setData] = useState<StatsDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [deckFilter, setDeckFilter] = useState<string>("");
  const [playerCountFilter, setPlayerCountFilter] = useState<string>("");
  const [colorFilter, setColorFilter] = useState<Record<ColorKey, boolean>>({
    W: false, U: false, B: false, R: false, G: false,
  });
  const [colorCountFilter, setColorCountFilter] = useState<string>("");

  // Load players for switcher
  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setPlayers(Array.isArray(data) ? data : []));
  }, []);

  // Default to self once session loads
  useEffect(() => {
    if (selfId && !playerId) setPlayerId(selfId);
  }, [selfId, playerId]);

  // Fetch stats for the selected player
  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    fetch(`/api/players/${playerId}/stats-detail`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [playerId]);

  const activeColorFilters = COLOR_KEYS.filter((k) => colorFilter[k]);

  // Apply filters
  const filteredGames = useMemo(() => {
    if (!data) return [];
    return data.games.filter((g) => {
      if (deckFilter && g.deck.id !== deckFilter) return false;
      if (playerCountFilter && g.playerCount !== Number(playerCountFilter)) return false;
      if (activeColorFilters.length > 0) {
        const allMatch = activeColorFilters.every((c) => g.deck.colors[c]);
        if (!allMatch) return false;
      }
      return true;
    });
  }, [data, deckFilter, playerCountFilter, activeColorFilters]);

  // Win rate over time: chronologically compute cumulative win rate per game
  const winHistory = useMemo(() => {
    let wins = 0;
    return filteredGames.map((g, i) => {
      if (g.isWinner) wins++;
      const winRate = Math.round((wins / (i + 1)) * 100);
      return {
        date: new Date(g.playedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "America/Los_Angeles",
        }),
        winRate,
        gameNumber: i + 1,
      };
    });
  }, [filteredGames]);

  // Pie chart: deck color usage by games played. Filterable by color count.
  const colorUsage = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of filteredGames) {
      const activeColors = COLOR_KEYS.filter((c) => g.deck.colors[c]);
      if (colorCountFilter && activeColors.length !== Number(colorCountFilter)) continue;
      // Use BURGW ordering so combo names match MTG conventions
      const orderedCombo = GRADIENT_ORDER.filter((c) => activeColors.includes(c));
      const key = orderedCombo.length === 0 ? "Colorless" : orderedCombo.join("");
      counts[key] = (counts[key] ?? 0) + 1;
    }
    // Sort descending by color count so 5-color lands at top of pie
    // (recharts draws clockwise from startAngle=90 = 12 o'clock).
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => {
        const aLen = a.name === "Colorless" ? 0 : a.name.length;
        const bLen = b.name === "Colorless" ? 0 : b.name.length;
        return bLen - aLen;
      });
  }, [filteredGames, colorCountFilter]);

  // Win rate per color
  const winRateByColor = useMemo(() => {
    const stats: Record<ColorKey, { wins: number; games: number }> = {
      W: { wins: 0, games: 0 },
      U: { wins: 0, games: 0 },
      B: { wins: 0, games: 0 },
      R: { wins: 0, games: 0 },
      G: { wins: 0, games: 0 },
    };
    for (const g of filteredGames) {
      for (const c of COLOR_KEYS) {
        if (g.deck.colors[c]) {
          stats[c].games++;
          if (g.isWinner) stats[c].wins++;
        }
      }
    }
    return COLOR_KEYS.map((c) => ({
      color: c,
      label: COLOR_LABELS[c],
      winRate: stats[c].games > 0 ? Math.round((stats[c].wins / stats[c].games) * 100) : 0,
      games: stats[c].games,
      hex: palette[c].hex,
    }));
  }, [filteredGames, palette]);

  // Win labels
  const winLabels = useMemo(() => {
    let big = 0, nice = 0, easy = 0, normal = 0;
    for (const g of filteredGames) {
      if (!g.isWinner) continue;
      if (g.winLabel === "big") big++;
      else if (g.winLabel === "nice") nice++;
      else if (g.winLabel === "easy") easy++;
      else normal++;
    }
    return [
      { label: "Big", count: big, hex: "#eab308" },
      { label: "Nice", count: nice, hex: "#3b82f6" },
      { label: "Normal", count: normal, hex: "#6b7280" },
      { label: "Easy", count: easy, hex: "#9ca3af" },
    ];
  }, [filteredGames]);

  const totalGames = filteredGames.length;
  const totalWins = filteredGames.filter((g) => g.isWinner).length;
  const overallWinRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  function toggleColor(c: ColorKey) {
    setColorFilter((prev) => ({ ...prev, [c]: !prev[c] }));
  }

  function clearFilters() {
    setDeckFilter("");
    setPlayerCountFilter("");
    setColorFilter({ W: false, U: false, B: false, R: false, G: false });
    setColorCountFilter("");
  }

  const hasFilters =
    deckFilter || playerCountFilter || activeColorFilters.length > 0 || colorCountFilter;

  if (loading || !data) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header + Player switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <h1 className="text-2xl font-bold">Stats</h1>
        <select
          value={playerId}
          onChange={(e) => setPlayerId(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 max-w-full"
        >
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id === selfId ? `${p.name} (you)` : p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-900">{totalGames}</div>
          <div className="text-xs text-gray-500">Games</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-900">{totalWins}</div>
          <div className="text-xs text-gray-500">Wins</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-900">{overallWinRate}%</div>
          <div className="text-xs text-gray-500">Win Rate</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">Filters</h2>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-gray-700">
              Clear
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select
            value={deckFilter}
            onChange={(e) => setDeckFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900"
          >
            <option value="">All Decks</option>
            {data.decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={playerCountFilter}
            onChange={(e) => setPlayerCountFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900"
          >
            <option value="">All Player Counts</option>
            <option value="2">2-player</option>
            <option value="3">3-player</option>
            <option value="4">4-player</option>
          </select>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Colors:</span>
          {COLOR_KEYS.map((c) => (
            <button
              key={c}
              onClick={() => toggleColor(c)}
              className={`rounded-full transition-all ${
                colorFilter[c] ? "ring-2 ring-blue-500 ring-offset-2 scale-110" : ""
              }`}
              title={COLOR_LABELS[c]}
            >
              <ManaSymbol color={c} size="sm" active={colorFilter[c]} title={COLOR_LABELS[c]} />
            </button>
          ))}
        </div>
      </div>

      {/* Win Rate Over Time */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="font-semibold text-gray-900 mb-3">Win Rate Over Time</h2>
        {winHistory.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={winHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" fontSize={10} />
              <YAxis domain={[0, 100]} fontSize={10} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={TOOLTIP_LABEL_STYLE}
                itemStyle={TOOLTIP_ITEM_STYLE}
                cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
              />
              <Line type="monotone" dataKey="winRate" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Deck Color Usage (pie) */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Deck Color Combos</h2>
          <select
            value={colorCountFilter}
            onChange={(e) => setColorCountFilter(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-900"
          >
            <option value="">All</option>
            <option value="0">Colorless</option>
            <option value="1">Mono</option>
            <option value="2">2-color</option>
            <option value="3">3-color</option>
            <option value="4">4-color</option>
            <option value="5">5-color</option>
          </select>
        </div>
        {colorUsage.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <defs>
                {colorUsage.map((entry) => {
                  // Radial gradient: center -> edge.
                  // Stops reversed so the first color is at the edge, last at center.
                  const stops = comboStops(entry.name, paletteHex).slice().reverse();
                  // Re-space the offsets evenly after reversal
                  const respaced = stops.map((s, i) => ({
                    ...s,
                    offset: `${(i / Math.max(stops.length - 1, 1)) * 100}%`,
                  }));
                  return (
                    <radialGradient
                      key={comboId(entry.name)}
                      id={comboId(entry.name)}
                      // userSpaceOnUse = use SVG viewport coords instead of
                      // each slice's bounding box. All slices now share a
                      // gradient centered on the actual pie center.
                      gradientUnits="userSpaceOnUse"
                      cx="50%"
                      cy="50%"
                      // Pie's outerRadius is 80 — radius of 80 matches the
                      // edge of the pie exactly
                      r={80}
                      fx="50%"
                      fy="50%"
                    >
                      {respaced.map((s, i) => (
                        <stop key={i} offset={s.offset} stopColor={s.color} />
                      ))}
                    </radialGradient>
                  );
                })}
              </defs>
              <Pie
                data={colorUsage}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                startAngle={90}
                endAngle={-270}
                label={({ name, value }) => `${name} (${value})`}
              >
                {colorUsage.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={`url(#${comboId(entry.name)})`}
                    stroke="#ffffff"
                    strokeWidth={1}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={TOOLTIP_LABEL_STYLE}
                itemStyle={TOOLTIP_ITEM_STYLE}
                cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Win Rate per Color */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="font-semibold text-gray-900 mb-3">Win Rate by Color</h2>
        {filteredGames.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={winRateByColor} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="color" fontSize={12} />
              <YAxis domain={[0, 100]} fontSize={10} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={TOOLTIP_LABEL_STYLE}
                itemStyle={TOOLTIP_ITEM_STYLE}
                cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
              />
              <Bar dataKey="winRate">
                {winRateByColor.map((entry) => (
                  <Cell
                    key={entry.color}
                    fill={entry.games === 0 ? "#e5e7eb" : entry.hex}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Color Usage — how many games each color has appeared in (across all combos) */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="font-semibold text-gray-900 mb-3">Color Usage</h2>
        {filteredGames.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={winRateByColor} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="color" fontSize={12} />
              <YAxis fontSize={10} allowDecimals={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={TOOLTIP_LABEL_STYLE}
                itemStyle={TOOLTIP_ITEM_STYLE}
                cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
              />
              <Bar dataKey="games" name="Games">
                {winRateByColor.map((entry) => (
                  <Cell
                    key={entry.color}
                    fill={entry.games === 0 ? "#e5e7eb" : entry.hex}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Win Labels */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="font-semibold text-gray-900 mb-3">Win Types</h2>
        {totalWins === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">No wins yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={winLabels} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis fontSize={10} allowDecimals={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={TOOLTIP_LABEL_STYLE}
                itemStyle={TOOLTIP_ITEM_STYLE}
                cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
              />
              <Legend />
              <Bar dataKey="count" name="Wins">
                {winLabels.map((entry) => (
                  <Cell key={entry.label} fill={entry.hex} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ColorPips from "@/components/ColorPips";

interface Deck {
  id: string;
  name: string;
  commander: string;
  commanderImage: string | null;
  commander2: string | null;
  commander2Image: string | null;
  colorW: boolean;
  colorU: boolean;
  colorB: boolean;
  colorR: boolean;
  colorG: boolean;
  bracket: number | null;
  edhp: number | null;
  createdAt: string;
}

type SortOption = "date" | "name" | "bracket" | "edhp";

const COLOR_KEYS = ["colorW", "colorU", "colorB", "colorR", "colorG"] as const;

const FILTER_COLORS: { key: (typeof COLOR_KEYS)[number]; letter: string; label: string; bg: string; active: string; textColor: string }[] = [
  { key: "colorW", letter: "W", label: "White", bg: "bg-yellow-100", active: "ring-yellow-400", textColor: "#111" },
  { key: "colorU", letter: "U", label: "Blue", bg: "bg-blue-500", active: "ring-blue-400", textColor: "#fff" },
  { key: "colorB", letter: "B", label: "Black", bg: "bg-gray-800", active: "ring-gray-500", textColor: "#eee" },
  { key: "colorR", letter: "R", label: "Red", bg: "bg-red-500", active: "ring-red-400", textColor: "#fff" },
  { key: "colorG", letter: "G", label: "Green", bg: "bg-green-600", active: "ring-green-400", textColor: "#fff" },
];

const MTG_COLORS: { key: (typeof COLOR_KEYS)[number]; hex: string }[] = [
  { key: "colorW", hex: "#f5f5f4" },
  { key: "colorU", hex: "#60a5fa" },
  { key: "colorB", hex: "#404040" },
  { key: "colorR", hex: "#f87171" },
  { key: "colorG", hex: "#4ade80" },
];

function deckGradient(deck: Deck): React.CSSProperties {
  const active = MTG_COLORS.filter((c) => deck[c.key]).map((c) => c.hex);
  if (active.length === 0) return {};
  const isBlackOnly = deck.colorB && !deck.colorW && !deck.colorU && !deck.colorR && !deck.colorG;
  const textColor = isBlackOnly ? "#f5f5f4" : undefined;
  if (active.length === 1) return { background: active[0], color: textColor };
  return { background: `linear-gradient(135deg, ${active.join(", ")})`, color: textColor };
}

export default function DecksPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortOption>("date");
  const [colorFilter, setColorFilter] = useState<Record<string, boolean>>({
    colorW: false, colorU: false, colorB: false, colorR: false, colorG: false,
  });
  const [bracketFilter, setBracketFilter] = useState<string>("");

  const activeFilters = COLOR_KEYS.filter((k) => colorFilter[k]);

  const filteredAndSorted = useMemo(() => {
    let result = decks;

    // Color filter: deck must have ALL selected colors
    if (activeFilters.length > 0) {
      result = result.filter((deck) =>
        activeFilters.every((key) => deck[key])
      );
    }

    // Bracket filter
    if (bracketFilter) {
      const b = Number(bracketFilter);
      result = result.filter((deck) => deck.bracket === b);
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "bracket":
          return (a.bracket ?? 99) - (b.bracket ?? 99);
        case "edhp":
          return (b.edhp ?? -1) - (a.edhp ?? -1);
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return result;
  }, [decks, sort, activeFilters, bracketFilter]);

  useEffect(() => {
    fetch("/api/decks")
      .then((r) => r.json())
      .then((data) => {
        setDecks(data);
        setLoading(false);
      });
  }, []);

  function toggleColorFilter(key: string) {
    setColorFilter((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this deck?")) return;
    await fetch(`/api/decks/${id}`, { method: "DELETE" });
    setDecks((prev) => prev.filter((d) => d.id !== id));
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Decks</h1>
        <Link
          href="/decks/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Add Deck
        </Link>
      </div>

      {decks.length > 0 && (
        <div className="flex flex-wrap items-center gap-4">
          {/* Color filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Filter:</span>
            {FILTER_COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => toggleColorFilter(c.key)}
                className={`w-8 h-8 rounded-full ${c.bg} flex items-center justify-center text-xs font-bold transition-all ${
                  colorFilter[c.key]
                    ? `ring-2 ${c.active} ring-offset-2 scale-110`
                    : "opacity-40"
                }`}
                style={{ color: c.textColor }}
                title={c.label}
              >
                {c.letter}
              </button>
            ))}
            {(activeFilters.length > 0 || bracketFilter) && (
              <button
                onClick={() => {
                  setColorFilter({ colorW: false, colorU: false, colorB: false, colorR: false, colorG: false });
                  setBracketFilter("");
                }}
                className="text-xs text-gray-400 hover:text-gray-600 ml-1"
              >
                Clear
              </button>
            )}
          </div>

          {/* Bracket filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Bracket:</span>
            <select
              value={bracketFilter}
              onChange={(e) => setBracketFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1 bg-white text-gray-900"
            >
              <option value="">All</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-500">Sort:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1 bg-white text-gray-900"
            >
              <option value="date">Date Added</option>
              <option value="name">Name</option>
              <option value="bracket">Bracket</option>
              <option value="edhp">EDHP</option>
            </select>
          </div>
        </div>
      )}

      {decks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No decks yet.</p>
          <Link href="/decks/new" className="text-blue-600 hover:underline">
            Create your first deck
          </Link>
        </div>
      ) : filteredAndSorted.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No decks match the selected colors.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAndSorted.map((deck) => (
            <div
              key={deck.id}
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200"
              style={deckGradient(deck)}
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="text-xl font-bold text-white" style={{ textShadow: "1px 1px 0 #000, -1px 1px 0 #000, 1px -1px 0 #000, -1px -1px 0 #000, 0 2px 4px rgba(0,0,0,0.5)" }}>{deck.name}</div>
                <div className="text-sm font-semibold text-white" style={{ textShadow: "1px 1px 0 #000, -1px 1px 0 #000, 1px -1px 0 #000, -1px -1px 0 #000, 0 2px 4px rgba(0,0,0,0.5)" }}>{deck.commander}{deck.commander2 ? ` & ${deck.commander2}` : ""}</div>
                <ColorPips
                  colors={{
                    W: deck.colorW,
                    U: deck.colorU,
                    B: deck.colorB,
                    R: deck.colorR,
                    G: deck.colorG,
                  }}
                />
                {(deck.bracket != null || deck.edhp != null) && (
                  <div className="flex gap-3 text-xs">
                    {deck.bracket != null && (
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        Bracket {deck.bracket}
                      </span>
                    )}
                    {deck.edhp != null && (
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        EDHP {deck.edhp.toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex gap-3 pt-1">
                  <Link
                    href={`/decks/${deck.id}/edit`}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(deck.id)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {deck.commanderImage && (
                <img
                  src={deck.commanderImage}
                  alt={deck.commander}
                  className="w-24 h-24 rounded-lg object-cover shadow-sm flex-shrink-0"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

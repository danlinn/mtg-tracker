"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ColorPips from "@/components/ColorPips";
import ManaSymbol, { type ManaColor } from "@/components/ManaSymbol";
import { useThemePalette } from "@/lib/theme";
import type { Palette } from "@/lib/themePalettes";
import { comboForDeck, textOn } from "@/lib/themePalettes";
import { bgForComboStyled } from "@/lib/gradientStyles";

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

const FILTER_COLORS: { key: (typeof COLOR_KEYS)[number]; color: ManaColor; label: string }[] = [
  { key: "colorW", color: "W", label: "White" },
  { key: "colorU", color: "U", label: "Blue" },
  { key: "colorB", color: "B", label: "Black" },
  { key: "colorR", color: "R", label: "Red" },
  { key: "colorG", color: "G", label: "Green" },
];

function deckGradient(deck: Deck, palette: Palette): React.CSSProperties {
  const combo = comboForDeck(deck);
  if (combo.length === 0) return {};
  const bg = bgForComboStyled(combo, palette, "linear");
  return { background: bg, color: textOn(bg) };
}

export default function DecksPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string })?.id;
  const palette = useThemePalette();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortOption>("date");
  const [sortAsc, setSortAsc] = useState(false);
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
    const dir = sortAsc ? 1 : -1;
    result = [...result].sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "bracket":
          return ((a.bracket ?? 99) - (b.bracket ?? 99)) * dir;
        case "edhp":
          return ((b.edhp ?? -1) - (a.edhp ?? -1)) * dir;
        default:
          return (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) * dir;
      }
    });

    return result;
  }, [decks, sort, sortAsc, activeFilters, bracketFilter]);

  useEffect(() => {
    fetch("/api/decks?perPage=100")
      .then((r) => r.json())
      .then((data) => {
        setDecks(data.decks);
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
    return <div className="text-center py-12 text-text-tertiary">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Decks</h1>
        <Link
          href="/decks/new"
          className="btn-primary bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          Add Deck
        </Link>
      </div>

      {decks.length > 0 && (
        <div className="flex flex-wrap items-center gap-4">
          {/* Color filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-tertiary">Filter:</span>
            {FILTER_COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => toggleColorFilter(c.key)}
                className={`rounded-full transition-all ${
                  colorFilter[c.key] ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""
                }`}
                title={c.label}
              >
                <ManaSymbol color={c.color} active={colorFilter[c.key]} title={c.label} />
              </button>
            ))}
            {(activeFilters.length > 0 || bracketFilter) && (
              <button
                onClick={() => {
                  setColorFilter({ colorW: false, colorU: false, colorB: false, colorR: false, colorG: false });
                  setBracketFilter("");
                }}
                className="text-xs text-text-muted hover:text-text-secondary ml-1"
              >
                Clear
              </button>
            )}
          </div>

          {/* Bracket filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-tertiary">Bracket:</span>
            <select
              value={bracketFilter}
              onChange={(e) => setBracketFilter(e.target.value)}
              className="text-sm border border-border-strong rounded-lg px-2 py-1 bg-surface text-text-primary"
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
            <span className="text-sm text-text-tertiary">Sort:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="text-sm border border-border-strong rounded-lg px-2 py-1 bg-surface text-text-primary"
            >
              <option value="date">Date Added</option>
              <option value="name">Name</option>
              <option value="bracket">Bracket</option>
              <option value="edhp">EDHP</option>
            </select>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="text-sm border border-border-strong rounded-lg px-2 py-1 bg-surface text-text-primary hover:bg-surface-raised transition-colors"
              title={sortAsc ? "Ascending" : "Descending"}
            >
              {sortAsc ? "↑" : "↓"}
            </button>
          </div>
        </div>
      )}

      {decks.length === 0 ? (
        <div className="text-center py-12 text-text-tertiary">
          <p>No decks yet.</p>
          <Link href="/decks/new" className="text-accent hover:underline">
            Create your first deck
          </Link>
        </div>
      ) : filteredAndSorted.length === 0 ? (
        <div className="text-center py-8 text-text-tertiary">
          No decks match the selected colors.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAndSorted.map((deck) => {
            const whiteOnly = deck.colorW && !deck.colorB && !deck.colorU && !deck.colorR && !deck.colorG;
            const titleShadow = whiteOnly
              ? "1px 1px 0 rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)"
              : "1px 1px 0 #000, -1px 1px 0 #000, 1px -1px 0 #000, -1px -1px 0 #000, 0 2px 4px rgba(0,0,0,0.5)";
            const titleColor = whiteOnly ? "#1a1a1a" : "white";
            return (
            <div
              key={deck.id}
              onClick={() => userId && router.push(`/players/${userId}/decks/${deck.id}`)}
              className="flex items-center justify-between p-4 rounded-lg border border-border cursor-pointer hover:shadow-md transition-shadow"
              style={deckGradient(deck, palette)}
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="text-xl font-bold" style={{ color: titleColor, textShadow: titleShadow }}>{deck.name}</div>
                <div className="text-sm font-semibold" style={{ color: titleColor, textShadow: titleShadow }}>{deck.commander}{deck.commander2 ? ` & ${deck.commander2}` : ""}</div>
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
                      <span className={`px-2 py-0.5 rounded ${whiteOnly ? "bg-surface/60 text-text-primary" : "bg-surface-sunken text-text-secondary"}`}>
                        Bracket {deck.bracket}
                      </span>
                    )}
                    {deck.edhp != null && (
                      <span className={`px-2 py-0.5 rounded ${whiteOnly ? "bg-surface/60 text-text-primary" : "bg-surface-sunken text-text-secondary"}`}>
                        EDHP {deck.edhp.toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex gap-3 pt-1" onClick={(e) => e.stopPropagation()}>
                  <Link
                    href={`/decks/${deck.id}/edit`}
                    className={`text-xs font-medium ${whiteOnly ? "text-blue-800 hover:text-blue-950" : "text-accent hover:text-accent-hover"}`}
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(deck.id)}
                    className={`text-xs ${whiteOnly ? "text-red-700 hover:text-danger" : "text-danger hover:text-danger"}`}
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
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ColorPips from "@/components/ColorPips";

interface Deck {
  id: string;
  name: string;
  commander: string;
  commanderImage: string | null;
  colorW: boolean;
  colorU: boolean;
  colorB: boolean;
  colorR: boolean;
  colorG: boolean;
}

const MTG_COLORS: { key: keyof Pick<Deck, "colorW" | "colorU" | "colorB" | "colorR" | "colorG">; hex: string }[] = [
  { key: "colorW", hex: "#f5f5f4" }, // white
  { key: "colorU", hex: "#60a5fa" }, // bright blue
  { key: "colorB", hex: "#404040" }, // dark charcoal for Black
  { key: "colorR", hex: "#f87171" }, // vivid red
  { key: "colorG", hex: "#4ade80" }, // vivid green
];

function deckGradient(deck: Deck): React.CSSProperties {
  const active = MTG_COLORS.filter((c) => deck[c.key]).map((c) => c.hex);
  if (active.length === 0) return {};
  // Use light text when Black is the only or dominant color
  const isBlackOnly = deck.colorB && !deck.colorW && !deck.colorU && !deck.colorR && !deck.colorG;
  const textColor = isBlackOnly ? "#f5f5f4" : undefined;
  if (active.length === 1) return { background: active[0], color: textColor };
  return { background: `linear-gradient(135deg, ${active.join(", ")})`, color: textColor };
}

export default function DecksPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/decks")
      .then((r) => r.json())
      .then((data) => {
        setDecks(data);
        setLoading(false);
      });
  }, []);

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

      {decks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No decks yet.</p>
          <Link href="/decks/new" className="text-blue-600 hover:underline">
            Create your first deck
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {decks.map((deck) => (
            <div
              key={deck.id}
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200"
              style={deckGradient(deck)}
            >
              <div className="flex items-center gap-3">
                {deck.commanderImage && (
                  <img
                    src={deck.commanderImage}
                    alt={deck.commander}
                    className="w-16 h-16 rounded-lg object-cover shadow-sm flex-shrink-0"
                  />
                )}
                <div className="space-y-1">
                  <div className="font-medium text-gray-900">{deck.name}</div>
                  <div className="text-sm text-gray-500">{deck.commander}</div>
                  <ColorPips
                  colors={{
                    W: deck.colorW,
                    U: deck.colorU,
                    B: deck.colorB,
                    R: deck.colorR,
                    G: deck.colorG,
                  }}
                />
                </div>
              </div>
              <div className="flex gap-3 items-center">
                <Link
                  href={`/decks/${deck.id}/edit`}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(deck.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

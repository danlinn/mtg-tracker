"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CommanderSearch from "@/components/CommanderSearch";

const COLORS = [
  { key: "W", label: "White", bg: "bg-yellow-100", active: "ring-yellow-400" },
  { key: "U", label: "Blue", bg: "bg-blue-500", active: "ring-blue-400" },
  { key: "B", label: "Black", bg: "bg-gray-800", active: "ring-gray-500" },
  { key: "R", label: "Red", bg: "bg-red-500", active: "ring-red-400" },
  { key: "G", label: "Green", bg: "bg-green-600", active: "ring-green-400" },
];

const COLOR_MAP: Record<string, string> = { W: "W", U: "U", B: "B", R: "R", G: "G" };

export default function NewDeckPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [commander, setCommander] = useState("");
  const [commanderImage, setCommanderImage] = useState<string | null>(null);
  const [colors, setColors] = useState<Record<string, boolean>>({
    W: false, U: false, B: false, R: false, G: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleColor(key: string) {
    setColors((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleCardResolved(card: { name: string; image: string | null; colors: string[] } | null) {
    if (!card) return;
    setCommanderImage(card.image);
    // Auto-set color identity from card
    if (card.colors.length > 0) {
      const newColors: Record<string, boolean> = { W: false, U: false, B: false, R: false, G: false };
      card.colors.forEach((c) => {
        if (COLOR_MAP[c]) newColors[COLOR_MAP[c]] = true;
      });
      setColors(newColors);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/decks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, commander, commanderImage, colors }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create deck");
      setLoading(false);
      return;
    }

    router.push("/decks");
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">New Deck</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Deck Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Krenko Goblins"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          />
        </div>
        <div>
          <label htmlFor="commander" className="block text-sm font-medium mb-1">
            Commander
          </label>
          <CommanderSearch
            value={commander}
            onChange={setCommander}
            onCardResolved={handleCardResolved}
          />
        </div>
        {commanderImage && (
          <div className="flex justify-center">
            <img
              src={commanderImage}
              alt={commander}
              className="w-full rounded-lg shadow-md"
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-2">
            Color Identity
          </label>
          <div className="flex gap-3">
            {COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => toggleColor(c.key)}
                className={`w-10 h-10 rounded-full ${c.bg} flex items-center justify-center text-xs font-bold transition-all ${
                  colors[c.key]
                    ? `ring-2 ${c.active} ring-offset-2 scale-110`
                    : "opacity-40"
                }`}
                title={c.label}
              >
                {c.key}
              </button>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Creating..." : "Create Deck"}
        </button>
      </form>
    </div>
  );
}

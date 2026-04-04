"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ColorPips from "@/components/ColorPips";

interface Deck {
  id: string;
  name: string;
  commander: string;
  colorW: boolean;
  colorU: boolean;
  colorB: boolean;
  colorR: boolean;
  colorG: boolean;
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
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-white"
            >
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
              <button
                onClick={() => handleDelete(deck.id)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

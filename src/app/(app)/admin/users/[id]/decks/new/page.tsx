"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import CommanderSearch from "@/components/CommanderSearch";

const COLORS = [
  { key: "W", label: "White", bg: "bg-yellow-100", active: "ring-yellow-400", textColor: "#111" },
  { key: "U", label: "Blue", bg: "bg-blue-500", active: "ring-blue-400", textColor: "#fff" },
  { key: "B", label: "Black", bg: "bg-gray-800", active: "ring-gray-500", textColor: "#eee" },
  { key: "R", label: "Red", bg: "bg-red-500", active: "ring-red-400", textColor: "#fff" },
  { key: "G", label: "Green", bg: "bg-green-600", active: "ring-green-400", textColor: "#fff" },
];

const COLOR_MAP: Record<string, string> = { W: "W", U: "U", B: "B", R: "R", G: "G" };

export default function AdminAddDeckForUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [userName, setUserName] = useState("");
  const [name, setName] = useState("");
  const [commander, setCommander] = useState("");
  const [commanderImage, setCommanderImage] = useState<string | null>(null);
  const [colors, setColors] = useState<Record<string, boolean>>({
    W: false, U: false, B: false, R: false, G: false,
  });
  const [bracket, setBracket] = useState("");
  const [edhp, setEdhp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/users/${userId}/decks`)
      .then((r) => r.json())
      .then((data) => setUserName(data.name ?? ""));
  }, [userId]);

  function toggleColor(key: string) {
    setColors((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleCardResolved(card: { name: string; image: string | null; colors: string[] } | null) {
    if (!card) return;
    setCommanderImage(card.image);
    if (card.colors.length > 0) {
      setColors((prev) => {
        const updated = { ...prev };
        card.colors.forEach((c) => {
          if (COLOR_MAP[c]) updated[COLOR_MAP[c]] = true;
        });
        return updated;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch(`/api/admin/users/${userId}/decks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        commander,
        commanderImage,
        colors,
        bracket: bracket ? Number(bracket) : null,
        edhp: edhp ? Number(edhp) : null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create deck");
      setLoading(false);
      return;
    }

    router.push(`/admin/users/${userId}`);
  }

  return (
    <div className="max-w-md mx-auto">
      <Link href={`/admin/users/${userId}`} className="text-accent hover:underline text-sm">
        &larr; Back to {userName || "user"}
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-6">Add Deck for {userName}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-danger-bg text-danger px-4 py-2 rounded text-sm">
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
            className="w-full px-3 py-2 border border-border-strong rounded-lg bg-surface text-text-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Commander</label>
          <CommanderSearch
            value={commander}
            onChange={setCommander}
            onCardResolved={handleCardResolved}
          />
        </div>
        {commanderImage && (
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={commanderImage} alt={commander} className="w-full rounded-lg shadow-md" />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-2">Color Identity</label>
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
                style={{ color: c.textColor }}
                title={c.label}
              >
                {c.key}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="bracket" className="block text-sm font-medium mb-1">Bracket</label>
            <input
              id="bracket"
              type="number"
              min="1"
              max="5"
              value={bracket}
              onChange={(e) => setBracket(e.target.value)}
              className="w-full px-3 py-2 border border-border-strong rounded-lg bg-surface text-text-primary"
            />
          </div>
          <div>
            <label htmlFor="edhp" className="block text-sm font-medium mb-1">EDHP</label>
            <input
              id="edhp"
              type="number"
              step="0.01"
              value={edhp}
              onChange={(e) => setEdhp(e.target.value)}
              className="w-full px-3 py-2 border border-border-strong rounded-lg bg-surface text-text-primary"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || !name.trim() || !commander.trim()}
          className="w-full btn-primary bg-accent text-white py-2 rounded-lg font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {loading ? "Creating..." : "Create Deck"}
        </button>
      </form>
    </div>
  );
}

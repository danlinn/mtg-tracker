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

export default function EditDeckPage() {
  const router = useRouter();
  const params = useParams();
  const deckId = params.id as string;

  const [name, setName] = useState("");
  const [commander, setCommander] = useState("");
  const [commanderImage, setCommanderImage] = useState<string | null>(null);
  const [commander2, setCommander2] = useState("");
  const [commander2Image, setCommander2Image] = useState<string | null>(null);
  const [showPartner, setShowPartner] = useState(false);
  const [colors, setColors] = useState<Record<string, boolean>>({
    W: false, U: false, B: false, R: false, G: false,
  });
  const [bracket, setBracket] = useState("");
  const [edhp, setEdhp] = useState("");
  const [decklist, setDecklist] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  function buildEdhpUrl() {
    if (!decklist.trim()) return null;
    const encoded = decklist
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join("~") + "~Z~";
    return `https://edhpowerlevel.com/?d=${encoded.replace(/ /g, "+")}`;
  }

  useEffect(() => {
    fetch(`/api/decks/${deckId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Deck not found");
        return r.json();
      })
      .then((deck) => {
        setName(deck.name);
        setCommander(deck.commander);
        setCommanderImage(deck.commanderImage ?? null);
        setCommander2(deck.commander2 ?? "");
        setCommander2Image(deck.commander2Image ?? null);
        setShowPartner(!!deck.commander2);
        setColors({
          W: deck.colorW,
          U: deck.colorU,
          B: deck.colorB,
          R: deck.colorR,
          G: deck.colorG,
        });
        setBracket(deck.bracket != null ? String(deck.bracket) : "");
        setEdhp(deck.edhp != null ? String(deck.edhp) : "");
        setDecklist(deck.decklist ?? "");
        setFetching(false);
      })
      .catch(() => {
        setError("Deck not found");
        setFetching(false);
      });
  }, [deckId]);

  function toggleColor(key: string) {
    setColors((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleCardResolved(card: { name: string; image: string | null; colors: string[] } | null) {
    if (!card) return;
    setCommanderImage(card.image);
    mergeColors(card.colors);
  }

  function handleCard2Resolved(card: { name: string; image: string | null; colors: string[] } | null) {
    if (!card) return;
    setCommander2Image(card.image);
    mergeColors(card.colors);
  }

  function mergeColors(cardColors: string[]) {
    if (cardColors.length > 0) {
      setColors((prev) => {
        const updated = { ...prev };
        cardColors.forEach((c) => {
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

    const res = await fetch(`/api/decks/${deckId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, commander, commanderImage,
        commander2: commander2.trim() || null,
        commander2Image: commander2.trim() ? commander2Image : null,
        colors,
        bracket: bracket ? Number(bracket) : null,
        edhp: edhp ? Number(edhp) : null,
        decklist: decklist.trim() || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to update deck");
      setLoading(false);
      return;
    }

    router.push("/decks");
  }

  if (fetching) {
    return <div className="text-center py-12 text-text-tertiary">Loading...</div>;
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Deck</h1>
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
            className="w-full px-3 py-2 border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-surface text-text-primary"
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
        {commander2 || showPartner ? (
          <>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="commander2" className="block text-sm font-medium">
                  Partner / Second Commander
                </label>
                {!commander2.trim() && (
                  <button
                    type="button"
                    onClick={() => { setShowPartner(false); setCommander2(""); setCommander2Image(null); }}
                    className="text-xs text-text-muted hover:text-text-secondary"
                  >
                    Remove
                  </button>
                )}
              </div>
              <CommanderSearch
                value={commander2}
                onChange={setCommander2}
                onCardResolved={handleCard2Resolved}
              />
            </div>
            {commander2Image && commander2.trim() && (
              <div className="flex justify-center">
                <img
                  src={commander2Image}
                  alt={commander2}
                  className="w-full rounded-lg shadow-md"
                />
              </div>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowPartner(true)}
            className="text-sm text-accent hover:text-accent-hover"
          >
            + Add Partner / Second Commander
          </button>
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
                style={{ color: c.textColor }}
                title={c.label}
              >
                {c.key}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="decklist" className="block text-sm font-medium mb-1">
            Decklist
          </label>
          <textarea
            id="decklist"
            value={decklist}
            onChange={(e) => setDecklist(e.target.value)}
            placeholder={"1 Sol Ring\n1 Command Tower\n1 Arcane Signet\n..."}
            rows={6}
            className="w-full px-3 py-2 border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-surface text-text-primary text-sm font-mono"
          />
          {decklist.trim() && (
            <a
              href={buildEdhpUrl()!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-sm bg-amber-600 text-white px-4 py-1.5 rounded-lg hover:bg-amber-700 transition-colors"
            >
              Check Power Level on EDHPowerLevel.com
            </a>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="bracket" className="block text-sm font-medium mb-1">
              Bracket (1-5)
            </label>
            <input
              id="bracket"
              type="number"
              min={1}
              max={5}
              step={1}
              value={bracket}
              onChange={(e) => setBracket(e.target.value)}
              placeholder="e.g. 3"
              className="w-full px-3 py-2 border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-surface text-text-primary"
            />
          </div>
          <div>
            <label htmlFor="edhp" className="block text-sm font-medium mb-1">
              EDHP (0-10)
            </label>
            <input
              id="edhp"
              type="number"
              min={0}
              max={10}
              step={0.01}
              value={edhp}
              onChange={(e) => setEdhp(e.target.value)}
              placeholder="e.g. 7.5"
              className="w-full px-3 py-2 border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-surface text-text-primary"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 btn-primary bg-accent text-white py-2 rounded-lg font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
          <Link
            href="/decks"
            className="flex-1 border border-border-strong text-center py-2 rounded-lg font-medium hover:bg-surface-raised transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

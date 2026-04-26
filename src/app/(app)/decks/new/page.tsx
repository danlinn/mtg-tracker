"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CommanderSearch from "@/components/CommanderSearch";

const COLORS = [
  { key: "W", label: "White", bg: "bg-yellow-100", active: "ring-yellow-400", textColor: "#111" },
  { key: "U", label: "Blue", bg: "bg-blue-500", active: "ring-blue-400", textColor: "#fff" },
  { key: "B", label: "Black", bg: "bg-gray-800", active: "ring-gray-500", textColor: "#eee" },
  { key: "R", label: "Red", bg: "bg-red-500", active: "ring-red-400", textColor: "#fff" },
  { key: "G", label: "Green", bg: "bg-green-600", active: "ring-green-400", textColor: "#fff" },
];

const COLOR_MAP: Record<string, string> = { W: "W", U: "U", B: "B", R: "R", G: "G" };

export default function NewDeckPage() {
  return (
    <Suspense>
      <NewDeckForm />
    </Suspense>
  );
}

function NewDeckForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
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
  const [error, setError] = useState("");
  const [moxfieldUrl, setMoxfieldUrl] = useState("");
  const [importing, setImporting] = useState(false);

  function buildEdhpUrl() {
    if (!decklist.trim()) return null;
    const encoded = decklist
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join("~") + "~Z~";
    return `https://edhpowerlevel.com/?d=${encoded.replace(/ /g, "+")}`;
  }

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

  async function handleMoxfieldImport() {
    if (!moxfieldUrl.trim()) return;
    setImporting(true);
    setError("");
    try {
      const res = await fetch("/api/import/moxfield", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: moxfieldUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to import from Moxfield");
        setImporting(false);
        return;
      }
      if (data.name) setName(data.name);
      if (data.commanders?.[0]) setCommander(data.commanders[0]);
      if (data.commanders?.[1]) {
        setCommander2(data.commanders[1]);
        setShowPartner(true);
      }
      if (data.decklist) setDecklist(data.decklist);
      if (data.colorIdentity) {
        const newColors: Record<string, boolean> = { W: false, U: false, B: false, R: false, G: false };
        data.colorIdentity.forEach((c: string) => {
          if (newColors[c] !== undefined) newColors[c] = true;
        });
        setColors(newColors);
      }
    } catch {
      setError("Failed to import from Moxfield");
    }
    setImporting(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/decks", {
      method: "POST",
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
      setError(data.error || "Failed to create deck");
      setLoading(false);
      return;
    }

    router.push(returnTo || "/decks");
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">New Deck</h1>

      {/* Moxfield Import */}
      <div className="mb-6 p-3 border border-border rounded-lg bg-surface-raised">
        <div className="text-sm font-medium mb-2">Import from Moxfield</div>
        <div className="flex gap-2">
          <input
            type="text"
            value={moxfieldUrl}
            onChange={(e) => setMoxfieldUrl(e.target.value)}
            placeholder="https://www.moxfield.com/decks/..."
            className="flex-1 px-3 py-2 text-sm border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-surface text-text-primary"
          />
          <button
            type="button"
            onClick={handleMoxfieldImport}
            disabled={importing || !moxfieldUrl.trim()}
            className="px-4 py-2 text-sm font-medium btn-primary bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {importing ? "Importing..." : "Import"}
          </button>
        </div>
      </div>
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
            placeholder="e.g. Krenko Goblins"
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
        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary bg-accent text-white py-2 rounded-lg font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {loading ? "Creating..." : "Create Deck"}
        </button>
      </form>
    </div>
  );
}

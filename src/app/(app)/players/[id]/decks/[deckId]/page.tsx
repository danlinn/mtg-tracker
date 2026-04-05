"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ColorPips from "@/components/ColorPips";

interface PlayerCountStat {
  games: number;
  wins: number;
  winRate: number;
}

interface DeckDetail {
  id: string;
  name: string;
  commander: string;
  commander2: string | null;
  commanderImage: string | null;
  commander2Image: string | null;
  colorW: boolean;
  colorU: boolean;
  colorB: boolean;
  colorR: boolean;
  colorG: boolean;
  bracket: number | null;
  edhp: number | null;
  decklist: string | null;
  games: number;
  wins: number;
  winRate: number;
  winRateByPlayerCount: Record<number, PlayerCountStat>;
  owner: { id: string; name: string };
}

export default function PlayerDeckPage() {
  const params = useParams();
  const playerId = params.id as string;
  const deckId = params.deckId as string;
  const [deck, setDeck] = useState<DeckDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/players/decks/${deckId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Deck not found");
        return r.json();
      })
      .then(setDeck)
      .catch(() => setError("Deck not found"));
  }, [deckId]);

  if (error) {
    return (
      <div className="space-y-4">
        <Link href={`/players/${playerId}`} className="text-sm text-gray-400 hover:text-gray-600">&larr; Back</Link>
        <div className="text-center py-12 text-gray-500">{error}</div>
      </div>
    );
  }

  if (!deck) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <Link href="/players" className="text-gray-400 hover:text-gray-600">&larr; Players</Link>
        <span className="text-gray-300">/</span>
        <Link href={`/players/${playerId}`} className="text-gray-400 hover:text-gray-600">{deck.owner.name}</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-600 font-medium">{deck.name}</span>
      </div>

      {/* Commander images */}
      <div className="flex gap-4 justify-center">
        {deck.commanderImage && (
          <img
            src={deck.commanderImage}
            alt={deck.commander}
            className="w-full max-w-xs rounded-lg shadow-md"
          />
        )}
        {deck.commander2Image && deck.commander2 && (
          <img
            src={deck.commander2Image}
            alt={deck.commander2}
            className="w-full max-w-xs rounded-lg shadow-md"
          />
        )}
      </div>

      {/* Deck header */}
      <div>
        <h1 className="text-2xl font-bold">{deck.name}</h1>
        <p className="text-gray-500">
          {deck.commander}{deck.commander2 ? ` & ${deck.commander2}` : ""}
        </p>
      </div>

      {/* Color pips and badges */}
      <div className="flex items-center gap-3 flex-wrap">
        <ColorPips
          colors={{
            W: deck.colorW,
            U: deck.colorU,
            B: deck.colorB,
            R: deck.colorR,
            G: deck.colorG,
          }}
        />
        {deck.bracket != null && (
          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
            Bracket {deck.bracket}
          </span>
        )}
        {deck.edhp != null && (
          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
            EDHP {deck.edhp.toFixed(2)}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-gray-900">{deck.wins}W - {deck.games - deck.wins}L</div>
          <div className="text-xs text-gray-500">Record</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-gray-900">{deck.winRate}%</div>
          <div className="text-xs text-gray-500">Win Rate</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-gray-900">{deck.games}</div>
          <div className="text-xs text-gray-500">Games</div>
        </div>
      </div>

      {/* Per-player-count stats */}
      {deck.games > 0 && (
        <div className="flex gap-3">
          {([2, 3, 4] as const).map((count) => {
            const stat = deck.winRateByPlayerCount[count];
            return (
              <div key={count} className="flex-1 bg-white border border-gray-200 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-400 mb-1">{count}-player</div>
                {stat ? (
                  <div className="font-semibold text-gray-700">
                    {stat.winRate}% <span className="text-gray-400 font-normal text-xs">({stat.games})</span>
                  </div>
                ) : (
                  <div className="text-gray-300">&mdash;</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Decklist */}
      {deck.decklist ? (
        <div>
          <h2 className="text-lg font-semibold mb-2">Decklist</h2>
          <pre className="bg-white border border-gray-200 rounded-lg p-4 text-sm font-mono whitespace-pre-wrap text-gray-800 max-h-96 overflow-y-auto">
            {deck.decklist}
          </pre>
        </div>
      ) : (
        <div className="text-center py-6 text-gray-400 text-sm">
          No decklist available.
        </div>
      )}
    </div>
  );
}

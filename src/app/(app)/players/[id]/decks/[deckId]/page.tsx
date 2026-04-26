"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import ColorPips from "@/components/ColorPips";
import CardGrid, { type DeckCard } from "@/components/CardGrid";
import RecommendationsModal from "@/components/RecommendationsModal";

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
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string })?.id;
  const playerId = params.id as string;
  const deckId = params.deckId as string;
  const isOwner = currentUserId === playerId;
  const [deck, setDeck] = useState<DeckDetail | null>(null);
  const [error, setError] = useState("");
  const [deckCards, setDeckCards] = useState<DeckCard[] | null>(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [showRecs, setShowRecs] = useState(false);

  useEffect(() => {
    fetch(`/api/players/decks/${deckId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Deck not found");
        return r.json();
      })
      .then((d: DeckDetail) => {
        setDeck(d);
        if (d.decklist) {
          fetch("/api/cards/collection", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ decklist: d.decklist }),
          })
            .then((r) => r.json())
            .then((data) => {
              setDeckCards(data.cards ?? []);
              setTotalPrice(data.totalPrice ?? 0);
            })
            .catch(() => {});
        }
      })
      .catch(() => setError("Deck not found"));
  }, [deckId]);

  if (error) {
    return (
      <div className="space-y-4">
        <Link href={`/players/${playerId}`} className="text-sm text-text-muted hover:text-text-secondary">&larr; Back</Link>
        <div className="text-center py-12 text-text-tertiary">{error}</div>
      </div>
    );
  }

  if (!deck) {
    return <div className="text-center py-12 text-text-tertiary">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <Link href="/players" className="text-text-muted hover:text-text-secondary">&larr; Players</Link>
        <span className="text-text-muted">/</span>
        <Link href={`/players/${playerId}`} className="text-text-muted hover:text-text-secondary">{deck.owner.name}</Link>
        <span className="text-text-muted">/</span>
        <span className="text-text-secondary font-medium">{deck.name}</span>
      </div>

      {/* Commander images */}
      <div className="flex gap-3 justify-center">
        {deck.commanderImage && (
          <img
            src={deck.commanderImage}
            alt={deck.commander}
            className={`rounded-lg shadow-md ${deck.commander2Image ? "w-1/2 max-w-[200px]" : "w-full max-w-xs"}`}
          />
        )}
        {deck.commander2Image && deck.commander2 && (
          <img
            src={deck.commander2Image}
            alt={deck.commander2}
            className="w-1/2 max-w-[200px] rounded-lg shadow-md"
          />
        )}
      </div>

      {/* Deck header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{deck.name}</h1>
          <p className="text-text-tertiary">
            {deck.commander}{deck.commander2 ? ` & ${deck.commander2}` : ""}
          </p>
        </div>
        {isOwner && (
          <div className="flex gap-2 flex-shrink-0">
            <Link
              href={`/decks/${deckId}/edit`}
              className="px-3 py-1.5 text-sm font-medium border border-border-strong rounded-lg hover:bg-surface-raised transition-colors"
            >
              Edit
            </Link>
            <button
              onClick={async () => {
                if (!confirm("Delete this deck?")) return;
                await fetch(`/api/decks/${deckId}`, { method: "DELETE" });
                router.push("/decks");
              }}
              className="px-3 py-1.5 text-sm font-medium text-danger border border-red-200 rounded-lg hover:bg-danger-bg transition-colors"
            >
              Delete
            </button>
          </div>
        )}
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
          <span className="bg-surface-sunken text-text-secondary px-2 py-0.5 rounded text-xs">
            Bracket {deck.bracket}
          </span>
        )}
        {deck.edhp != null && (
          <span className="bg-surface-sunken text-text-secondary px-2 py-0.5 rounded text-xs">
            EDHP {deck.edhp.toFixed(2)}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface border border-border rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-text-primary">{deck.wins}W - {deck.games - deck.wins}L</div>
          <div className="text-xs text-text-tertiary">Record</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-text-primary">{deck.winRate}%</div>
          <div className="text-xs text-text-tertiary">Win Rate</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-text-primary">{deck.games}</div>
          <div className="text-xs text-text-tertiary">Games</div>
        </div>
      </div>

      {/* Per-player-count stats */}
      {deck.games > 0 && (
        <div className="flex gap-3">
          {([2, 3, 4] as const).map((count) => {
            const stat = deck.winRateByPlayerCount[count];
            return (
              <div key={count} className="flex-1 bg-surface border border-border rounded-lg p-3 text-center">
                <div className="text-xs text-text-muted mb-1">{count}-player</div>
                {stat ? (
                  <div className="font-semibold text-text-secondary">
                    {stat.winRate}% <span className="text-text-muted font-normal text-xs">({stat.games})</span>
                  </div>
                ) : (
                  <div className="text-text-muted">&mdash;</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setShowRecs(true)}
          className="px-4 py-2 text-sm font-medium btn-primary bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
        >
          Get Recommendations
        </button>
        <a
          href={`https://edhrec.com/commanders/${deck.commander.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 text-sm font-medium border border-border-strong rounded-lg hover:bg-surface-raised transition-colors"
        >
          View on EDHREC
        </a>
      </div>

      {/* Card grid */}
      {deckCards ? (
        <CardGrid cards={deckCards} totalPrice={totalPrice} />
      ) : deck.decklist ? (
        <div className="text-center py-6 text-text-muted text-sm">
          Loading cards...
        </div>
      ) : (
        <div className="text-center py-6 text-text-muted text-sm">
          No decklist available.
        </div>
      )}

      {/* Recommendations modal */}
      {showRecs && (
        <RecommendationsModal
          commander={deck.commander}
          colors={[
            ...(deck.colorW ? ["W"] : []),
            ...(deck.colorU ? ["U"] : []),
            ...(deck.colorB ? ["B"] : []),
            ...(deck.colorR ? ["R"] : []),
            ...(deck.colorG ? ["G"] : []),
          ]}
          existingCards={deckCards?.map((c) => c.name) ?? []}
          onClose={() => setShowRecs(false)}
        />
      )}
    </div>
  );
}

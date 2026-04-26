"use client";

import { useEffect, useState } from "react";

interface RecCard {
  name: string;
  manaCost: string | null;
  cmc: number | null;
  typeLine: string | null;
  oracleText: string | null;
  power: string | null;
  toughness: string | null;
  rarity: string | null;
  edhrecRank: number | null;
  imageSmall: string | null;
  imageNormal: string | null;
  priceUsd: number | null;
  scryfallUri: string | null;
}

const RARITY_COLORS: Record<string, string> = {
  common: "text-text-tertiary",
  uncommon: "text-text-muted",
  rare: "text-yellow-500",
  mythic: "text-orange-500",
};

export default function RecommendationsModal({
  commander,
  colors,
  existingCards,
  onClose,
}: {
  commander: string;
  colors: string[];
  existingCards: string[];
  onClose: () => void;
}) {
  const [cards, setCards] = useState<RecCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<RecCard | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/cards/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commander,
        colors,
        excludeNames: existingCards,
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((data) => {
        if (!cancelled) {
          if (data.error) {
            setError(true);
          } else {
            setCards(data.cards ?? []);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [commander, colors, existingCards]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white text-2xl font-bold transition-colors shadow-lg"
        >
          &times;
        </button>

        <div className="p-4">
          <h2 className="text-lg font-bold text-text-primary mb-1">
            Recommendations for
            <br />
            {commander}
          </h2>
          <p className="text-sm text-text-tertiary mb-4">
            Popular EDH cards in your colors that aren&apos;t in your deck yet. Sorted by EDHREC popularity.
          </p>

          {loading ? (
            <div className="text-center py-12 text-text-muted">Loading recommendations...</div>
          ) : error ? (
            <div className="text-center py-12 text-red-400">Failed to load recommendations. Try again later.</div>
          ) : cards.length === 0 ? (
            <div className="text-center py-12 text-text-muted">No recommendations found.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {cards.map((card) => (
                <button
                  key={card.name}
                  onClick={() => setSelected(selected?.name === card.name ? null : card)}
                  className={`text-left rounded-lg overflow-hidden border transition-all ${
                    selected?.name === card.name
                      ? "border-blue-400 shadow-md"
                      : "border-border hover:border-accent hover:shadow-sm"
                  }`}
                >
                  {card.imageSmall ? (
                    <img
                      src={card.imageSmall}
                      alt={card.name}
                      className="w-full aspect-[5/7] object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full aspect-[5/7] bg-surface-sunken flex items-center justify-center text-xs text-text-muted p-2 text-center">
                      {card.name}
                    </div>
                  )}
                  <div className="p-1.5">
                    <div className="text-xs font-medium text-text-primary truncate">
                      {card.name}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className={`text-xs capitalize ${RARITY_COLORS[card.rarity ?? ""] ?? "text-text-muted"}`}>
                        {card.rarity ?? "—"}
                      </span>
                      {card.priceUsd != null ? (
                        <span className="text-xs text-success font-medium">
                          ${card.priceUsd.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted">—</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Selected card detail */}
          {selected && (
            <div className="mt-4 p-3 bg-surface-raised rounded-lg border border-border">
              <div className="flex gap-3">
                {selected.imageNormal && (
                  <img
                    src={selected.imageNormal}
                    alt={selected.name}
                    className="w-40 rounded-lg flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-text-primary">{selected.name}</h3>
                  {selected.manaCost && (
                    <div className="text-sm text-text-tertiary">{selected.manaCost}</div>
                  )}
                  {selected.typeLine && (
                    <div className="text-sm text-text-secondary mt-1">{selected.typeLine}</div>
                  )}
                  {selected.oracleText && (
                    <div className="text-xs text-text-tertiary mt-1 whitespace-pre-wrap">{selected.oracleText}</div>
                  )}
                  {selected.power != null && selected.toughness != null && (
                    <div className="text-sm font-semibold text-text-primary mt-1">{selected.power}/{selected.toughness}</div>
                  )}
                  <div className="flex gap-3 mt-2 text-xs text-text-tertiary">
                    {selected.edhrecRank && (
                      <span>EDHREC #{selected.edhrecRank}</span>
                    )}
                    {selected.priceUsd != null && (
                      <span className="text-success">${selected.priceUsd.toFixed(2)}</span>
                    )}
                  </div>
                  {selected.scryfallUri && (
                    <a
                      href={selected.scryfallUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-xs text-accent hover:text-accent-hover"
                    >
                      View on Scryfall &rarr;
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

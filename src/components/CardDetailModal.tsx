"use client";

import { useEffect, useState } from "react";
import type { DeckCard } from "./CardGrid";

interface Ruling {
  source: string;
  publishedAt: string;
  comment: string;
}

export default function CardDetailModal({
  card,
  onClose,
}: {
  card: DeckCard;
  onClose: () => void;
}) {
  const [rulings, setRulings] = useState<Ruling[] | null>(null);
  const [flipped, setFlipped] = useState(false);
  const hasDFC = !!card.backImageNormal;

  useEffect(() => {
    if (!card.scryfallId) return;
    let cancelled = false;
    fetch(`/api/cards/rulings?id=${card.scryfallId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setRulings(data.rulings ?? []);
      })
      .catch(() => {
        if (!cancelled) setRulings([]);
      });
    return () => { cancelled = true; };
  }, [card.scryfallId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button over image */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white text-2xl font-bold transition-colors shadow-lg"
        >
          &times;
        </button>

        {/* Card image */}
        <div className="relative">
          {(flipped ? card.backImageNormal : card.imageNormal) && (
            <img
              src={(flipped ? card.backImageNormal : card.imageNormal)!}
              alt={flipped ? card.backName ?? card.name : card.name}
              className="w-full rounded-t-xl"
            />
          )}
          {hasDFC && (
            <button
              onClick={() => setFlipped(!flipped)}
              className="absolute bottom-3 left-3 z-10 px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white text-xs font-bold transition-colors shadow-lg"
            >
              Flip Card
            </button>
          )}
        </div>

        <div className="p-4 space-y-3">
          {/* Header */}
          <div>
            <h3 className="text-lg font-bold text-text-primary">
              {flipped ? card.backName ?? card.name : card.name}
            </h3>
            {!flipped && card.manaCost && (
              <span className="text-sm text-text-tertiary">{card.manaCost}</span>
            )}
          </div>

          {/* Type line */}
          {(flipped ? card.backTypeLine : card.typeLine) && (
            <div className="text-sm font-medium text-text-secondary">
              {flipped ? card.backTypeLine : card.typeLine}
            </div>
          )}

          {/* Oracle text */}
          {(flipped ? card.backOracleText : card.oracleText) && (
            <div className="text-sm text-text-secondary whitespace-pre-wrap border-t border-border-light pt-2">
              {flipped ? card.backOracleText : card.oracleText}
            </div>
          )}

          {/* P/T */}
          {(flipped ? card.backPower : card.power) != null && (flipped ? card.backToughness : card.toughness) != null && (
            <div className="text-sm font-semibold text-text-primary">
              {flipped ? card.backPower : card.power}/{flipped ? card.backToughness : card.toughness}
            </div>
          )}

          {/* Stats row */}
          <div className="flex gap-4 text-xs text-text-tertiary border-t border-border-light pt-2">
            {card.rarity && (
              <span className="capitalize">{card.rarity}</span>
            )}
            {card.setName && <span>{card.setName}</span>}
            {card.cmc != null && <span>CMC {card.cmc}</span>}
          </div>

          {/* Pricing */}
          <div className="bg-surface-raised rounded-lg p-3">
            <div className="text-xs font-semibold text-text-tertiary mb-1">
              Pricing
            </div>
            <div className="flex gap-4">
              <div>
                <div className="text-xs text-text-muted">Regular</div>
                <div className="text-sm font-semibold text-success">
                  {card.priceUsd != null
                    ? `$${card.priceUsd.toFixed(2)}`
                    : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-text-muted">Foil</div>
                <div className="text-sm font-semibold text-purple-600">
                  {card.priceFoil != null
                    ? `$${card.priceFoil.toFixed(2)}`
                    : "—"}
                </div>
              </div>
              {card.quantity > 1 && card.priceUsd != null && (
                <div>
                  <div className="text-xs text-text-muted">
                    {card.quantity}x Total
                  </div>
                  <div className="text-sm font-semibold text-success">
                    ${(card.priceUsd * card.quantity).toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rulings */}
          <div>
            <div className="text-xs font-semibold text-text-tertiary mb-1">
              Rulings
            </div>
            {rulings === null ? (
              <div className="text-xs text-text-muted">Loading...</div>
            ) : rulings.length === 0 ? (
              <div className="text-xs text-text-muted">No rulings found.</div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {rulings.map((r, i) => (
                  <div
                    key={i}
                    className="text-xs text-text-secondary border-l-2 border-border pl-2"
                  >
                    <div className="text-text-muted mb-0.5">
                      {r.publishedAt} &middot; {r.source}
                    </div>
                    {r.comment}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scryfall link */}
          {card.scryfallUri && (
            <a
              href={card.scryfallUri}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-sm text-accent hover:text-accent-hover pt-1"
            >
              View on Scryfall &rarr;
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

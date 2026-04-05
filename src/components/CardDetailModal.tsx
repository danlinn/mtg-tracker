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
        className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card image */}
        {card.imageNormal && (
          <img
            src={card.imageNormal}
            alt={card.name}
            className="w-full rounded-t-xl"
          />
        )}

        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{card.name}</h3>
              {card.manaCost && (
                <span className="text-sm text-gray-500">{card.manaCost}</span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              &times;
            </button>
          </div>

          {/* Type line */}
          {card.typeLine && (
            <div className="text-sm font-medium text-gray-700">
              {card.typeLine}
            </div>
          )}

          {/* Oracle text */}
          {card.oracleText && (
            <div className="text-sm text-gray-600 whitespace-pre-wrap border-t border-gray-100 pt-2">
              {card.oracleText}
            </div>
          )}

          {/* P/T */}
          {card.power != null && card.toughness != null && (
            <div className="text-sm font-semibold text-gray-800">
              {card.power}/{card.toughness}
            </div>
          )}

          {/* Stats row */}
          <div className="flex gap-4 text-xs text-gray-500 border-t border-gray-100 pt-2">
            {card.rarity && (
              <span className="capitalize">{card.rarity}</span>
            )}
            {card.setName && <span>{card.setName}</span>}
            {card.cmc != null && <span>CMC {card.cmc}</span>}
          </div>

          {/* Pricing */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs font-semibold text-gray-500 mb-1">
              Pricing
            </div>
            <div className="flex gap-4">
              <div>
                <div className="text-xs text-gray-400">Regular</div>
                <div className="text-sm font-semibold text-green-600">
                  {card.priceUsd != null
                    ? `$${card.priceUsd.toFixed(2)}`
                    : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Foil</div>
                <div className="text-sm font-semibold text-purple-600">
                  {card.priceFoil != null
                    ? `$${card.priceFoil.toFixed(2)}`
                    : "—"}
                </div>
              </div>
              {card.quantity > 1 && card.priceUsd != null && (
                <div>
                  <div className="text-xs text-gray-400">
                    {card.quantity}x Total
                  </div>
                  <div className="text-sm font-semibold text-green-600">
                    ${(card.priceUsd * card.quantity).toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rulings */}
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-1">
              Rulings
            </div>
            {rulings === null ? (
              <div className="text-xs text-gray-400">Loading...</div>
            ) : rulings.length === 0 ? (
              <div className="text-xs text-gray-400">No rulings found.</div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {rulings.map((r, i) => (
                  <div
                    key={i}
                    className="text-xs text-gray-600 border-l-2 border-gray-200 pl-2"
                  >
                    <div className="text-gray-400 mb-0.5">
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
              className="block text-center text-sm text-blue-600 hover:text-blue-800 pt-1"
            >
              View on Scryfall &rarr;
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import CardDetailModal from "./CardDetailModal";

export interface DeckCard {
  quantity: number;
  name: string;
  found: boolean;
  manaCost: string | null;
  cmc: number | null;
  typeLine: string | null;
  oracleText: string | null;
  power: string | null;
  toughness: string | null;
  rarity: string | null;
  setName: string | null;
  imageSmall: string | null;
  imageNormal: string | null;
  priceUsd: number | null;
  priceFoil: number | null;
  scryfallUri: string | null;
  scryfallId: string | null;
}

const RARITY_COLORS: Record<string, string> = {
  common: "text-gray-500",
  uncommon: "text-gray-400",
  rare: "text-yellow-500",
  mythic: "text-orange-500",
};

export default function CardGrid({
  cards,
  totalPrice,
}: {
  cards: DeckCard[];
  totalPrice: number;
}) {
  const [selected, setSelected] = useState<DeckCard | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">
          Cards ({cards.reduce((sum, c) => sum + c.quantity, 0)})
        </h2>
        <div className="text-sm font-semibold text-green-600">
          ${totalPrice.toFixed(2)}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {cards.map((card, i) => (
          <button
            key={`${card.name}-${i}`}
            onClick={() => setSelected(card)}
            className="text-left rounded-lg overflow-hidden border border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all"
          >
            {card.imageSmall ? (
              <img
                src={card.imageSmall}
                alt={card.name}
                className="w-full aspect-[5/7] object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full aspect-[5/7] bg-gray-100 flex items-center justify-center text-xs text-gray-400 p-2 text-center">
                {card.name}
              </div>
            )}
            <div className="p-1.5">
              <div className="text-xs font-medium text-gray-900 truncate">
                {card.quantity > 1 && (
                  <span className="text-gray-400">{card.quantity}x </span>
                )}
                {card.name}
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className={`text-xs capitalize ${RARITY_COLORS[card.rarity ?? ""] ?? "text-gray-400"}`}>
                  {card.rarity ?? "—"}
                </span>
                {card.priceUsd != null ? (
                  <span className="text-xs text-green-600 font-medium">
                    ${card.priceUsd.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-xs text-gray-300">—</span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <CardDetailModal card={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

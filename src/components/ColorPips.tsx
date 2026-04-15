"use client";

// Small row of MTG color pips — delegates rendering to ManaSymbol so
// the pips pick up the active theme's palette automatically.

import ManaSymbol from "@/components/ManaSymbol";

interface ColorPipsProps {
  colors: { W: boolean; U: boolean; B: boolean; R: boolean; G: boolean };
}

export default function ColorPips({ colors }: ColorPipsProps) {
  const active = (["W", "U", "B", "R", "G"] as const).filter((k) => colors[k]);
  if (active.length === 0) {
    return <span className="text-gray-400 text-xs">Colorless</span>;
  }
  return (
    <div className="flex gap-1">
      {active.map((key) => (
        <ManaSymbol key={key} color={key} size="sm" />
      ))}
    </div>
  );
}

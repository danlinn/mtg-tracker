"use client";

import { useThemePalette } from "@/lib/theme";
import type { Palette, ColorKey } from "@/lib/themePalettes";

const GRADIENT_ORDER: ColorKey[] = ["B", "U", "R", "G", "W"];

function getHexes(combo: ColorKey[], palette: Palette) {
  const ordered = GRADIENT_ORDER.filter((c) => combo.includes(c));
  return ordered.map((c) => palette[c].hex);
}

type GradientStyle = {
  name: string;
  description: string;
  fn: (combo: ColorKey[], palette: Palette) => string;
};

const GRADIENT_STYLES: GradientStyle[] = [
  {
    name: "Linear",
    description: "Clean diagonal stripe",
    fn: (combo, palette) => {
      const hexes = getHexes(combo, palette);
      if (hexes.length === 1) return hexes[0];
      const stops = hexes.map((h, i) => {
        if (i === 0) return `${h} 10%`;
        if (i === hexes.length - 1) return `${h} 90%`;
        return h;
      });
      return `linear-gradient(135deg, ${stops.join(", ")})`;
    },
  },
  {
    name: "Radial Burst",
    description: "Colors radiate from center",
    fn: (combo, palette) => {
      const hexes = getHexes(combo, palette);
      if (hexes.length === 1) return hexes[0];
      return `radial-gradient(circle at center, ${hexes.join(", ")})`;
    },
  },
  {
    name: "Hard Split",
    description: "Sharp vertical bands, no blending",
    fn: (combo, palette) => {
      const hexes = getHexes(combo, palette);
      if (hexes.length === 1) return hexes[0];
      const pct = 100 / hexes.length;
      const stops = hexes.flatMap((h, i) => [
        `${h} ${(i * pct).toFixed(1)}%`,
        `${h} ${((i + 1) * pct).toFixed(1)}%`,
      ]);
      return `linear-gradient(90deg, ${stops.join(", ")})`;
    },
  },
  {
    name: "Diagonal Shards",
    description: "Hard-edge diagonal bands like stained glass",
    fn: (combo, palette) => {
      const hexes = getHexes(combo, palette);
      if (hexes.length === 1) return hexes[0];
      const pct = 100 / hexes.length;
      const stops = hexes.flatMap((h, i) => [
        `${h} ${(i * pct).toFixed(1)}%`,
        `${h} ${((i + 1) * pct).toFixed(1)}%`,
      ]);
      return `linear-gradient(135deg, ${stops.join(", ")})`;
    },
  },
  {
    name: "Conic Sweep",
    description: "Colors rotate around center like a wheel",
    fn: (combo, palette) => {
      const hexes = getHexes(combo, palette);
      if (hexes.length === 1) return hexes[0];
      return `conic-gradient(from 0deg, ${hexes.join(", ")}, ${hexes[0]})`;
    },
  },
  {
    name: "Horizontal Bands",
    description: "Even horizontal stripes",
    fn: (combo, palette) => {
      const hexes = getHexes(combo, palette);
      if (hexes.length === 1) return hexes[0];
      const pct = 100 / hexes.length;
      const stops = hexes.flatMap((h, i) => [
        `${h} ${(i * pct).toFixed(1)}%`,
        `${h} ${((i + 1) * pct).toFixed(1)}%`,
      ]);
      return `linear-gradient(180deg, ${stops.join(", ")})`;
    },
  },
  {
    name: "Vignette",
    description: "Primary center, others glow from edges",
    fn: (combo, palette) => {
      const hexes = getHexes(combo, palette);
      if (hexes.length === 1) return hexes[0];
      const center = hexes[0];
      const edge = hexes.length > 2
        ? `color-mix(in srgb, ${hexes[1]} 50%, ${hexes[hexes.length - 1]})`
        : hexes[1];
      return `radial-gradient(ellipse at center, ${center} 30%, ${edge} 100%)`;
    },
  },
  {
    name: "Chevron",
    description: "V-shaped gradient pointing down",
    fn: (combo, palette) => {
      const hexes = getHexes(combo, palette);
      if (hexes.length === 1) return hexes[0];
      const mid = hexes[0];
      const edge = hexes[hexes.length - 1];
      return `linear-gradient(160deg, ${edge} 25%, ${mid} 50%, ${edge} 75%)`;
    },
  },
  {
    name: "Pixelated",
    description: "Tiny repeating squares (retro/digital)",
    fn: (combo, palette) => {
      const hexes = getHexes(combo, palette);
      if (hexes.length === 1) return hexes[0];
      const a = hexes[0];
      const b = hexes[hexes.length - 1];
      return `repeating-conic-gradient(${a} 0% 25%, ${b} 0% 50%) 0 0 / 16px 16px`;
    },
  },
  {
    name: "Mesh",
    description: "Overlapping radials for a rough textured look",
    fn: (combo, palette) => {
      const hexes = getHexes(combo, palette);
      if (hexes.length === 1) return hexes[0];
      const layers = hexes.map((h, i) => {
        const x = i % 2 === 0 ? "30%" : "70%";
        const y = i < hexes.length / 2 ? "30%" : "70%";
        return `radial-gradient(ellipse at ${x} ${y}, ${h} 0%, transparent 70%)`;
      });
      return `${layers.join(", ")}, ${hexes[hexes.length - 1]}`;
    },
  },
];

const SAMPLE_COMBOS: { label: string; combo: ColorKey[] }[] = [
  { label: "WU (Azorius)", combo: ["W", "U"] },
  { label: "BRG (Jund)", combo: ["B", "R", "G"] },
  { label: "WUBRG (5-color)", combo: ["W", "U", "B", "R", "G"] },
  { label: "WB (Orzhov)", combo: ["W", "B"] },
  { label: "UR (Izzet)", combo: ["U", "R"] },
];

function textOn(bg: string): string {
  const match = bg.match(/#[0-9a-fA-F]{6}/);
  if (!match) return "#ffffff";
  const hex = match[0].replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#111827" : "#ffffff";
}

export default function GradientDemoPage() {
  const palette = useThemePalette();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Gradient Style Mockups</h1>
      <p className="text-sm text-gray-500">
        Each row shows one gradient style applied to different color combos.
        Switch themes in the menu to see how they adapt.
      </p>

      {GRADIENT_STYLES.map((style) => (
        <div key={style.name} className="space-y-2">
          <div>
            <h2 className="text-lg font-semibold">{style.name}</h2>
            <p className="text-xs text-gray-500">{style.description}</p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {SAMPLE_COMBOS.map((sample) => {
              const bg = style.fn(sample.combo, palette);
              const color = textOn(bg);
              return (
                <div
                  key={sample.label}
                  className="flex-shrink-0 w-40 h-28 rounded-xl flex flex-col items-center justify-center border border-white/20 shadow-md"
                  style={{ background: bg, color }}
                >
                  <span className="text-2xl font-bold" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>
                    40
                  </span>
                  <span className="text-[10px] font-medium mt-1 opacity-80">
                    {sample.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

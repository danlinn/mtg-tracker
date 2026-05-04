// Per-theme interpretations of the MTG color wheel.
//
// Design rule (from the user): "a color can never shift so far that it is
// 'another color'." Reds stay red, blues stay blue, etc. Each theme gets
// tinted so it feels native to that theme's dark aesthetic — but if a
// W square looked more yellow than white, or a U looked green, that'd
// violate the rule.
//
// These palettes are applied wherever the app shows the MTG color wheel:
//   - decks gradient backgrounds (decks page listing + card)
//   - tracker player boxes + commander damage cells
//   - ManaSymbol filter pills (decks + stats pages)

import type { ThemeName } from "@/lib/theme";

export type ColorKey = "W" | "U" | "B" | "R" | "G" | "C";
export type ManaColorKey = Exclude<ColorKey, "C">;

export interface ColorSwatch {
  /** Background color (used for fill/gradient stops) */
  hex: string;
  /** Text color that reads on top of `hex` */
  text: string;
}

export type Palette = Record<ColorKey, ColorSwatch>;

// "default" = the palette we shipped originally. Always available as the
// reset target for the tracker's "Default color" button.
const DEFAULT_PALETTE: Palette = {
  W: { hex: "#f5f5f4", text: "#1a1a1a" },
  U: { hex: "#60a5fa", text: "#ffffff" },
  B: { hex: "#404040", text: "#f5f5f4" },
  R: { hex: "#f87171", text: "#ffffff" },
  G: { hex: "#4ade80", text: "#ffffff" },
  C: { hex: "#9ca3af", text: "#ffffff" },
};

export const THEME_PALETTES: Record<ThemeName, Palette> = {
  default: DEFAULT_PALETTE,

  // Synthwave: dark purple bg, teal accent. Pinks + cyans but each color
  // still reads as itself.
  synth: {
    W: { hex: "#f0e6ff", text: "#2a1a40" },
    U: { hex: "#5dd4ff", text: "#05101a" },
    B: { hex: "#1a0d2b", text: "#e4dff0" },
    R: { hex: "#ff44cc", text: "#ffffff" },
    G: { hex: "#5eeb9e", text: "#05201a" },
    C: { hex: "#9d8bb0", text: "#0a0812" },
  },

  // Cyberpunk: jet black bg, cyan + magenta + acid green neon.
  cyber: {
    W: { hex: "#e0f7ff", text: "#05050a" },
    U: { hex: "#00bfff", text: "#ffffff" },
    B: { hex: "#050a14", text: "#d0eaff" },
    R: { hex: "#ff3355", text: "#ffffff" },
    G: { hex: "#00ff88", text: "#003018" },
    C: { hex: "#6080a0", text: "#ffffff" },
  },

  // Flame: hot pink accent on very dark purple. Warm cream white, blood
  // near-black, bright fire red. Blue stays blue (just a bit cooler).
  flame: {
    W: { hex: "#ffe4d0", text: "#3a1010" },
    U: { hex: "#7a8fff", text: "#ffffff" },
    B: { hex: "#20060f", text: "#fff0f5" },
    R: { hex: "#ff3344", text: "#ffffff" },
    G: { hex: "#88cc55", text: "#0c1505" },
    C: { hex: "#886677", text: "#ffffff" },
  },

  // Chris: pure black/white minimalist. All colors are desaturated but
  // still recognizable as themselves.
  chris: {
    W: { hex: "#f0f0f0", text: "#0a0a0a" },
    U: { hex: "#4a6280", text: "#ffffff" },
    B: { hex: "#050505", text: "#f0f0f0" },
    R: { hex: "#a03030", text: "#ffffff" },
    G: { hex: "#3d6b3d", text: "#ffffff" },
    C: { hex: "#555555", text: "#ffffff" },
  },

  // Phyrexia: oil-slick green-black with a phyrexian glow green.
  phyrexia: {
    W: { hex: "#d8e0c8", text: "#1a2a1a" },
    U: { hex: "#2a6a74", text: "#ffffff" },
    B: { hex: "#0a0e0a", text: "#c8d8c0" },
    R: { hex: "#a02a2a", text: "#ffffff" },
    G: { hex: "#6adf4a", text: "#0a1a0a" },
    C: { hex: "#5a6a55", text: "#ffffff" },
  },

  // Stained glass: deep jewel tones. Pearl, sapphire, onyx, ruby, emerald.
  "stained-glass": {
    W: { hex: "#f0e6c0", text: "#2a1f0a" },
    U: { hex: "#2050c0", text: "#ffffff" },
    B: { hex: "#1a0f28", text: "#e8dce8" },
    R: { hex: "#c02030", text: "#ffffff" },
    G: { hex: "#1a9050", text: "#ffffff" },
    C: { hex: "#a09bb0", text: "#1a0f28" },
  },

  // Dungeon (D&D torchlight): parchment, stone blue, cave black, torch red.
  dungeon: {
    W: { hex: "#ede0c0", text: "#2a1f0a" },
    U: { hex: "#486080", text: "#ffffff" },
    B: { hex: "#18120c", text: "#d8c8a8" },
    R: { hex: "#c04020", text: "#ffffff" },
    G: { hex: "#607030", text: "#ffffff" },
    C: { hex: "#85725a", text: "#ffffff" },
  },

  // Neon Dynasty (Kamigawa): neon pink + electric indigo + cyber lime.
  "neon-dynasty": {
    W: { hex: "#ffe4f0", text: "#2a0a1a" },
    U: { hex: "#5a60ff", text: "#ffffff" },
    B: { hex: "#140828", text: "#e8daf0" },
    R: { hex: "#ff69b4", text: "#ffffff" },
    G: { hex: "#5affa0", text: "#0a2a18" },
    C: { hex: "#a090b0", text: "#140828" },
  },

  // Grixis (URB shard): crow black + blood red + deep blue. White and
  // green are muted since Grixis shuns them.
  grixis: {
    W: { hex: "#d8cfc0", text: "#06080c" },
    U: { hex: "#3060a0", text: "#ffffff" },
    B: { hex: "#020408", text: "#c8d0e0" },
    R: { hex: "#c03040", text: "#ffffff" },
    G: { hex: "#5a7840", text: "#ffffff" },
    C: { hex: "#606878", text: "#ffffff" },
  },
};

/**
 * Resolve a palette by theme name. Safe for SSR (falls back to default).
 */
export function getPalette(theme: ThemeName | undefined | null): Palette {
  if (!theme) return DEFAULT_PALETTE;
  return THEME_PALETTES[theme] ?? DEFAULT_PALETTE;
}

export { DEFAULT_PALETTE };

export function textOn(bg: string): string {
  const match = bg.match(/#[0-9a-fA-F]{6}/);
  if (!match) return "#ffffff";
  const hex = match[0].replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? "#111827" : "#ffffff";
}

export function comboForDeck(deck: { colorW: boolean; colorU: boolean; colorB: boolean; colorR: boolean; colorG: boolean }): ColorKey[] {
  const combo: ColorKey[] = [];
  if (deck.colorW) combo.push("W");
  if (deck.colorU) combo.push("U");
  if (deck.colorB) combo.push("B");
  if (deck.colorR) combo.push("R");
  if (deck.colorG) combo.push("G");
  return combo;
}

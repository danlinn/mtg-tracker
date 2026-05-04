import type { ColorKey, Palette } from "@/lib/themePalettes";
import type { ThemeName } from "@/lib/theme";

const GRADIENT_ORDER: ColorKey[] = ["B", "U", "R", "G", "W"];

function getHexes(combo: ColorKey[], palette: Palette): string[] {
  const ordered = GRADIENT_ORDER.filter((c) => combo.includes(c));
  return ordered.map((c) => palette[c].hex);
}

export type GradientStyleName =
  | "linear"
  | "radial"
  | "hard-split"
  | "diagonal-shards"
  | "conic"
  | "horizontal-bands"
  | "vignette"
  | "chevron"
  | "pixelated"
  | "mesh"
  | "radial-shards"
  | "ripple"
  | "stained-glass";

export interface GradientStyleDef {
  name: GradientStyleName;
  label: string;
  minColors?: number;
  maxColors?: number;
  fn: (combo: ColorKey[], palette: Palette) => string;
}

export const GRADIENT_STYLES: GradientStyleDef[] = [
  {
    name: "linear",
    label: "Linear",
    fn: (combo, palette) => {
      const hexes = getHexes(combo, palette);
      if (hexes.length <= 1) return hexes[0] ?? palette.C.hex;
      const stops = hexes.map((h, i) => {
        if (i === 0) return `${h} 10%`;
        if (i === hexes.length - 1) return `${h} 90%`;
        return h;
      });
      return `linear-gradient(135deg, ${stops.join(", ")})`;
    },
  },
  {
    name: "radial",
    label: "Radial Burst",
    fn: (combo, palette) => {
      const hexes = getHexes(combo, palette);
      if (hexes.length <= 1) return hexes[0] ?? palette.C.hex;
      return `radial-gradient(circle at center, ${hexes.join(", ")})`;
    },
  },
  {
    name: "hard-split",
    label: "Hard Split",
    fn: (combo, palette) => {
      const hexes = getHexes(combo, palette);
      if (hexes.length <= 1) return hexes[0] ?? palette.C.hex;
      const pct = 100 / hexes.length;
      const stops = hexes.flatMap((h, i) => [
        `${h} ${(i * pct).toFixed(1)}%`,
        `${h} ${((i + 1) * pct).toFixed(1)}%`,
      ]);
      return `linear-gradient(90deg, ${stops.join(", ")})`;
    },
  },
  {
    name: "diagonal-shards",
    label: "Diagonal Shards",
    fn: (combo, palette) => {
      const hexes = getHexes(combo, palette);
      if (hexes.length <= 1) return hexes[0] ?? palette.C.hex;
      const pct = 100 / hexes.length;
      const stops = hexes.flatMap((h, i) => [
        `${h} ${(i * pct).toFixed(1)}%`,
        `${h} ${((i + 1) * pct).toFixed(1)}%`,
      ]);
      return `linear-gradient(135deg, ${stops.join(", ")})`;
    },
  },
  {
    name: "conic",
    label: "Conic Sweep",
    fn: (combo, palette) => {
      const hexes = getHexes(combo, palette);
      if (hexes.length <= 1) return hexes[0] ?? palette.C.hex;
      return `conic-gradient(from 0deg, ${hexes.join(", ")}, ${hexes[0]})`;
    },
  },
  {
    name: "horizontal-bands",
    label: "Horizontal Bands",
    fn: (combo, palette) => {
      const hexes = getHexes(combo, palette);
      if (hexes.length <= 1) return hexes[0] ?? palette.C.hex;
      const pct = 100 / hexes.length;
      const stops = hexes.flatMap((h, i) => [
        `${h} ${(i * pct).toFixed(1)}%`,
        `${h} ${((i + 1) * pct).toFixed(1)}%`,
      ]);
      return `linear-gradient(180deg, ${stops.join(", ")})`;
    },
  },
  {
    name: "vignette",
    label: "Vignette",
    fn: (combo, palette) => {
      const hexes = getHexes(combo, palette);
      if (hexes.length <= 1) return hexes[0] ?? palette.C.hex;
      const center = hexes[0];
      const edge = hexes.length > 2
        ? `color-mix(in srgb, ${hexes[1]} 50%, ${hexes[hexes.length - 1]})`
        : hexes[1];
      return `radial-gradient(ellipse at center, ${center} 30%, ${edge} 100%)`;
    },
  },
  {
    name: "chevron",
    label: "Chevron",
    maxColors: 2,
    fn: (combo, palette) => {
      const hexes = getHexes(combo, palette);
      if (hexes.length <= 1) return hexes[0] ?? palette.C.hex;
      const mid = hexes[hexes.length - 1];
      const edge = hexes[0];
      return `linear-gradient(160deg, ${edge} 25%, ${mid} 50%, ${edge} 75%)`;
    },
  },
  {
    name: "pixelated",
    label: "Pixelated",
    maxColors: 2,
    fn: (combo, palette) => {
      const hexes = getHexes(combo, palette);
      if (hexes.length <= 1) return hexes[0] ?? palette.C.hex;
      const a = hexes[0];
      const b = hexes[hexes.length - 1];
      return `repeating-conic-gradient(${a} 0% 25%, ${b} 0% 50%) 0 0 / 16px 16px`;
    },
  },
  {
    name: "mesh",
    label: "Mesh",
    fn: (combo, palette) => {
      const hexes = getHexes(combo, palette);
      if (hexes.length <= 1) return hexes[0] ?? palette.C.hex;
      const layers = hexes.map((h, i) => {
        const x = i % 2 === 0 ? "30%" : "70%";
        const y = i < hexes.length / 2 ? "30%" : "70%";
        return `radial-gradient(ellipse at ${x} ${y}, ${h} 0%, transparent 70%)`;
      });
      return `${layers.join(", ")}, ${hexes[hexes.length - 1]}`;
    },
  },
  {
    name: "radial-shards",
    label: "Radial Shards",
    fn: (combo, palette) => {
      const hexes = getHexes(combo, palette);
      if (hexes.length <= 1) return hexes[0] ?? palette.C.hex;
      const deg = 360 / hexes.length;
      const stops = hexes.flatMap((h, i) => [
        `${h} ${(i * deg).toFixed(1)}deg`,
        `${h} ${((i + 1) * deg).toFixed(1)}deg`,
      ]);
      return `conic-gradient(from 0deg, ${stops.join(", ")})`;
    },
  },
  {
    name: "ripple",
    label: "Ripple",
    fn: (combo, palette) => {
      const hexes = getHexes(combo, palette);
      if (hexes.length <= 1) return hexes[0] ?? palette.C.hex;
      // Oscillate through colors with varying stop positions
      const stops: string[] = [];
      const segments = hexes.length * 3;
      for (let i = 0; i <= segments; i++) {
        const colorIdx = i % hexes.length;
        const pct = (i / segments) * 100;
        stops.push(`${hexes[colorIdx]} ${pct.toFixed(0)}%`);
      }
      return `linear-gradient(90deg, ${stops.join(", ")})`;
    },
  },
  {
    name: "stained-glass",
    label: "Stained Glass",
    minColors: 2,
    fn: (combo, palette) => {
      const hexes = getHexes(combo, palette);
      if (hexes.length <= 1) return hexes[0] ?? palette.C.hex;
      const fills = hexes.map((h) => h.replace("#", "%23"));
      const c = (i: number) => fills[i % fills.length];
      const svg = `%3Csvg xmlns='http://www.w3.org/2000/svg' width='540' height='450' viewBox='0 0 1080 900'%3E%3Cg fill-opacity='.85'%3E%3Cpolygon fill='${c(0)}' points='90 150 0 300 180 300'/%3E%3Cpolygon fill='${c(1)}' points='90 150 180 0 0 0'/%3E%3Cpolygon fill='${c(2)}' points='270 150 360 0 180 0'/%3E%3Cpolygon fill='${c(3)}' points='450 150 360 300 540 300'/%3E%3Cpolygon fill='${c(4)}' points='450 150 540 0 360 0'/%3E%3Cpolygon fill='${c(0)}' points='630 150 540 300 720 300'/%3E%3Cpolygon fill='${c(1)}' points='630 150 720 0 540 0'/%3E%3Cpolygon fill='${c(2)}' points='810 150 720 300 900 300'/%3E%3Cpolygon fill='${c(3)}' points='810 150 900 0 720 0'/%3E%3Cpolygon fill='${c(4)}' points='990 150 900 300 1080 300'/%3E%3Cpolygon fill='${c(0)}' points='990 150 1080 0 900 0'/%3E%3Cpolygon fill='${c(1)}' points='90 450 0 600 180 600'/%3E%3Cpolygon fill='${c(2)}' points='90 450 180 300 0 300'/%3E%3Cpolygon fill='${c(3)}' points='270 450 180 600 360 600'/%3E%3Cpolygon fill='${c(4)}' points='270 450 360 300 180 300'/%3E%3Cpolygon fill='${c(0)}' points='450 450 360 600 540 600'/%3E%3Cpolygon fill='${c(1)}' points='450 450 540 300 360 300'/%3E%3Cpolygon fill='${c(2)}' points='630 450 540 600 720 600'/%3E%3Cpolygon fill='${c(3)}' points='630 450 720 300 540 300'/%3E%3Cpolygon fill='${c(4)}' points='810 450 720 600 900 600'/%3E%3Cpolygon fill='${c(0)}' points='810 450 900 300 720 300'/%3E%3Cpolygon fill='${c(1)}' points='990 450 900 600 1080 600'/%3E%3Cpolygon fill='${c(2)}' points='990 450 1080 300 900 300'/%3E%3Cpolygon fill='${c(3)}' points='90 750 0 900 180 900'/%3E%3Cpolygon fill='${c(4)}' points='270 750 180 900 360 900'/%3E%3Cpolygon fill='${c(0)}' points='270 750 360 600 180 600'/%3E%3Cpolygon fill='${c(1)}' points='450 750 540 600 360 600'/%3E%3Cpolygon fill='${c(2)}' points='630 750 540 900 720 900'/%3E%3Cpolygon fill='${c(3)}' points='630 750 720 600 540 600'/%3E%3Cpolygon fill='${c(4)}' points='810 750 720 900 900 900'/%3E%3Cpolygon fill='${c(0)}' points='810 750 900 600 720 600'/%3E%3Cpolygon fill='${c(1)}' points='990 750 900 900 1080 900'/%3E%3C/g%3E%3C/svg%3E`;
      return `${hexes[0]} url("data:image/svg+xml,${svg}")`;
    },
  },
];

export const THEME_DEFAULT_GRADIENT: Record<ThemeName, GradientStyleName> = {
  default: "linear",
  flame: "radial",
  synth: "conic",
  cyber: "hard-split",
  chris: "pixelated",
  phyrexia: "diagonal-shards",
  grixis: "diagonal-shards",
  "stained-glass": "stained-glass",
  "neon-dynasty": "mesh",
  dungeon: "linear",
};

export function getGradientStyle(name: GradientStyleName): GradientStyleDef {
  return GRADIENT_STYLES.find((s) => s.name === name) ?? GRADIENT_STYLES[0];
}

export function bgForComboStyled(
  combo: ColorKey[],
  palette: Palette,
  styleName: GradientStyleName
): string {
  if (combo.length === 0) return palette.C.hex;
  const ordered = GRADIENT_ORDER.filter((c) => combo.includes(c));
  if (ordered.length === 1) return palette[ordered[0]].hex;
  const style = getGradientStyle(styleName);
  if ((style.minColors && ordered.length < style.minColors) ||
      (style.maxColors && ordered.length > style.maxColors)) {
    return getGradientStyle("linear").fn(combo, palette);
  }
  return style.fn(combo, palette);
}

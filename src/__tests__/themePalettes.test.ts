/**
 * Theme palette regression guard. All 10 themes must define a complete
 * WUBRG + C palette with valid hex colors, and each color must remain
 * recognizable as itself (no blue shifted so far it reads green, etc.).
 */

import { describe, it, expect } from "@jest/globals";
import { THEME_PALETTES, getPalette } from "@/lib/themePalettes";

const THEMES = [
  "default",
  "synth",
  "cyber",
  "flame",
  "chris",
  "phyrexia",
  "stained-glass",
  "dungeon",
  "neon-dynasty",
  "grixis",
] as const;

const COLORS = ["W", "U", "B", "R", "G", "C"] as const;

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.match(/^#([0-9a-fA-F]{6})$/);
  if (!m) throw new Error(`Not a hex: ${hex}`);
  const v = m[1];
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
}

describe("theme palettes", () => {
  it("defines every theme", () => {
    for (const t of THEMES) {
      expect(THEME_PALETTES[t]).toBeDefined();
    }
  });

  it("every palette has all WUBRG+C colors", () => {
    for (const t of THEMES) {
      const p = THEME_PALETTES[t];
      for (const c of COLORS) {
        expect(p[c]).toBeDefined();
        expect(p[c].hex).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(p[c].text).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  // Sanity: each color must remain recognizable as itself. These checks
  // don't enforce a specific hue but catch gross violations like "the
  // blue slot has more red than blue".
  it("red stays red (R > G and R > B) across all themes", () => {
    for (const t of THEMES) {
      const [r, g, b] = hexToRgb(THEME_PALETTES[t].R.hex);
      expect(r).toBeGreaterThan(g);
      expect(r).toBeGreaterThan(b);
    }
  });

  it("green stays green (G >= R and G >= B in most themes)", () => {
    for (const t of THEMES) {
      const [r, g, b] = hexToRgb(THEME_PALETTES[t].G.hex);
      // Green channel should be the dominant channel
      expect(g).toBeGreaterThanOrEqual(r);
      expect(g).toBeGreaterThanOrEqual(b);
    }
  });

  it("blue stays blue (B channel dominant or near-dominant)", () => {
    for (const t of THEMES) {
      const [r, g, b] = hexToRgb(THEME_PALETTES[t].U.hex);
      // Blue channel should be >= red (i.e. not "more red than blue")
      expect(b).toBeGreaterThanOrEqual(r);
    }
  });

  it("white is light (avg brightness high) across all themes", () => {
    for (const t of THEMES) {
      const [r, g, b] = hexToRgb(THEME_PALETTES[t].W.hex);
      const avg = (r + g + b) / 3;
      // Threshold chosen so even the muted Chris/Grixis whites pass
      expect(avg).toBeGreaterThan(180);
    }
  });

  it("black is dark (avg brightness low) across all themes", () => {
    for (const t of THEMES) {
      const [r, g, b] = hexToRgb(THEME_PALETTES[t].B.hex);
      const avg = (r + g + b) / 3;
      // Default palette's B is #404040 (avg=64); every theme's B should be
      // at least that dark or darker.
      expect(avg).toBeLessThanOrEqual(64);
    }
  });

  it("getPalette falls back to default for unknown/nullish themes", () => {
    const def = THEME_PALETTES.default;
    expect(getPalette(null)).toEqual(def);
    expect(getPalette(undefined)).toEqual(def);
  });

  it("getPalette returns the right palette by name", () => {
    expect(getPalette("synth")).toEqual(THEME_PALETTES.synth);
    expect(getPalette("grixis")).toEqual(THEME_PALETTES.grixis);
  });

  it("getPalette falls back to default for garbage string", () => {
    const def = THEME_PALETTES.default;
    expect(getPalette("nonexistent-theme")).toEqual(def);
    expect(getPalette("")).toEqual(def);
  });

  it("no two themes share the exact same palette", () => {
    for (let i = 0; i < THEMES.length; i++) {
      for (let j = i + 1; j < THEMES.length; j++) {
        const a = JSON.stringify(THEME_PALETTES[THEMES[i]]);
        const b = JSON.stringify(THEME_PALETTES[THEMES[j]]);
        expect(a).not.toBe(b);
      }
    }
  });

  it("hex and text colors are different within each palette entry (contrast required)", () => {
    for (const t of THEMES) {
      for (const c of COLORS) {
        const entry = THEME_PALETTES[t][c];
        // hex (background) and text (foreground) should differ for readability
        expect(entry.hex).not.toBe(entry.text);
      }
    }
  });

  it("colorless (C) is never a vibrant primary color", () => {
    for (const t of THEMES) {
      const [r, g, b] = hexToRgb(THEME_PALETTES[t].C.hex);
      // Colorless should be muted/neutral — no single channel dominantly bright
      // while others are near zero (that would be a strong primary color)
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      // If the saturation is very high, that's a problem for "colorless"
      const saturation = max === 0 ? 0 : (max - min) / max;
      expect(saturation).toBeLessThan(0.5);
    }
  });
});

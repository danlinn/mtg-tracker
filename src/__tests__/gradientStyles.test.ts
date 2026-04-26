import { describe, it, expect } from "@jest/globals";
import {
  GRADIENT_STYLES,
  THEME_DEFAULT_GRADIENT,
  getGradientStyle,
  bgForComboStyled,
  type GradientStyleName,
} from "@/lib/gradientStyles";
import { getPalette } from "@/lib/themePalettes";
import type { ColorKey } from "@/lib/themePalettes";

const palette = getPalette("default");
const flamePalette = getPalette("flame");

describe("GRADIENT_STYLES", () => {
  it("has all expected styles", () => {
    const names = GRADIENT_STYLES.map((s) => s.name);
    expect(names).toContain("linear");
    expect(names).toContain("radial");
    expect(names).toContain("hard-split");
    expect(names).toContain("diagonal-shards");
    expect(names).toContain("diagonal-bleed");
    expect(names).toContain("conic");
    expect(names).toContain("horizontal-bands");
    expect(names).toContain("vignette");
    expect(names).toContain("chevron");
    expect(names).toContain("pixelated");
    expect(names).toContain("mesh");
    expect(names).toContain("radial-shards");
  });

  it("each style returns a non-empty string for multi-color combos", () => {
    const combo: ColorKey[] = ["W", "U", "B"];
    for (const style of GRADIENT_STYLES) {
      const result = style.fn(combo, palette);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    }
  });

  it("each style returns a solid color for single-color combos", () => {
    const combo: ColorKey[] = ["R"];
    for (const style of GRADIENT_STYLES) {
      const result = style.fn(combo, palette);
      expect(result).toBe(palette.R.hex);
    }
  });

  it("each style returns colorless hex for empty combos", () => {
    for (const style of GRADIENT_STYLES) {
      const result = style.fn([], palette);
      expect(result).toBe(palette.C.hex);
    }
  });
});

describe("getGradientStyle", () => {
  it("returns the correct style by name", () => {
    expect(getGradientStyle("radial").name).toBe("radial");
    expect(getGradientStyle("pixelated").name).toBe("pixelated");
  });

  it("returns linear as fallback for unknown names", () => {
    expect(getGradientStyle("nonexistent" as GradientStyleName).name).toBe("linear");
  });
});

describe("bgForComboStyled", () => {
  it("returns colorless hex for empty combo", () => {
    expect(bgForComboStyled([], palette, "linear")).toBe(palette.C.hex);
  });

  it("returns solid hex for single color", () => {
    expect(bgForComboStyled(["G"], palette, "radial")).toBe(palette.G.hex);
  });

  it("returns a gradient string for multi-color", () => {
    const result = bgForComboStyled(["W", "U"], palette, "linear");
    expect(result).toContain("linear-gradient");
  });

  it("different styles produce different outputs", () => {
    const combo: ColorKey[] = ["B", "R", "G"];
    const linear = bgForComboStyled(combo, palette, "linear");
    const radial = bgForComboStyled(combo, palette, "radial");
    const shards = bgForComboStyled(combo, palette, "diagonal-shards");
    expect(linear).not.toBe(radial);
    expect(linear).not.toBe(shards);
    expect(radial).not.toBe(shards);
  });

  it("same style with different palettes produces different outputs", () => {
    const combo: ColorKey[] = ["U", "R"];
    const def = bgForComboStyled(combo, palette, "linear");
    const flame = bgForComboStyled(combo, flamePalette, "linear");
    expect(def).not.toBe(flame);
  });
});

describe("THEME_DEFAULT_GRADIENT", () => {
  it("has a default for every theme", () => {
    const themes = ["default", "synth", "cyber", "flame", "chris", "phyrexia", "stained-glass", "dungeon", "neon-dynasty", "grixis"];
    for (const t of themes) {
      expect(THEME_DEFAULT_GRADIENT[t as keyof typeof THEME_DEFAULT_GRADIENT]).toBeTruthy();
    }
  });

  it("maps to valid style names", () => {
    const validNames = GRADIENT_STYLES.map((s) => s.name);
    for (const styleName of Object.values(THEME_DEFAULT_GRADIENT)) {
      expect(validNames).toContain(styleName);
    }
  });

  it("flame defaults to radial", () => {
    expect(THEME_DEFAULT_GRADIENT.flame).toBe("radial");
  });

  it("cyber defaults to hard-split", () => {
    expect(THEME_DEFAULT_GRADIENT.cyber).toBe("hard-split");
  });

  it("chris defaults to pixelated", () => {
    expect(THEME_DEFAULT_GRADIENT.chris).toBe("pixelated");
  });

  it("stained-glass defaults to stained-glass", () => {
    expect(THEME_DEFAULT_GRADIENT["stained-glass"]).toBe("stained-glass");
  });
});

describe("diagonal-bleed style", () => {
  it("produces a gradient with more stops than diagonal-shards", () => {
    const combo: ColorKey[] = ["B", "R", "G"];
    const shards = getGradientStyle("diagonal-shards").fn(combo, palette);
    const bleed = getGradientStyle("diagonal-bleed").fn(combo, palette);
    const shardsStops = shards.split(",").length;
    const bleedStops = bleed.split(",").length;
    expect(bleedStops).toBeGreaterThan(shardsStops);
  });
});

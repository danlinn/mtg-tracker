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
    expect(names).toContain("conic");
    expect(names).toContain("horizontal-bands");
    expect(names).toContain("vignette");
    expect(names).toContain("chevron");
    expect(names).toContain("pixelated");
    expect(names).toContain("mesh");
    expect(names).toContain("radial-shards");
  });

  it("each style returns a gradient string for multi-color combos", () => {
    const combo: ColorKey[] = ["W", "U", "B"];
    for (const style of GRADIENT_STYLES) {
      const result = style.fn(combo, palette);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
      // Multi-color should produce a gradient, not a bare hex
      expect(result).toMatch(/gradient|repeating|svg|url/i);
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
      const val = THEME_DEFAULT_GRADIENT[t as keyof typeof THEME_DEFAULT_GRADIENT];
      expect(typeof val).toBe("string");
      expect(val.length).toBeGreaterThan(0);
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

describe("maxColors constraint", () => {
  it("pixelated and chevron have maxColors: 2", () => {
    expect(getGradientStyle("pixelated").maxColors).toBe(2);
    expect(getGradientStyle("chevron").maxColors).toBe(2);
  });

  it("bgForComboStyled falls back to linear when combo exceeds maxColors", () => {
    const combo: ColorKey[] = ["B", "R", "G"];
    const result = bgForComboStyled(combo, palette, "pixelated");
    const linear = bgForComboStyled(combo, palette, "linear");
    expect(result).toBe(linear);
  });

  it("bgForComboStyled uses the style when combo fits maxColors", () => {
    const combo: ColorKey[] = ["B", "R"];
    const result = bgForComboStyled(combo, palette, "pixelated");
    expect(result).toContain("repeating-conic");
  });
});

describe("stained-glass style", () => {
  it("works with 2 colors", () => {
    const result = getGradientStyle("stained-glass").fn(["W", "U"], palette);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    // Should be an SVG-based background, not a bare hex
    expect(result).toContain("url(");
  });

  it("uses all 5 colors when available", () => {
    const combo: ColorKey[] = ["W", "U", "B", "R", "G"];
    const result = getGradientStyle("stained-glass").fn(combo, palette);
    for (const c of combo) {
      expect(result).toContain(palette[c].hex.replace("#", "%23"));
    }
  });
});

describe("negative cases", () => {
  it("getGradientStyle does not return undefined for any valid name", () => {
    const validNames: GradientStyleName[] = [
      "linear", "radial", "hard-split", "diagonal-shards", "conic",
      "horizontal-bands", "vignette", "chevron", "pixelated", "mesh",
      "radial-shards", "stained-glass",
    ];
    for (const name of validNames) {
      const style = getGradientStyle(name);
      expect(style).toBeDefined();
      expect(style.name).toBe(name);
    }
  });

  it("single-color combo never produces gradient keywords", () => {
    const singleCombos: ColorKey[][] = [["W"], ["U"], ["B"], ["R"], ["G"]];
    for (const combo of singleCombos) {
      for (const style of GRADIENT_STYLES) {
        const result = style.fn(combo, palette);
        // Single color should return a bare hex, not a gradient
        expect(result).toBe(palette[combo[0]].hex);
      }
    }
  });

  it("empty combo returns colorless for every style and palette", () => {
    for (const style of GRADIENT_STYLES) {
      expect(style.fn([], palette)).toBe(palette.C.hex);
      expect(style.fn([], flamePalette)).toBe(flamePalette.C.hex);
    }
  });

  it("bgForComboStyled with unknown style name falls back to linear, not undefined", () => {
    const result = bgForComboStyled(["W", "U"], palette, "bogus-style" as GradientStyleName);
    const linear = bgForComboStyled(["W", "U"], palette, "linear");
    expect(result).toBe(linear);
  });

  it("duplicate colors in combo do not cause crashes", () => {
    const combo: ColorKey[] = ["R", "R", "G"];
    for (const style of GRADIENT_STYLES) {
      const result = style.fn(combo, palette);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it("maxColors styles do not apply to combos exceeding their limit", () => {
    const threeColorCombo: ColorKey[] = ["W", "U", "B"];
    // pixelated and chevron have maxColors: 2
    const pixResult = bgForComboStyled(threeColorCombo, palette, "pixelated");
    const chevResult = bgForComboStyled(threeColorCombo, palette, "chevron");
    const linearResult = bgForComboStyled(threeColorCombo, palette, "linear");
    // Should have fallen back to linear
    expect(pixResult).toBe(linearResult);
    expect(chevResult).toBe(linearResult);
  });
});

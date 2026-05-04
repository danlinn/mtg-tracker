import { describe, it, expect } from "@jest/globals";
import { getTextureBackground, THEME_DEFAULT_TEXTURE, type TextureName } from "@/lib/textures";

describe("getTextureBackground", () => {
  it("returns empty string for 'none'", () => {
    expect(getTextureBackground("none")).toBe("");
  });

  it("returns a data URI for 'grit'", () => {
    const result = getTextureBackground("grit");
    expect(result).toContain("url(");
    expect(result).toContain("data:image/svg+xml");
    expect(result).toContain("feTurbulence");
  });

  it("returns a data URI for each texture type", () => {
    const names: TextureName[] = [
      "grit", "hex-grid", "circuit", "scales", "crosshatch",
      "dots", "diamonds", "waves", "stone", "diagonal-streak", "shimmer", "pixelated",
      "topographic", "maze", "woven", "matrix-rain", "flames",
    ];
    for (const name of names) {
      const result = getTextureBackground(name);
      expect(result).toContain("url(");
    }
  });

  it("respects custom opacity", () => {
    const low = getTextureBackground("grit", 0.05);
    const high = getTextureBackground("grit", 0.3);
    expect(low).toContain("0.05");
    expect(high).toContain("0.3");
  });
});

describe("THEME_DEFAULT_TEXTURE", () => {
  it("phyrexia defaults to grit", () => {
    expect(THEME_DEFAULT_TEXTURE.phyrexia).toBe("grit");
  });

  it("grixis defaults to grit", () => {
    expect(THEME_DEFAULT_TEXTURE.grixis).toBe("grit");
  });

  it("default theme has no texture", () => {
    expect(THEME_DEFAULT_TEXTURE.default).toBe("none");
  });

  it("every theme has a default texture that is a valid TextureName", () => {
    const themes = Object.keys(THEME_DEFAULT_TEXTURE);
    expect(themes.length).toBeGreaterThanOrEqual(10);
    const validNames: TextureName[] = [
      "none", "grit", "hex-grid", "circuit", "scales", "crosshatch",
      "dots", "diamonds", "waves", "stone", "diagonal-streak", "shimmer", "pixelated",
      "topographic", "maze", "woven", "matrix-rain", "flames",
    ];
    for (const t of themes) {
      const val = THEME_DEFAULT_TEXTURE[t as keyof typeof THEME_DEFAULT_TEXTURE];
      expect(typeof val).toBe("string");
      expect(validNames).toContain(val);
    }
  });
});

describe("negative / edge cases", () => {
  it("getTextureBackground returns empty string only for 'none'", () => {
    const textured: TextureName[] = [
      "grit", "hex-grid", "circuit", "scales", "crosshatch",
      "dots", "diamonds", "waves", "stone", "diagonal-streak", "shimmer", "pixelated",
      "topographic", "maze", "woven", "matrix-rain", "flames",
    ];
    expect(getTextureBackground("none")).toBe("");
    for (const name of textured) {
      const result = getTextureBackground(name);
      expect(result).not.toBe("");
      expect(result.length).toBeGreaterThan(10);
    }
  });

  it("zero opacity still returns a valid SVG data URI", () => {
    const result = getTextureBackground("grit", 0);
    expect(result).toContain("url(");
    expect(result).toContain("data:image/svg+xml");
  });

  it("very high opacity does not break texture generation", () => {
    const result = getTextureBackground("grit", 1);
    expect(result).toContain("url(");
    expect(result).toContain("data:image/svg+xml");
  });

  it("different textures produce different output", () => {
    const grit = getTextureBackground("grit");
    const hex = getTextureBackground("hex-grid");
    const dots = getTextureBackground("dots");
    expect(grit).not.toBe(hex);
    expect(grit).not.toBe(dots);
    expect(hex).not.toBe(dots);
  });

  it("different opacities produce different output for same texture", () => {
    const low = getTextureBackground("circuit", 0.05);
    const mid = getTextureBackground("circuit", 0.5);
    const high = getTextureBackground("circuit", 0.9);
    expect(low).not.toBe(mid);
    expect(mid).not.toBe(high);
  });
});

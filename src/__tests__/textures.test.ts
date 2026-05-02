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

  it("every theme has a default texture", () => {
    const themes = Object.keys(THEME_DEFAULT_TEXTURE);
    expect(themes.length).toBeGreaterThanOrEqual(10);
    for (const t of themes) {
      expect(THEME_DEFAULT_TEXTURE[t as keyof typeof THEME_DEFAULT_TEXTURE]).toBeTruthy();
    }
  });
});

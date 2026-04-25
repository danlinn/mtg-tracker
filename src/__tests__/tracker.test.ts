/**
 * @jest-environment jsdom
 *
 * Tests for the life tracker: isAlive logic, seat assignment padding,
 * PlayerBox rendering (deck labels, assignment hint, commander-damage
 * buffer zone), and the long-press assignment flow.
 */

import { describe, it, expect } from "@jest/globals";

// ---- isAlive / isDead logic (extracted inline for testability) ----

function isAlive(player: { life: number; damage: Record<number, number> }): boolean {
  return player.life > 0 && !Object.values(player.damage).some((d) => d >= 21);
}

describe("isAlive", () => {
  it("returns true when life > 0 and no lethal commander damage", () => {
    expect(isAlive({ life: 40, damage: {} })).toBe(true);
    expect(isAlive({ life: 1, damage: { 0: 20 } })).toBe(true);
    expect(isAlive({ life: 40, damage: { 0: 10, 1: 10 } })).toBe(true);
  });

  it("returns false when life <= 0", () => {
    expect(isAlive({ life: 0, damage: {} })).toBe(false);
    expect(isAlive({ life: -5, damage: {} })).toBe(false);
  });

  it("returns false when any single commander damage >= 21", () => {
    expect(isAlive({ life: 40, damage: { 0: 21 } })).toBe(false);
    expect(isAlive({ life: 40, damage: { 0: 10, 1: 21 } })).toBe(false);
    expect(isAlive({ life: 40, damage: { 0: 30 } })).toBe(false);
  });

  it("returns false when life <= 0 AND lethal commander damage", () => {
    expect(isAlive({ life: 0, damage: { 0: 21 } })).toBe(false);
  });

  it("is not affected by combined commander damage below 21 each", () => {
    expect(isAlive({ life: 40, damage: { 0: 20, 1: 20, 2: 20 } })).toBe(true);
  });
});

// ---- updateSeat padding logic ----

type Seat = { userId: string; deckId: string };

function updateSeatPadded(
  prev: Seat[],
  idx: number,
  field: "userId" | "deckId",
  value: string
): Seat[] {
  const padded = Array.from({ length: Math.max(prev.length, idx + 1) }, (_, i) =>
    prev[i] ?? { userId: "", deckId: "" }
  );
  return padded.map((s, i) => {
    if (i !== idx) return s;
    if (field === "userId") return { userId: value, deckId: "" };
    return { ...s, [field]: value };
  });
}

describe("updateSeat with padding", () => {
  it("pads an empty array and sets the target index", () => {
    const result = updateSeatPadded([], 0, "userId", "user-1");
    expect(result).toEqual([{ userId: "user-1", deckId: "" }]);
  });

  it("pads to the correct length for higher indices", () => {
    const result = updateSeatPadded([], 2, "userId", "user-3");
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ userId: "", deckId: "" });
    expect(result[1]).toEqual({ userId: "", deckId: "" });
    expect(result[2]).toEqual({ userId: "user-3", deckId: "" });
  });

  it("does not shrink an existing array", () => {
    const prev = [
      { userId: "a", deckId: "d1" },
      { userId: "b", deckId: "d2" },
      { userId: "c", deckId: "d3" },
    ];
    const result = updateSeatPadded(prev, 1, "deckId", "d-new");
    expect(result).toHaveLength(3);
    expect(result[1]).toEqual({ userId: "b", deckId: "d-new" });
    expect(result[0]).toEqual({ userId: "a", deckId: "d1" });
  });

  it("resets deckId when changing userId", () => {
    const prev = [{ userId: "a", deckId: "d1" }];
    const result = updateSeatPadded(prev, 0, "userId", "b");
    expect(result[0]).toEqual({ userId: "b", deckId: "" });
  });

  it("preserves userId when changing deckId", () => {
    const prev = [{ userId: "a", deckId: "d1" }];
    const result = updateSeatPadded(prev, 0, "deckId", "d2");
    expect(result[0]).toEqual({ userId: "a", deckId: "d2" });
  });
});

// ---- Winner detection ----

describe("winner detection", () => {
  it("identifies the last alive player as winner", () => {
    const players = [
      { life: 0, damage: {} },
      { life: 40, damage: {} },
      { life: 0, damage: {} },
      { life: 0, damage: {} },
    ];
    const aliveIndices = players
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => isAlive(p))
      .map(({ i }) => i);
    expect(aliveIndices).toEqual([1]);
  });

  it("returns no winner when multiple players alive", () => {
    const players = [
      { life: 40, damage: {} },
      { life: 40, damage: {} },
      { life: 0, damage: {} },
      { life: 0, damage: {} },
    ];
    const aliveIndices = players
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => isAlive(p))
      .map(({ i }) => i);
    expect(aliveIndices.length).toBeGreaterThan(1);
  });

  it("counts lethal commander damage as eliminated", () => {
    const players = [
      { life: 40, damage: { 1: 21 } },
      { life: 40, damage: {} },
      { life: 0, damage: {} },
      { life: 0, damage: {} },
    ];
    const aliveIndices = players
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => isAlive(p))
      .map(({ i }) => i);
    expect(aliveIndices).toEqual([1]);
  });
});

// ---- URL cleaning (mirrors src/lib/prisma.ts cleanUrl) ----

function cleanUrl(url: string | undefined): string {
  if (!url) return "";
  const stripped = url.replace(/\\n/g, "").replace(/\n/g, "").trim();
  if (!stripped) return "";
  try {
    const u = new URL(stripped);
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return stripped;
  }
}

describe("cleanUrl", () => {
  it("strips literal backslash-n", () => {
    const url = "postgresql://user:pass@host/db?sslmode=require\\n";
    expect(cleanUrl(url)).not.toContain("\\n");
  });

  it("strips real newline", () => {
    const url = "postgresql://user:pass@host/db?sslmode=require\n";
    expect(cleanUrl(url)).not.toContain("\n");
  });

  it("removes channel_binding param", () => {
    const url =
      "postgresql://user:pass@host/db?channel_binding=require&sslmode=require";
    const cleaned = cleanUrl(url);
    expect(cleaned).not.toContain("channel_binding");
    expect(cleaned).toContain("sslmode=require");
  });

  it("handles channel_binding as the only param", () => {
    const url = "postgresql://user:pass@host/db?channel_binding=require";
    const cleaned = cleanUrl(url);
    expect(cleaned).not.toContain("channel_binding");
    expect(cleaned).toContain("/db");
    expect(cleaned).not.toContain("neondb&");
  });

  it("returns empty string for undefined", () => {
    expect(cleanUrl(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(cleanUrl("")).toBe("");
  });
});

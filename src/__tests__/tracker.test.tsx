/**
 * @jest-environment jsdom
 *
 * Tracker setup + gameplay regression tests. Covers:
 *  - Setup screen renders, player count/life selectors work
 *  - Seat assignment (player + deck select) populates correctly
 *  - Start Game transitions to the gameplay layout
 *  - Life tap zones work (increment/decrement)
 *  - Reset and New Game require confirmation
 *  - Player/deck names display during gameplay
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import React from "react";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock theme
jest.mock("@/lib/theme", () => {
  const actual = jest.requireActual("@/lib/theme") as Record<string, unknown>;
  const { DEFAULT_PALETTE } = jest.requireActual("@/lib/themePalettes") as { DEFAULT_PALETTE: unknown };
  return {
    ...actual,
    useThemePalette: () => DEFAULT_PALETTE,
    useTheme: () => ({ theme: "default", setTheme: jest.fn() }),
  };
});

// Mock fetch for /api/users
const MOCK_USERS = [
  {
    id: "user-1",
    name: "Alice",
    decks: [
      { id: "deck-1", name: "Urza", commander: "Urza, Lord High Artificer" },
      { id: "deck-2", name: "Krenko", commander: "Krenko, Mob Boss" },
    ],
  },
  {
    id: "user-2",
    name: "Bob",
    decks: [
      { id: "deck-3", name: "Meren", commander: "Meren of Clan Nel Toth" },
    ],
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  localStorage.clear();

  global.fetch = jest.fn((url: unknown) => {
    if (String(url).includes("/api/users")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(MOCK_USERS),
      });
    }
    if (String(url).includes("/api/playgroups/active")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ playgroupId: null }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  }) as unknown as typeof fetch;

  // confirm() always returns true in tests unless we override
  global.confirm = jest.fn(() => true) as unknown as typeof confirm;
});

// Dynamic import so mocks are in place before the module loads
async function renderTracker() {
  const mod = await import("@/app/(app)/tracker/page");
  const TrackerPage = mod.default;
  return render(<TrackerPage />);
}

describe("Tracker setup screen", () => {
  it("renders setup with player count and life selectors", async () => {
    await act(async () => { await renderTracker(); });

    expect(screen.getByText("Life Tracker")).toBeTruthy();
    // Default is 4 players
    expect(screen.getByText("Start Game")).toBeTruthy();
    // Player count buttons
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("4")).toBeTruthy();
    // Life buttons
    expect(screen.getByText("20")).toBeTruthy();
    expect(screen.getByText("30")).toBeTruthy();
    expect(screen.getByText("40")).toBeTruthy();
  });

  it("loads users from API and shows seat selects", async () => {
    await act(async () => { await renderTracker(); });

    // Wait for the /api/users fetch
    await waitFor(() => {
      const selects = screen.getAllByRole("combobox");
      // 4 seats × 1 player select each (deck select hidden until player chosen)
      expect(selects.length).toBeGreaterThanOrEqual(4);
    });

    // Each seat should show "Select player..." as default
    const options = screen.getAllByText("Select player...");
    expect(options.length).toBe(4);
  });

  it("seat assignment works — selecting a player reveals deck select", async () => {
    await act(async () => { await renderTracker(); });

    await waitFor(() => {
      expect(screen.getAllByText("Select player...").length).toBe(4);
    });

    // Select Alice in seat 1
    const selects = screen.getAllByRole("combobox");
    await act(async () => {
      fireEvent.change(selects[0], { target: { value: "user-1" } });
    });

    // Deck select should now appear for seat 1
    await waitFor(() => {
      expect(screen.getByText("Select deck...")).toBeTruthy();
    });

    // Alice's decks should be listed
    expect(screen.getByText("Urza (Urza, Lord High Artificer)")).toBeTruthy();
    expect(screen.getByText("Krenko (Krenko, Mob Boss)")).toBeTruthy();
  });

  it("clicking Start Game transitions to gameplay", async () => {
    await act(async () => { await renderTracker(); });

    await act(async () => {
      fireEvent.click(screen.getByText("Start Game"));
    });

    // Setup screen should be gone
    expect(screen.queryByText("Life Tracker")).toBeNull();
    // Life totals should appear (default 40 for 4 players)
    const lifeTotals = screen.getAllByText("40");
    expect(lifeTotals.length).toBe(4);
  });
});

describe("Tracker gameplay", () => {
  async function startGame() {
    await act(async () => { await renderTracker(); });
    await act(async () => {
      fireEvent.click(screen.getByText("Start Game"));
    });
  }

  it("life tap zones increment and decrement", async () => {
    await startGame();

    // Find +1 and -1 buttons for player 1
    const plus = screen.getByLabelText("Player 1 +1 life");
    const minus = screen.getByLabelText("Player 1 -1 life");

    await act(async () => { fireEvent.click(plus); });
    expect(screen.getAllByText("41").length).toBeGreaterThanOrEqual(1);

    await act(async () => { fireEvent.click(minus); });
    await act(async () => { fireEvent.click(minus); });
    expect(screen.getAllByText("39").length).toBeGreaterThanOrEqual(1);
  });

  it("Reset requires confirmation and resets life totals", async () => {
    await startGame();

    // Decrease player 1 life
    const minus = screen.getByLabelText("Player 1 -1 life");
    await act(async () => { fireEvent.click(minus); });

    // Click Reset
    const resetBtn = screen.getByLabelText("Reset game");
    await act(async () => { fireEvent.click(resetBtn); });

    expect(global.confirm).toHaveBeenCalled();
    // All players back to 40
    const lifeTotals = screen.getAllByText("40");
    expect(lifeTotals.length).toBe(4);
  });

  it("New Game requires confirmation and returns to setup", async () => {
    await startGame();

    const newGameBtn = screen.getByLabelText("New game");
    await act(async () => { fireEvent.click(newGameBtn); });

    expect(global.confirm).toHaveBeenCalled();
    // Back to setup
    expect(screen.getByText("Life Tracker")).toBeTruthy();
  });

  it("displays player and deck names when assigned", async () => {
    await act(async () => { await renderTracker(); });

    // Wait for users to load
    await waitFor(() => {
      expect(screen.getAllByText("Select player...").length).toBe(4);
    });

    // Assign Alice + Urza to seat 1
    const selects = screen.getAllByRole("combobox");
    await act(async () => {
      fireEvent.change(selects[0], { target: { value: "user-1" } });
    });

    await waitFor(() => {
      expect(screen.getByText("Select deck...")).toBeTruthy();
    });

    // Find the deck select (should be the last combobox now)
    const updatedSelects = screen.getAllByRole("combobox");
    const deckSelect = updatedSelects[1]; // deck select for seat 1
    await act(async () => {
      fireEvent.change(deckSelect, { target: { value: "deck-1" } });
    });

    // Start game
    await act(async () => {
      fireEvent.click(screen.getByText("Start Game"));
    });

    // Alice — Urza should be visible somewhere
    await waitFor(() => {
      const label = screen.getByText(/Alice/);
      expect(label).toBeTruthy();
      expect(label.textContent).toContain("Urza");
    });
  });

  it("each player box has a color wheel button", async () => {
    await startGame();
    const colorButtons = screen.getAllByLabelText("Change background color");
    expect(colorButtons.length).toBe(4);
  });

  it("color wheels are positioned at screen edges (never shared borders)", async () => {
    await startGame();
    const colorButtons = screen.getAllByLabelText("Change background color");
    // 4-player layout: corners should be br, bl, bl, br (screen edges)
    // In code, rotated top boxes use bottom-* which renders at top after rotation
    for (const btn of colorButtons) {
      const cls = btn.className;
      // Each button should have a bottom-24 class (near screen edge, above commander damage)
      // not top-2 right-2 (which would put it at shared borders)
      expect(cls).toMatch(/bottom-24/);
    }
  });

  it("seat order slots have data-seat attributes for drag targeting", async () => {
    await startGame();
    const { container } = render(<div />); // just to get document
    const seats = document.querySelectorAll("[data-seat]");
    expect(seats.length).toBe(4);
    const seatValues = Array.from(seats).map((s) => s.getAttribute("data-seat"));
    expect(seatValues).toEqual(["0", "1", "2", "3"]);
  });

  it("source code has coordinate-based drag detection (no elementFromPoint)", async () => {
    // Regression: elementFromPoint was unreliable for drag targets due to
    // z-index layers. The coordinate-based slotFromPoint approach should
    // be used instead.
    const fs = await import("fs");
    const path = await import("path");
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/app/(app)/tracker/page.tsx"),
      "utf8"
    );
    expect(src).toMatch(/slotFromPoint/);
    expect(src).not.toMatch(/elementFromPoint/);
  });
});

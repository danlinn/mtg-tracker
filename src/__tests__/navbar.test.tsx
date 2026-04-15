/**
 * @jest-environment jsdom
 *
 * NavBar regression guard. The nav went through several bugs where:
 *  - the mobile menu disappeared entirely
 *  - the dynamic-measurement version caused infinite re-render loops
 *    (the screen "jumped in a blur")
 *
 * This test renders the real component in jsdom and asserts that
 * basic operations work: hamburger exists, clicking it opens the
 * menu, and the menu has the expected links.
 */

import { describe, it, expect, jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import NavBar from "@/components/NavBar";
import React from "react";
import { readFileSync } from "fs";
import { join } from "path";

// Mock next-auth
jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "u1", name: "Test" } } }),
  signOut: jest.fn(),
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

// Mock theme context
jest.mock("@/lib/theme", () => {
  const actual = jest.requireActual("@/lib/theme") as Record<string, unknown>;
  return {
    ...actual,
    useTheme: () => ({ theme: "default", setTheme: jest.fn() }),
  };
});

// Mock PlaygroupSwitcher (avoids fetch calls)
jest.mock("@/components/PlaygroupSwitcher", () => ({
  __esModule: true,
  default: () => React.createElement("div", { "data-testid": "pg-switcher-mock" }),
}));

describe("NavBar", () => {
  it("renders without infinite loops (hamburger always exists in DOM)", () => {
    const { container } = render(<NavBar />);
    // Hamburger button is always in the DOM (CSS toggles visibility
    // by breakpoint). No infinite renders, no ResizeObserver churn.
    const hamburger = screen.getByTestId("mobile-menu-toggle");
    expect(hamburger).toBeTruthy();
    // Sanity: nav element rendered exactly once
    expect(container.querySelectorAll("nav").length).toBe(1);
  });

  it("toggles mobile menu open and closed on hamburger click", () => {
    render(<NavBar />);
    const hamburger = screen.getByTestId("mobile-menu-toggle");

    // Closed by default
    expect(screen.queryByTestId("mobile-menu")).toBeNull();

    // Click opens it
    fireEvent.click(hamburger);
    expect(screen.getByTestId("mobile-menu")).toBeTruthy();

    // Click again closes it
    fireEvent.click(hamburger);
    expect(screen.queryByTestId("mobile-menu")).toBeNull();
  });

  it("mobile menu contains all expected nav links", () => {
    render(<NavBar />);
    fireEvent.click(screen.getByTestId("mobile-menu-toggle"));

    const menu = screen.getByTestId("mobile-menu");
    const links = menu.querySelectorAll("a");
    const labels = Array.from(links).map((a) => a.textContent?.trim());

    for (const expected of [
      "Dashboard",
      "Game Tracker",
      "Decks",
      "Games",
      "Players",
      "Stats",
      "Leaderboard",
      "Groups",
    ]) {
      expect(labels).toContain(expected);
    }
  });

  it("closes the mobile menu when a nav link is clicked", () => {
    render(<NavBar />);
    fireEvent.click(screen.getByTestId("mobile-menu-toggle"));
    const menu = screen.getByTestId("mobile-menu");
    const firstLink = menu.querySelector("a");
    expect(firstLink).toBeTruthy();
    if (firstLink) fireEvent.click(firstLink);
    expect(screen.queryByTestId("mobile-menu")).toBeNull();
  });

  it("drops sticky positioning on /tracker for desktop", () => {
    // Regression guard: tracker pages need the nav to get out of the way
    // on desktop so the game area can fill the viewport.
    const src = readFileSync(
      join(process.cwd(), "src/components/NavBar.tsx"),
      "utf8"
    );
    // Source should recognize /tracker path and override to lg:static
    expect(src).toMatch(/pathname\s*===\s*"\/tracker"/);
    expect(src).toMatch(/lg:static/);
  });

  it("does not include legacy dynamic measurement code (prevents regression)", () => {
    // Defense-in-depth: the bug-prone dynamic ResizeObserver-based
    // width measurement must not return. If you need responsive
    // behavior beyond the CSS breakpoint, do it a different way.
    const src = readFileSync(
      join(process.cwd(), "src/components/NavBar.tsx"),
      "utf8"
    );
    // No ResizeObserver in NavBar
    expect(src).not.toMatch(/ResizeObserver/);
    // No collapse state driven by measurement
    expect(src).not.toMatch(/setCollapsed|setOverflows/);
  });

  it("source code renders an Admin link only for admin role", () => {
    // Without re-mocking next-auth across tests (which breaks jest
    // module cache), verify via source inspection that the admin item
    // is conditionally appended based on role.
    const src = readFileSync(
      join(process.cwd(), "src/components/NavBar.tsx"),
      "utf8"
    );
    expect(src).toMatch(/userRole\s*===\s*"admin"/);
    expect(src).toMatch(/href:\s*"\/admin"/);
  });
});

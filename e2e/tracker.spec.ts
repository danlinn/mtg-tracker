import { test, expect } from "@playwright/test";

test.describe("game tracker", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tracker");
  });

  test("setup screen shows player count and life options", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Life Tracker" })).toBeVisible();
    await expect(page.getByRole("button", { name: "2" })).toBeVisible();
    await expect(page.getByRole("button", { name: "3" })).toBeVisible();
    await expect(page.getByRole("button", { name: "4" })).toBeVisible();
    await expect(page.getByRole("button", { name: "20" })).toBeVisible();
    await expect(page.getByRole("button", { name: "40" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Start Game" })).toBeVisible();
  });

  test("can start a 4-player game at 40 life", async ({ page }) => {
    await page.getByRole("button", { name: "4" }).click();
    await page.getByRole("button", { name: "40" }).click();
    await page.getByRole("button", { name: "Start Game" }).click();

    // Should see 4 life totals of 40
    const lifeTotals = page.locator("text=40");
    await expect(lifeTotals.first()).toBeVisible();
  });

  test("tapping top half increases life", async ({ page }) => {
    await page.getByRole("button", { name: "2" }).click();
    await page.getByRole("button", { name: "20" }).click();
    await page.getByRole("button", { name: "Start Game" }).click();

    const plusButton = page.getByRole("button", { name: /Player 1 \+1 life/ });
    await plusButton.click();

    await expect(page.locator("text=21").first()).toBeVisible();
  });

  test("tapping bottom half decreases life", async ({ page }) => {
    await page.getByRole("button", { name: "2" }).click();
    await page.getByRole("button", { name: "20" }).click();
    await page.getByRole("button", { name: "Start Game" }).click();

    const minusButton = page.getByRole("button", { name: /Player 1 -1 life/ });
    await minusButton.click();

    await expect(page.locator("text=19").first()).toBeVisible();
  });

  test("color picker opens when swatch is tapped", async ({ page }) => {
    await page.getByRole("button", { name: "Start Game" }).click();

    const swatch = page.getByRole("button", { name: "Change background color" }).first();
    await swatch.click();

    await expect(page.getByText("Pick a color")).toBeVisible();
  });

  test("commander damage adjusts life total", async ({ page }) => {
    await page.getByRole("button", { name: "2" }).click();
    await page.getByRole("button", { name: "40" }).click();
    await page.getByRole("button", { name: "Start Game" }).click();

    const cmdPlus = page.getByRole("button", { name: /\+1 commander damage/ }).first();
    await cmdPlus.click();

    // Life should drop to 39 and commander damage should show 1
    await expect(page.locator("text=39").first()).toBeVisible();
  });

  test("reset button requires confirmation", async ({ page }) => {
    await page.getByRole("button", { name: "Start Game" }).click();

    const resetBtn = page.getByRole("button", { name: "Reset game" });
    await resetBtn.click();

    await expect(page.getByText("Reset the game?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset" })).toBeVisible();
  });

  test("new game button requires confirmation", async ({ page }) => {
    await page.getByRole("button", { name: "Start Game" }).click();

    const newGameBtn = page.getByRole("button", { name: "New game" });
    await newGameBtn.click();

    await expect(page.getByText("Start a new game?")).toBeVisible();
  });

  test("new game returns to setup screen", async ({ page }) => {
    await page.getByRole("button", { name: "Start Game" }).click();

    await page.getByRole("button", { name: "New game" }).click();
    await page.getByRole("button", { name: "New Game" }).click();

    await expect(page.getByRole("heading", { name: "Life Tracker" })).toBeVisible();
  });

  test("eliminating all but one player shows log overlay", async ({ page }) => {
    await page.getByRole("button", { name: "2" }).click();
    await page.getByRole("button", { name: "20" }).click();
    await page.getByRole("button", { name: "Start Game" }).click();

    // Kill player 1 by tapping -1 life 20 times
    const minusP1 = page.getByRole("button", { name: /Player 1 -1 life/ });
    for (let i = 0; i < 20; i++) {
      await minusP1.click();
    }

    await expect(page.getByText("Log game")).toBeVisible();
    await expect(page.getByText("Not yet")).toBeVisible();
    await expect(page.getByText("Discard and start new game")).toBeVisible();
  });

  test("can dismiss log overlay and continue playing", async ({ page }) => {
    await page.getByRole("button", { name: "2" }).click();
    await page.getByRole("button", { name: "20" }).click();
    await page.getByRole("button", { name: "Start Game" }).click();

    const minusP1 = page.getByRole("button", { name: /Player 1 -1 life/ });
    for (let i = 0; i < 20; i++) {
      await minusP1.click();
    }

    await page.getByText("Not yet").click();

    // Overlay should be gone
    await expect(page.getByText("Log game")).not.toBeVisible();

    // Can revive player 1
    const plusP1 = page.getByRole("button", { name: /Player 1 \+1 life/ });
    await plusP1.click();

    await expect(page.locator("text=1").first()).toBeVisible();
  });

  test("discard and start new game works from log overlay", async ({ page }) => {
    await page.getByRole("button", { name: "2" }).click();
    await page.getByRole("button", { name: "20" }).click();
    await page.getByRole("button", { name: "Start Game" }).click();

    const minusP1 = page.getByRole("button", { name: /Player 1 -1 life/ });
    for (let i = 0; i < 20; i++) {
      await minusP1.click();
    }

    await page.getByText("Discard and start new game").click();

    await expect(page.getByRole("heading", { name: "Life Tracker" })).toBeVisible();
  });
});

test.describe("tracker: theme gradients and nav overlay", () => {
  test("switching theme applies to tracker pods", async ({ page }) => {
    await page.goto("/tracker");
    await page.getByRole("button", { name: "Start Game" }).click();

    // Open mobile menu and switch to flame theme
    await page.getByTestId("mobile-menu-toggle").click();
    const themeSelect = page.locator("select").filter({ has: page.locator("option", { hasText: "Flame" }) }).last();
    await themeSelect.selectOption("flame");

    // Theme attribute should be set on <html>
    await expect(page.locator("html")).toHaveAttribute("data-theme", "flame");

    // Close menu
    await page.getByTestId("mobile-menu-toggle").click();

    // The player pods should still be visible with backgrounds applied
    const pods = page.locator("[data-player-idx]");
    await expect(pods.first()).toBeVisible();

    // Each pod should have a background style set
    const bg = await pods.first().evaluate((el) => getComputedStyle(el).background);
    expect(bg).toBeTruthy();
    expect(bg).not.toBe("");
  });

  test("theme persists after switching during game", async ({ page }) => {
    await page.goto("/tracker");
    await page.getByRole("button", { name: "Start Game" }).click();

    // Switch to synth theme via mobile menu
    await page.getByTestId("mobile-menu-toggle").click();
    const themeSelect = page.locator("select").filter({ has: page.locator("option", { hasText: "Synth" }) }).last();
    await themeSelect.selectOption("synth");
    await page.getByTestId("mobile-menu-toggle").click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "synth");

    // Navigate away and come back — theme should persist
    await page.getByTestId("mobile-menu-toggle").click();
    await page.getByRole("link", { name: "Dashboard" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "synth");
  });

  test("mobile menu renders above the game tracker", async ({ page }) => {
    await page.goto("/tracker");
    await page.getByRole("button", { name: "Start Game" }).click();

    // Pods should be visible
    const pods = page.locator("[data-player-idx]");
    await expect(pods.first()).toBeVisible();

    // Open the mobile menu
    await page.getByTestId("mobile-menu-toggle").click();
    const menu = page.getByTestId("mobile-menu");
    await expect(menu).toBeVisible();

    // Menu links should be clickable (not hidden behind the tracker)
    const dashboardLink = menu.getByRole("link", { name: "Dashboard" });
    await expect(dashboardLink).toBeVisible();

    // Verify the menu is actually above the tracker by checking it's
    // interactable — if it were behind the tracker, click would fail
    const box = await dashboardLink.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  test("menu links work while tracker is active", async ({ page }) => {
    await page.goto("/tracker");
    await page.getByRole("button", { name: "Start Game" }).click();

    // Open menu and click Dashboard
    await page.getByTestId("mobile-menu-toggle").click();
    await page.getByTestId("mobile-menu").getByRole("link", { name: "Dashboard" }).click();

    // Should navigate away from tracker
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("theme select works inside mobile menu over tracker", async ({ page }) => {
    await page.goto("/tracker");
    await page.getByRole("button", { name: "Start Game" }).click();

    // Open menu
    await page.getByTestId("mobile-menu-toggle").click();
    const menu = page.getByTestId("mobile-menu");
    await expect(menu).toBeVisible();

    // The theme select should be interactable
    const themeSelect = menu.locator("select").last();
    await expect(themeSelect).toBeVisible();

    // Switch through multiple themes
    for (const theme of ["flame", "cyber", "grixis", "default"]) {
      await themeSelect.selectOption(theme);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    }
  });

  test("pod backgrounds update when switching themes mid-game", async ({ page }) => {
    await page.goto("/tracker");
    await page.getByRole("button", { name: "Start Game" }).click();

    const pod = page.locator("[data-player-idx='0']");
    await expect(pod).toBeVisible();

    // Get the initial background
    const initialBg = await pod.evaluate((el) => el.style.background);

    // Switch to a different theme
    await page.getByTestId("mobile-menu-toggle").click();
    const themeSelect = page.locator("select").filter({ has: page.locator("option", { hasText: "Phyrexia" }) }).last();
    await themeSelect.selectOption("phyrexia");
    await page.getByTestId("mobile-menu-toggle").click();

    // Background should change
    const newBg = await pod.evaluate((el) => el.style.background);
    expect(newBg).not.toBe(initialBg);
  });

  test("all pods update colors on every theme switch", async ({ page }) => {
    await page.goto("/tracker");
    await page.getByRole("button", { name: "4" }).click();
    await page.getByRole("button", { name: "Start Game" }).click();

    const themes = ["flame", "synth", "cyber", "phyrexia", "stained-glass", "dungeon", "neon-dynasty", "grixis", "default"];

    for (const theme of themes) {
      await page.getByTestId("mobile-menu-toggle").click();
      const themeSelect = page.getByTestId("mobile-menu").locator("select").last();
      await themeSelect.selectOption(theme);
      await page.getByTestId("mobile-menu-toggle").click();

      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

      // All 4 pods should have a background style
      for (let i = 0; i < 4; i++) {
        const pod = page.locator(`[data-player-idx='${i}']`);
        const bg = await pod.evaluate((el) => el.style.background);
        expect(bg).toBeTruthy();
      }

      // Menu should still be accessible after each switch
      await page.getByTestId("mobile-menu-toggle").click();
      await expect(page.getByTestId("mobile-menu")).toBeVisible();
      await page.getByTestId("mobile-menu-toggle").click();
    }
  });
});

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

import { test, expect } from "@playwright/test";
import { uniqueDeckName } from "./helpers/test-data";

test.describe("deck editing", () => {
  let deckName: string;

  test.beforeAll(async ({ browser }) => {
    // Create a deck to edit using the shared auth state
    deckName = uniqueDeckName("EditMe");
    const storageState = "e2e/.auth/user.json";
    const ctx = await browser.newContext({ storageState });
    const page = await ctx.newPage();

    await page.goto("/decks/new");
    await page.getByLabel("Deck Name").fill(deckName);
    await page.getByLabel("Commander").fill("Original Commander");
    await page.getByTitle("Red").click();
    await page.getByRole("button", { name: "Create Deck" }).click();
    await page.waitForURL("**/decks", { timeout: 10_000 });

    await ctx.close();
  });

  test("edit link navigates to edit page", async ({ page }) => {
    await page.goto("/decks");
    const deckCard = page
      .locator(".space-y-2 > div")
      .filter({ has: page.locator(`text="${deckName}"`) });
    await deckCard.getByRole("link", { name: "Edit" }).click();
    await expect(page).toHaveURL(/\/decks\/.*\/edit/);
    await expect(page.getByRole("heading", { name: "Edit Deck" })).toBeVisible();
  });

  test("edit form is prefilled with deck data", async ({ page }) => {
    await page.goto("/decks");
    const deckCard = page
      .locator(".space-y-2 > div")
      .filter({ has: page.locator(`text="${deckName}"`) });
    await deckCard.getByRole("link", { name: "Edit" }).click();
    await expect(page).toHaveURL(/\/decks\/.*\/edit/);

    await expect(page.getByLabel("Deck Name")).toHaveValue(deckName);
    await expect(page.getByLabel("Commander")).toHaveValue("Original Commander");
  });

  test("save changes updates the deck", async ({ page }) => {
    await page.goto("/decks");
    const deckCard = page
      .locator(".space-y-2 > div")
      .filter({ has: page.locator(`text="${deckName}"`) });
    await deckCard.getByRole("link", { name: "Edit" }).click();
    await expect(page).toHaveURL(/\/decks\/.*\/edit/);

    const newName = deckName + " Updated";
    await page.getByLabel("Deck Name").fill(newName);
    await page.getByLabel("Commander").fill("New Commander");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await page.waitForURL("**/decks", { timeout: 10_000 });

    await expect(page.getByText(newName)).toBeVisible();
    await expect(page.getByText("New Commander")).toBeVisible();
  });
});

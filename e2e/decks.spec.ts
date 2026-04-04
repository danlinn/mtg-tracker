import { test, expect } from "@playwright/test";
import { uniqueDeckName } from "./helpers/test-data";

test.describe("deck management", () => {
  test("create a deck with color identity", async ({ page }) => {
    const deckName = uniqueDeckName("Goblins");
    const commander = "Krenko, Mob Boss";

    await page.goto("/decks/new");
    await page.getByLabel("Deck Name").fill(deckName);
    await page.getByLabel("Commander").fill(commander);

    // Select Red color
    await page.getByTitle("Red").click();

    await page.getByRole("button", { name: "Create Deck" }).click();
    await page.waitForURL("**/decks", { timeout: 10_000 });

    await expect(page.getByText(deckName)).toBeVisible();
    await expect(page.getByText(commander)).toBeVisible();
  });

  test("deck list shows heading and decks", async ({ page }) => {
    await page.goto("/decks");
    await expect(page.getByRole("heading", { name: "My Decks" })).toBeVisible();
  });

  test("delete a deck", async ({ page }) => {
    // First create a throwaway deck
    const deckName = uniqueDeckName("ToDelete");
    await page.goto("/decks/new");
    await page.getByLabel("Deck Name").fill(deckName);
    await page.getByLabel("Commander").fill("Delete Me");
    await page.getByRole("button", { name: "Create Deck" }).click();
    await page.waitForURL("**/decks", { timeout: 10_000 });

    // Verify it exists
    await expect(page.getByText(deckName)).toBeVisible();

    // Handle confirm dialog and delete
    page.on("dialog", (dialog) => dialog.accept());
    // Find the specific deck card that contains our deck name as a direct child text
    const deckCard = page
      .locator(".space-y-2 > div")
      .filter({ has: page.locator(`text="${deckName}"`) });
    await deckCard.getByRole("button", { name: "Delete" }).click();

    // Verify it's gone
    await expect(page.getByText(deckName)).not.toBeVisible();
  });
});

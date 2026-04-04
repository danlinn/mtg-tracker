import { test, expect } from "@playwright/test";
import { uniqueEmail, uniqueName, uniqueDeckName } from "./helpers/test-data";
import { deleteTestUser, disconnectDb } from "./helpers/db-cleanup";
import * as fs from "fs";
import * as path from "path";

const CREDS_FILE = path.join(__dirname, ".auth", "credentials.json");

function getSetupCreds() {
  return JSON.parse(fs.readFileSync(CREDS_FILE, "utf-8"));
}

test.describe("game logging", () => {
  let secondUserEmail: string;
  const secondUserPassword = "TestPass123!";
  let secondUserName: string;

  test.beforeAll(async ({ browser }) => {
    // Create a second user for multiplayer games
    secondUserEmail = uniqueEmail("player2");
    secondUserName = uniqueName("Player2");

    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    // Register second user
    await page.goto("/sign-up-here");
    await page.getByLabel("Display Name").fill(secondUserName);
    await page.getByLabel("Email").fill(secondUserEmail);
    await page.getByLabel("Password").fill(secondUserPassword);
    await page.getByRole("button", { name: "Register" }).click();
    await page.waitForURL("**/dashboard", { timeout: 15_000 });

    // Create a deck for the second user
    await page.goto("/decks/new");
    await page.getByLabel("Deck Name").fill(uniqueDeckName("P2Deck"));
    await page.getByLabel("Commander").fill("Atraxa");
    await page.getByRole("button", { name: "Create Deck" }).click();
    await page.waitForURL("**/decks", { timeout: 10_000 });

    await ctx.close();
  });

  test.beforeAll(async ({ browser }) => {
    // Create a deck for the primary test user
    const creds = getSetupCreds();
    const storageState = path.join(__dirname, ".auth", "user.json");
    const ctx = await browser.newContext({ storageState });
    const page = await ctx.newPage();

    await page.goto("/decks/new");
    await page.getByLabel("Deck Name").fill(uniqueDeckName("P1Deck"));
    await page.getByLabel("Commander").fill("Krenko");
    await page.getByRole("button", { name: "Create Deck" }).click();
    await page.waitForURL("**/decks", { timeout: 10_000 });

    await ctx.close();
  });

  test("log a 2-player game", async ({ page }) => {
    const creds = getSetupCreds();
    await page.goto("/games/new");

    // Wait for users to load
    await page.waitForResponse((r) =>
      r.url().includes("/api/users") && r.status() === 200
    );

    // Set to 2 players
    await page.getByRole("button", { name: "2" }).click();

    // Player 1 — select primary user
    const p1Section = page.locator("div").filter({ hasText: /^Player 1/ }).first();
    const p1UserSelect = p1Section.locator("select").first();
    await p1UserSelect.selectOption({ label: creds.name });

    // Wait for deck dropdown to appear and select a deck
    const p1DeckSelect = p1Section.locator("select").nth(1);
    await p1DeckSelect.waitFor({ timeout: 5_000 });
    // Select the first available deck option
    const p1DeckOptions = await p1DeckSelect.locator("option").allTextContents();
    const p1DeckValue = p1DeckOptions.find((o) => o !== "Select deck...");
    if (p1DeckValue) {
      await p1DeckSelect.selectOption({ label: p1DeckValue });
    }

    // Player 2 — select second user
    const p2Section = page.locator("div").filter({ hasText: /^Player 2/ }).first();
    const p2UserSelect = p2Section.locator("select").first();
    await p2UserSelect.selectOption({ label: secondUserName });

    const p2DeckSelect = p2Section.locator("select").nth(1);
    await p2DeckSelect.waitFor({ timeout: 5_000 });
    const p2DeckOptions = await p2DeckSelect.locator("option").allTextContents();
    const p2DeckValue = p2DeckOptions.find((o) => o !== "Select deck...");
    if (p2DeckValue) {
      await p2DeckSelect.selectOption({ label: p2DeckValue });
    }

    // Set Player 1 as winner
    await p1Section.getByRole("button", { name: "Set Winner" }).click();

    // Submit
    await page.getByRole("button", { name: "Log Game" }).click();
    await page.waitForURL("**/games", { timeout: 10_000 });

    // Verify game appears
    await expect(page.getByText("Winner:")).toBeVisible();
  });

  test("validation: no winner selected", async ({ page }) => {
    const creds = getSetupCreds();
    await page.goto("/games/new");
    await page.waitForResponse((r) =>
      r.url().includes("/api/users") && r.status() === 200
    );

    await page.getByRole("button", { name: "2" }).click();

    // Select players and decks but no winner
    const p1Section = page.locator("div").filter({ hasText: /^Player 1/ }).first();
    await p1Section.locator("select").first().selectOption({ label: creds.name });
    const p1DeckSelect = p1Section.locator("select").nth(1);
    await p1DeckSelect.waitFor({ timeout: 5_000 });
    const p1DeckOptions = await p1DeckSelect.locator("option").allTextContents();
    const p1Deck = p1DeckOptions.find((o) => o !== "Select deck...");
    if (p1Deck) await p1DeckSelect.selectOption({ label: p1Deck });

    const p2Section = page.locator("div").filter({ hasText: /^Player 2/ }).first();
    await p2Section.locator("select").first().selectOption({ label: secondUserName });
    const p2DeckSelect = p2Section.locator("select").nth(1);
    await p2DeckSelect.waitFor({ timeout: 5_000 });
    const p2DeckOptions = await p2DeckSelect.locator("option").allTextContents();
    const p2Deck = p2DeckOptions.find((o) => o !== "Select deck...");
    if (p2Deck) await p2DeckSelect.selectOption({ label: p2Deck });

    // Submit without selecting a winner
    await page.getByRole("button", { name: "Log Game" }).click();
    await expect(page.getByText("Select a winner")).toBeVisible();
  });

  test("game history page shows games", async ({ page }) => {
    await page.goto("/games");
    await expect(
      page.getByRole("heading", { name: "Game History" })
    ).toBeVisible();
  });

  test.afterAll(async () => {
    if (secondUserEmail) {
      await deleteTestUser(secondUserEmail);
    }
    await disconnectDb();
  });
});

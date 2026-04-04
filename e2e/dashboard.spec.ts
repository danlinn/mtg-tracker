import { test, expect } from "@playwright/test";

test.describe("dashboard", () => {
  test("shows stat cards", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // Stat labels should be visible inside stat cards
    const main = page.getByRole("main");
    await expect(main.getByText("Games", { exact: true })).toBeVisible();
    await expect(main.getByText("Wins", { exact: true })).toBeVisible();
    await expect(main.getByText("Losses", { exact: true })).toBeVisible();
    await expect(main.getByText("Win Rate", { exact: true })).toBeVisible();
  });

  test("quick action links are present", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: "Log Game" })).toHaveAttribute(
      "href",
      "/games/new"
    );
    await expect(page.getByRole("link", { name: "Add Deck" })).toHaveAttribute(
      "href",
      "/decks/new"
    );
  });

  test("new user sees empty state", async ({ browser }) => {
    // Register a fresh user with no data
    const { uniqueEmail, uniqueName } = await import("./helpers/test-data");
    const { registerViaUI } = await import("./helpers/auth");
    const { deleteTestUser, disconnectDb } = await import(
      "./helpers/db-cleanup"
    );

    const email = uniqueEmail("empty");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await registerViaUI(page, {
      name: uniqueName("Empty"),
      email,
      password: "TestPass123!",
    });

    await page.goto("/dashboard");
    await expect(page.getByText("No games recorded yet")).toBeVisible();

    await ctx.close();
    await deleteTestUser(email);
    await disconnectDb();
  });
});

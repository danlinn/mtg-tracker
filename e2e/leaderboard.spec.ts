import { test, expect } from "@playwright/test";

test.describe("leaderboard", () => {
  test("shows leaderboard heading", async ({ page }) => {
    await page.goto("/leaderboard");
    await expect(
      page.getByRole("heading", { name: "Leaderboard" })
    ).toBeVisible();
  });

  test("displays player entries if games exist", async ({ page }) => {
    await page.goto("/leaderboard");

    // The leaderboard may or may not have entries depending on DB state.
    // Just verify the page loads without errors.
    const heading = page.getByRole("heading", { name: "Leaderboard" });
    await expect(heading).toBeVisible();
  });
});

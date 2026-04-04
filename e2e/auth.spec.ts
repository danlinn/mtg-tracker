import { test, expect } from "@playwright/test";
import { uniqueEmail, uniqueName } from "./helpers/test-data";
import { registerViaUI, loginViaUI } from "./helpers/auth";
import { deleteTestUser, disconnectDb } from "./helpers/db-cleanup";
import * as fs from "fs";
import * as path from "path";

const CREDS_FILE = path.join(__dirname, ".auth", "credentials.json");

function getSetupCreds() {
  return JSON.parse(fs.readFileSync(CREDS_FILE, "utf-8"));
}

// These tests run without auth (unauthenticated)
test.describe("auth - unauthenticated", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("register a new user", async ({ page }) => {
    const email = uniqueEmail("register");
    const name = uniqueName("Register");
    const password = "TestPass123!";

    await registerViaUI(page, { name, email, password });
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("Dashboard")).toBeVisible();

    // Cleanup
    await deleteTestUser(email);
  });

  test("login with valid credentials", async ({ page }) => {
    const creds = getSetupCreds();
    await loginViaUI(page, { email: creds.email, password: creds.password });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("login with invalid password shows error", async ({ page }) => {
    const creds = getSetupCreds();
    await page.goto("/login");
    await page.getByLabel("Email").fill(creds.email);
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText("Invalid email or password")).toBeVisible();
  });

  test("protected route /dashboard redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("protected route /decks redirects to login", async ({ page }) => {
    await page.goto("/decks");
    await expect(page).toHaveURL(/\/login/);
  });
});

// This test needs auth
test.describe("auth - authenticated", () => {
  test("logout redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.afterAll(async () => {
  await disconnectDb();
});

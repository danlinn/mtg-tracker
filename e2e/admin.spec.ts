import { test, expect } from "@playwright/test";
import { uniqueEmail, uniqueName } from "./helpers/test-data";
import { registerViaUI, loginViaUI } from "./helpers/auth";
import { deleteTestUser, disconnectDb } from "./helpers/db-cleanup";
import { neon } from "@neondatabase/serverless";
import * as fs from "fs";
import * as path from "path";

function loadEnvAndGetSql() {
  const envPath = path.join(__dirname, "..", ".env.local");
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    let value = trimmed.slice(eqIdx + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
  const connStr =
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;
  return neon(connStr!);
}

const CREDS_FILE = path.join(__dirname, ".auth", "credentials.json");
function getSetupCreds() {
  return JSON.parse(fs.readFileSync(CREDS_FILE, "utf-8"));
}

test.describe("admin - non-admin gets redirected", () => {
  test("non-admin is redirected from /admin to /dashboard", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe("admin - with admin role", () => {
  let adminEmail: string;
  let adminCreds: { name: string; email: string; password: string };

  test.beforeAll(async ({ browser }) => {
    adminEmail = uniqueEmail("admin");
    adminCreds = {
      name: uniqueName("Admin"),
      email: adminEmail,
      password: "AdminPass123!",
    };

    // Register admin user
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await registerViaUI(page, adminCreds);
    await ctx.close();

    // Promote to admin via DB
    const sql = loadEnvAndGetSql();
    await sql`UPDATE "User" SET role = 'admin' WHERE email = ${adminEmail}`;
  });

  // Don't use shared auth — each test logs in as admin fresh
  test.use({ storageState: { cookies: [], origins: [] } });

  test("admin can access /admin page", async ({ page }) => {
    await loginViaUI(page, adminCreds);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Decks" })).toBeVisible();
  });

  test("admin users page shows users", async ({ page }) => {
    await loginViaUI(page, adminCreds);
    await page.goto("/admin/users");
    await expect(
      page.getByRole("heading", { name: "Manage Users" })
    ).toBeVisible();
    const setupCreds = getSetupCreds();
    await expect(page.getByText(setupCreds.email)).toBeVisible();
  });

  test("admin decks page shows decks", async ({ page }) => {
    await loginViaUI(page, adminCreds);
    await page.goto("/admin/decks");
    await expect(
      page.getByRole("heading", { name: "Manage Decks" })
    ).toBeVisible();
  });

  test.afterAll(async () => {
    await deleteTestUser(adminEmail);
    await disconnectDb();
  });
});

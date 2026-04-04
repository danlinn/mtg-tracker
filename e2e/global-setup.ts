import { test as setup, expect } from "@playwright/test";
import { uniqueEmail, uniqueName } from "./helpers/test-data";
import { registerViaUI } from "./helpers/auth";
import * as fs from "fs";
import * as path from "path";

const AUTH_DIR = path.join(__dirname, ".auth");
const CREDS_FILE = path.join(AUTH_DIR, "credentials.json");

setup("register and save auth state", async ({ page }) => {
  const creds = {
    name: uniqueName("TestUser"),
    email: uniqueEmail("setup"),
    password: "TestPassword123!",
  };

  // Ensure .auth dir exists
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  // Save credentials for teardown
  fs.writeFileSync(CREDS_FILE, JSON.stringify(creds));

  // Register via UI and land on dashboard
  await registerViaUI(page, creds);
  await expect(page).toHaveURL(/\/dashboard/);

  // Save auth state for other tests
  await page.context().storageState({ path: path.join(AUTH_DIR, "user.json") });
});

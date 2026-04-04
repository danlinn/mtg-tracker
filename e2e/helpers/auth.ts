import { Page, expect } from "@playwright/test";

export async function registerViaUI(
  page: Page,
  { name, email, password }: { name: string; email: string; password: string }
) {
  await page.goto("/sign-up-here");
  await page.getByLabel("Display Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Register" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
}

export async function loginViaUI(
  page: Page,
  { email, password }: { email: string; password: string }
) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
}

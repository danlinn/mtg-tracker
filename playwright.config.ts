import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "html",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /global-setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
      testIgnore: /global-setup\.ts|global-teardown\.ts/,
    },
    {
      name: "teardown",
      testMatch: /global-teardown\.ts/,
      dependencies: ["chromium"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    env: {
      NEXTAUTH_URL: "http://localhost:3000",
    },
  },
});

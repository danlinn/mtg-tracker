import { test as teardown } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { deleteTestUser, disconnectDb } from "./helpers/db-cleanup";

const CREDS_FILE = path.join(__dirname, ".auth", "credentials.json");

teardown("delete test user", async () => {
  if (fs.existsSync(CREDS_FILE)) {
    const creds = JSON.parse(fs.readFileSync(CREDS_FILE, "utf-8"));
    await deleteTestUser(creds.email);
    fs.unlinkSync(CREDS_FILE);
  }
  await disconnectDb();
});

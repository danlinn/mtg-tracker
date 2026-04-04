import { neon } from "@neondatabase/serverless";
import * as fs from "fs";
import * as path from "path";

function loadEnv() {
  // Playwright test workers don't auto-load .env.local, so parse it ourselves
  const envPath = path.join(__dirname, "..", "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    let value = trimmed.slice(eqIdx + 1);
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function getSql() {
  loadEnv();
  const connectionString =
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("No database connection string found in env or .env.local");
  }
  return neon(connectionString);
}

export async function deleteTestUser(email: string) {
  const sql = getSql();

  // Find user
  const users = await sql`SELECT id FROM "User" WHERE email = ${email}`;
  if (users.length === 0) return;
  const userId = users[0].id;

  // Find game IDs the user participates in
  const gameEntries = await sql`SELECT "gameId" FROM "GamePlayer" WHERE "userId" = ${userId}`;
  const gameIds = gameEntries.map((gp) => gp.gameId);

  // Delete game player entries for this user
  await sql`DELETE FROM "GamePlayer" WHERE "userId" = ${userId}`;

  // Delete user's decks
  await sql`DELETE FROM "Deck" WHERE "userId" = ${userId}`;

  // Delete the user
  await sql`DELETE FROM "User" WHERE id = ${userId}`;

  // Clean up orphan games
  for (const gameId of gameIds) {
    const remaining = await sql`SELECT COUNT(*) as count FROM "GamePlayer" WHERE "gameId" = ${gameId}`;
    if (Number(remaining[0].count) === 0) {
      await sql`DELETE FROM "Game" WHERE id = ${gameId}`;
    }
  }
}

export async function disconnectDb() {
  // neon is stateless, nothing to disconnect
}

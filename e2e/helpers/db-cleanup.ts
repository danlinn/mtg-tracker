import * as fs from "fs";
import * as path from "path";

function loadEnv() {
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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function getConnectionString(): string {
  loadEnv();
  const url =
    process.env.POSTGRES_PRISMA_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;
  if (!url) {
    throw new Error("No database connection string found in env or .env.local");
  }
  return url.replace(/\\n/g, "").replace(/\n/g, "").trim();
}

async function execSql(statements: string[]) {
  const connStr = getConnectionString();

  if (connStr.includes("neon.tech")) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(connStr);
    for (const stmt of statements) {
      await sql(stmt);
    }
  } else {
    const pg = await import("pg");
    const client = new pg.default.Client({ connectionString: connStr });
    await client.connect();
    try {
      for (const stmt of statements) {
        await client.query(stmt);
      }
    } finally {
      await client.end();
    }
  }
}

async function querySql<T>(query: string, params: string[] = []): Promise<T[]> {
  const connStr = getConnectionString();

  if (connStr.includes("neon.tech")) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(connStr);
    return await sql(query, params) as T[];
  } else {
    const pg = await import("pg");
    const client = new pg.default.Client({ connectionString: connStr });
    await client.connect();
    try {
      const result = await client.query(query, params);
      return result.rows as T[];
    } finally {
      await client.end();
    }
  }
}

export async function deleteTestUser(email: string) {
  const users = await querySql<{ id: string }>(
    'SELECT id FROM "User" WHERE email = $1',
    [email]
  );
  if (users.length === 0) return;
  const userId = users[0].id;

  const gameEntries = await querySql<{ gameId: string }>(
    'SELECT "gameId" FROM "GamePlayer" WHERE "userId" = $1',
    [userId]
  );
  const gameIds = gameEntries.map((gp) => gp.gameId);

  await execSql([
    `DELETE FROM "GamePlayer" WHERE "userId" = '${userId}'`,
    `DELETE FROM "Deck" WHERE "userId" = '${userId}'`,
    `DELETE FROM "PlaygroupMember" WHERE "userId" = '${userId}'`,
    `DELETE FROM "User" WHERE id = '${userId}'`,
  ]);

  for (const gameId of gameIds) {
    const remaining = await querySql<{ count: string }>(
      'SELECT COUNT(*) as count FROM "GamePlayer" WHERE "gameId" = $1',
      [gameId]
    );
    if (Number(remaining[0].count) === 0) {
      await execSql([`DELETE FROM "Game" WHERE id = '${gameId}'`]);
    }
  }
}

export async function disconnectDb() {
  // Both neon and pg clients are cleaned up per-call
}

// Diagnostic script: prints columns of the User table
// Run with: POSTGRES_URL="..." node --experimental-vm-modules scripts/check-user-columns.mjs
// (or set DATABASE_URL / POSTGRES_PRISMA_URL)
import { neon } from "@neondatabase/serverless";

const url =
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;

if (!url) {
  console.error("No DB URL set");
  process.exit(1);
}

console.log("Connecting to:", url.replace(/:[^:@]+@/, ":***@"));

const sql = neon(url);
const rows = await sql`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'User'
  ORDER BY ordinal_position
`;

console.log("\nColumns of 'User' table:");
for (const row of rows) {
  console.log(`  ${row.column_name.padEnd(22)} ${row.data_type}`);
}

const hasReset = rows.some((r) => r.column_name === "resetToken");
const hasExp = rows.some((r) => r.column_name === "resetTokenExp");
console.log("\nresetToken present:    ", hasReset);
console.log("resetTokenExp present: ", hasExp);

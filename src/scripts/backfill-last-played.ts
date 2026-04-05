/**
 * Backfill lastPlayedAt for decks that were used in games before
 * the lastPlayedAt field was added.
 *
 * Run with: npx tsx src/scripts/backfill-last-played.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaNeon } from "@prisma/adapter-neon";

const connectionString =
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("No database connection string found.");
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Find all decks that have game entries but no lastPlayedAt
  const decks = await prisma.deck.findMany({
    where: {
      lastPlayedAt: null,
      gameEntries: { some: {} },
    },
    select: {
      id: true,
      name: true,
      gameEntries: {
        select: {
          game: { select: { playedAt: true } },
        },
        orderBy: { game: { playedAt: "desc" } },
        take: 1,
      },
    },
  });

  if (decks.length === 0) {
    console.log("No decks need backfilling.");
    return;
  }

  console.log(`Found ${decks.length} deck(s) to backfill:\n`);

  for (const deck of decks) {
    const lastGame = deck.gameEntries[0];
    if (!lastGame) continue;

    const lastPlayedAt = lastGame.game.playedAt;
    console.log(`  ${deck.name} -> lastPlayedAt = ${lastPlayedAt.toISOString()}`);

    await prisma.deck.update({
      where: { id: deck.id },
      data: { lastPlayedAt },
    });
  }

  console.log(`\nDone. Backfilled ${decks.length} deck(s).`);
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

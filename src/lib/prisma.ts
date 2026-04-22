import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function cleanUrl(url: string | undefined): string {
  if (!url) return "";
  let cleaned = url.replace(/\\n/g, "").replace(/\n/g, "").trim();
  // Neon's WebSocket proxy doesn't support channel binding — strip it
  // so the serverless driver doesn't fail with a misleading auth error.
  cleaned = cleaned.replace(/[?&]channel_binding=[^&]*/g, "");
  // Fix dangling ? if channel_binding was the only param
  cleaned = cleaned.replace(/\?&/, "?").replace(/\?$/, "");
  return cleaned;
}

function maskUrl(url: string): string {
  return url.replace(/:[^:@]+@/, ":***@");
}

function createPrismaClient() {
  const candidates = [
    { name: "POSTGRES_PRISMA_URL", val: cleanUrl(process.env.POSTGRES_PRISMA_URL) },
    { name: "NEON_DATABASE_URL", val: cleanUrl(process.env.NEON_DATABASE_URL) },
    { name: "POSTGRES_URL", val: cleanUrl(process.env.POSTGRES_URL) },
    { name: "DATABASE_URL", val: cleanUrl(process.env.DATABASE_URL) },
  ];

  const winner = candidates.find((c) => !!c.val);

  console.log(
    "[prisma] url resolution:",
    candidates.map((c) => `${c.name}=${c.val ? maskUrl(c.val) : "(empty)"}`).join(" | ")
  );
  console.log(
    "[prisma] using:",
    winner ? `${winner.name} → ${maskUrl(winner.val)}` : "NONE"
  );

  if (!winner?.val) {
    throw new Error(
      "No database connection string found. Set POSTGRES_PRISMA_URL, NEON_DATABASE_URL, POSTGRES_URL, or DATABASE_URL."
    );
  }

  const adapter = new PrismaNeon({ connectionString: winner.val });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

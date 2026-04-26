import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function cleanUrl(url: string | undefined): string {
  if (!url) return "";
  const stripped = url.replace(/\\n/g, "").replace(/\n/g, "").trim();
  if (!stripped) return "";
  try {
    const u = new URL(stripped);
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return stripped;
  }
}

function maskUrl(url: string): string {
  return url.replace(/:[^:@]+@/, ":***@");
}

function needsNeonAdapter(url: string): boolean {
  return url.includes("neon.tech");
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

  if (needsNeonAdapter(winner.val)) {
    const adapter = new PrismaNeon({ connectionString: winner.val });
    return new PrismaClient({ adapter });
  }

  return new PrismaClient({ datasourceUrl: winner.val });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function cleanUrl(url: string | undefined): string {
  if (!url) return "";
  return url.replace(/\\n/g, "").trim();
}

function createPrismaClient() {
  const connectionString =
    cleanUrl(process.env.POSTGRES_PRISMA_URL) ||
    cleanUrl(process.env.NEON_DATABASE_URL) ||
    cleanUrl(process.env.POSTGRES_URL) ||
    cleanUrl(process.env.DATABASE_URL);

  if (!connectionString) {
    throw new Error(
      "No database connection string found. Set POSTGRES_PRISMA_URL, NEON_DATABASE_URL, POSTGRES_URL, or DATABASE_URL."
    );
  }

  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

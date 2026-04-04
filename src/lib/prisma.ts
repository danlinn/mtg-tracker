import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const connectionString =
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "No database connection string found. Set POSTGRES_PRISMA_URL, POSTGRES_URL, or DATABASE_URL."
    );
  }

  // Use Neon HTTP adapter on Vercel (serverless-friendly, no WebSockets needed)
  const useNeon =
    process.env.VERCEL === "1" ||
    connectionString.includes("neon.tech") ||
    connectionString.includes("neon.") ||
    connectionString.includes("vercel-storage.com");

  if (useNeon) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaNeonHttp } = require("@prisma/adapter-neon");
    const adapter = new PrismaNeonHttp(connectionString, { fullResults: true });
    return new PrismaClient({ adapter });
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaPg } = require("@prisma/adapter-pg");
    const adapter = new PrismaPg({ connectionString });
    return new PrismaClient({ adapter });
  }
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

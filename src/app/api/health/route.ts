import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Test DB connection with a simple query
    await prisma.user.count();
    return NextResponse.json({
      status: "ok",
      database: "connected",
      env: {
        hasPostgresPrismaUrl: !!process.env.POSTGRES_PRISMA_URL,
        hasPostgresUrl: !!process.env.POSTGRES_URL,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        isVercel: process.env.VERCEL === "1",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
        env: {
          hasPostgresPrismaUrl: !!process.env.POSTGRES_PRISMA_URL,
          hasPostgresUrl: !!process.env.POSTGRES_URL,
          hasDatabaseUrl: !!process.env.DATABASE_URL,
          isVercel: process.env.VERCEL === "1",
        },
      },
      { status: 500 }
    );
  }
}

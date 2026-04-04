import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const connStringUsed = process.env.POSTGRES_PRISMA_URL
    ? "POSTGRES_PRISMA_URL"
    : process.env.POSTGRES_URL
    ? "POSTGRES_URL"
    : process.env.DATABASE_URL
    ? "DATABASE_URL"
    : "NONE";

  const envInfo = {
    hasPostgresPrismaUrl: !!process.env.POSTGRES_PRISMA_URL,
    hasPostgresUrl: !!process.env.POSTGRES_URL,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    isVercel: process.env.VERCEL === "1",
    connStringUsed,
  };

  try {
    await prisma.user.count();
    return NextResponse.json({
      status: "ok",
      database: "connected",
      env: envInfo,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null
        ? JSON.stringify(error)
        : String(error);

    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        error: errorMessage,
        env: envInfo,
      },
      { status: 500 }
    );
  }
}

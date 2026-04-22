import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// TEMPORARY diagnostic endpoint — requires a query-string secret so
// we can hit it without being logged in. Remove once the schema
// mismatch is resolved.
//
// Usage: /api/admin/db-debug?key=<DEBUG_KEY env var>
export async function GET(req: Request) {
  const expected = process.env.DEBUG_KEY ?? "debug-mtg-2026";
  const key = new URL(req.url).searchParams.get("key");
  if (key !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const envUrls: Record<string, string | null> = {
    POSTGRES_PRISMA_URL: mask(process.env.POSTGRES_PRISMA_URL),
    POSTGRES_URL: mask(process.env.POSTGRES_URL),
    DATABASE_URL: mask(process.env.DATABASE_URL),
    POSTGRES_URL_NON_POOLING: mask(process.env.POSTGRES_URL_NON_POOLING),
    NEON_DATABASE_URL: mask(process.env.NEON_DATABASE_URL),
    NEON_DATABASE_URL_UNPOOLED: mask(process.env.NEON_DATABASE_URL_UNPOOLED),
  };

  try {
    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'User'
      ORDER BY ordinal_position
    `;

    const hasResetToken = columns.some((c) => c.column_name === "resetToken");

    return NextResponse.json({
      envUrls,
      userColumns: columns.map((c) => c.column_name),
      hasResetToken,
    });
  } catch (error) {
    return NextResponse.json({
      envUrls,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function mask(url: string | undefined): string | null {
  if (!url) return null;
  return url.replace(/:[^:@]+@/, ":***@");
}

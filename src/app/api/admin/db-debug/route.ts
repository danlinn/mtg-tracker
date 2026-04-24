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

  function clean(url: string | undefined): string {
    if (!url) return "";
    return url.replace(/\\n/g, "").replace(/\n/g, "").trim();
  }

  const varNames = [
    "POSTGRES_PRISMA_URL",
    "NEON_DATABASE_URL",
    "POSTGRES_URL",
    "DATABASE_URL",
    "POSTGRES_URL_NON_POOLING",
    "NEON_DATABASE_URL_UNPOOLED",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
  ] as const;

  const envUrls: Record<string, { masked: string | null; rawLen: number; cleanLen: number }> = {};
  for (const name of varNames) {
    const raw = process.env[name];
    envUrls[name] = {
      masked: mask(raw),
      rawLen: raw?.length ?? 0,
      cleanLen: clean(raw).length,
    };
  }

  const resolvedUrl =
    clean(process.env.POSTGRES_PRISMA_URL) ||
    clean(process.env.NEON_DATABASE_URL) ||
    clean(process.env.POSTGRES_URL) ||
    clean(process.env.DATABASE_URL) ||
    "(none)";

  const resolvedFrom = [
    ["POSTGRES_PRISMA_URL", clean(process.env.POSTGRES_PRISMA_URL)],
    ["NEON_DATABASE_URL", clean(process.env.NEON_DATABASE_URL)],
    ["POSTGRES_URL", clean(process.env.POSTGRES_URL)],
    ["DATABASE_URL", clean(process.env.DATABASE_URL)],
  ].find(([, v]) => !!v)?.[0] ?? "none";

  try {
    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name::text AS column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'User'
      ORDER BY ordinal_position
    `;

    const counts = await prisma.$queryRaw<Array<{ table_name: string; row_count: bigint }>>`
      SELECT relname::text AS table_name, n_live_tup AS row_count
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY relname
    `;

    const hasResetToken = columns.some((c) => c.column_name === "resetToken");
    const hasResetTokenExp = columns.some((c) => c.column_name === "resetTokenExp");

    return NextResponse.json({
      resolvedFrom,
      resolvedUrl: mask(resolvedUrl),
      envUrls,
      userColumns: columns.map((c) => c.column_name),
      hasResetToken,
      hasResetTokenExp,
      tableCounts: Object.fromEntries(
        counts.map((r) => [r.table_name, Number(r.row_count)])
      ),
    });
  } catch (error) {
    return NextResponse.json({
      resolvedFrom,
      resolvedUrl: mask(resolvedUrl),
      envUrls,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function mask(url: string | undefined): string | null {
  if (!url) return null;
  return url.replace(/:[^:@]+@/, ":***@");
}

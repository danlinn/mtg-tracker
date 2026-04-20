import { NextResponse } from "next/server";

const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA ?? Date.now().toString();

export async function GET() {
  return NextResponse.json(
    { version: BUILD_ID },
    { headers: { "Cache-Control": "no-store" } }
  );
}

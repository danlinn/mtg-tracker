import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      name: "MTG Commander Tracker",
      short_name: "MTG Tracker",
      start_url: "/dashboard",
      display: "standalone",
      background_color: "#111827",
      theme_color: "#111827",
      icons: [
        {
          src: "/icon-192.svg",
          sizes: "192x192",
          type: "image/svg+xml",
        },
      ],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
      },
    }
  );
}

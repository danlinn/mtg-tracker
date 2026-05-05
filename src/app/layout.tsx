import type { Metadata, Viewport } from "next";
import Providers from "@/components/Providers";
import { Analytics } from "@vercel/analytics/next";
import { AutotixInit } from "./autotix-init";
import "./globals.css";

export const metadata: Metadata = {
  title: "MTG Commander Tracker",
  description: "Track your Magic: The Gathering Commander games, decks, and stats",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MTG Tracker",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Comic+Neue:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&family=Philosopher:ital,wght@0,400;0,700;1,400&family=Orbitron:wght@400;500;600;700;900&family=Space+Grotesk:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <AutotixInit />
        <Analytics />
      </body>
    </html>
  );
}

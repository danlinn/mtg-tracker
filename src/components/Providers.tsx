"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/lib/theme";
import VersionCheck from "@/components/VersionCheck";
import { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
        <VersionCheck />
      </ThemeProvider>
    </SessionProvider>
  );
}

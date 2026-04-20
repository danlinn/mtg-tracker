"use client";

import { useEffect, useRef } from "react";

const POLL_INTERVAL = 3 * 60 * 1000; // 3 minutes

export default function VersionCheck() {
  const knownVersion = useRef<string | null>(null);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { version } = await res.json();

        if (knownVersion.current === null) {
          knownVersion.current = version;
          return;
        }

        if (version !== knownVersion.current) {
          knownVersion.current = version;
          window.location.reload();
        }
      } catch {
        // Network errors are non-fatal
      }
    }

    check();
    const id = setInterval(check, POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  return null;
}

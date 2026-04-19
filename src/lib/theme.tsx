"use client";

import { createContext, useContext, useCallback, useEffect, useMemo, useSyncExternalStore, ReactNode } from "react";
import { getPalette } from "@/lib/themePalettes";

export type ThemeName = "default" | "synth" | "cyber" | "flame" | "chris" | "phyrexia" | "stained-glass" | "dungeon" | "neon-dynasty" | "grixis";

const VALID_THEMES: ThemeName[] = ["default", "synth", "cyber", "flame", "chris", "phyrexia", "stained-glass", "dungeon", "neon-dynasty", "grixis"];

function isValidTheme(s: string): s is ThemeName {
  return VALID_THEMES.includes(s as ThemeName);
}

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "default",
  setTheme: () => {},
});

let listeners: Array<() => void> = [];

function getSnapshot(): ThemeName {
  const saved = localStorage.getItem("mtg-tracker-theme");
  if (saved && isValidTheme(saved)) return saved;
  return "default";
}

function getServerSnapshot(): ThemeName {
  return "default";
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Load theme from server on mount — only apply if the user hasn't
  // changed it client-side since mount (avoids overwriting a selection
  // made while the fetch was in flight).
  useEffect(() => {
    const mountTheme = localStorage.getItem("mtg-tracker-theme");
    fetch("/api/theme")
      .then((r) => r.json())
      .then((data) => {
        if (data.theme && isValidTheme(data.theme)) {
          const current = localStorage.getItem("mtg-tracker-theme");
          if (current === mountTheme) {
            localStorage.setItem("mtg-tracker-theme", data.theme);
            document.documentElement.setAttribute("data-theme", data.theme);
            listeners.forEach((l) => l());
          }
        }
      })
      .catch(() => {});
  }, []);

  const setTheme = useCallback((t: ThemeName) => {
    localStorage.setItem("mtg-tracker-theme", t);
    document.documentElement.setAttribute("data-theme", t);
    listeners.forEach((l) => l());

    // Persist to server
    fetch("/api/theme", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: t }),
    }).catch(() => {});
  }, []);

  // Keep data-theme attribute in sync
  if (typeof window !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
  }

  // Stable reference so consumers don't re-render unless theme changes
  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Hook: returns the MTG color palette reinterpreted for the active theme.
// Kept here so it lives next to `useTheme` rather than requiring callers
// to compose two hooks.
export function useThemePalette() {
  const { theme } = useTheme();
  return getPalette(theme);
}

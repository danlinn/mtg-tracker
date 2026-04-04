"use client";

import { createContext, useContext, useCallback, useSyncExternalStore, ReactNode } from "react";

export type ThemeName = "default" | "old-school" | "liquid" | "cyber" | "synth" | "chris";

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
  if (saved === "default" || saved === "old-school" || saved === "liquid" || saved === "cyber" || saved === "synth" || saved === "chris") return saved;
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

  const setTheme = useCallback((t: ThemeName) => {
    localStorage.setItem("mtg-tracker-theme", t);
    document.documentElement.setAttribute("data-theme", t);
    listeners.forEach((l) => l());
  }, []);

  // Keep data-theme attribute in sync
  if (typeof window !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

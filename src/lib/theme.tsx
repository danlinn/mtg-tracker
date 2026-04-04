"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ThemeName = "default" | "mtg";

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "default",
  setTheme: () => {},
});

function getInitialTheme(): ThemeName {
  if (typeof window === "undefined") return "default";
  const saved = localStorage.getItem("mtg-tracker-theme");
  if (saved === "default" || saved === "mtg") return saved;
  return "default";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(getInitialTheme);

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    localStorage.setItem("mtg-tracker-theme", t);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

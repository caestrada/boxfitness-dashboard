"use client";

import type { ReactNode } from "react";
import * as React from "react";

import { isTheme, type Theme, themeStorageKey } from "@/lib/theme";

interface ThemeContextValue {
  mounted: boolean;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function getInitialTheme(defaultTheme: Theme) {
  return defaultTheme;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
}: {
  children: ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setThemeState] = React.useState<Theme>(() =>
    getInitialTheme(defaultTheme),
  );
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedTheme = window.localStorage.getItem(themeStorageKey);
    const nextTheme = isTheme(storedTheme) ? storedTheme : defaultTheme;

    setThemeState(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem(themeStorageKey, nextTheme);
    setMounted(true);
  }, [defaultTheme]);

  React.useEffect(() => {
    if (!mounted) {
      return;
    }

    applyTheme(theme);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(themeStorageKey, theme);
    }
  }, [mounted, theme]);

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ mounted, theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider.");
  }

  return context;
}

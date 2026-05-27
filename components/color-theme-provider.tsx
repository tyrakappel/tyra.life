"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  COLOR_THEMES,
  COLOR_THEME_STORAGE_KEY,
  DEFAULT_COLOR_THEME,
  type ColorTheme,
} from "@/lib/color-themes";

type Ctx = {
  colorTheme: ColorTheme;
  setColorTheme: (t: ColorTheme) => void;
};

const ColorThemeContext = createContext<Ctx | null>(null);

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(DEFAULT_COLOR_THEME);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate från localStorage (synkat med det inline-script i layout.tsx
  // som redan satt attributet innan React mountade — så ingen FOUC).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLOR_THEME_STORAGE_KEY) as ColorTheme | null;
      if (stored && COLOR_THEMES.some((t) => t.id === stored)) {
        setColorThemeState(stored);
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.setAttribute("data-color-theme", colorTheme);
    try {
      localStorage.setItem(COLOR_THEME_STORAGE_KEY, colorTheme);
    } catch {
      // ignore
    }
  }, [colorTheme, hydrated]);

  return (
    <ColorThemeContext.Provider
      value={{ colorTheme, setColorTheme: setColorThemeState }}
    >
      {children}
    </ColorThemeContext.Provider>
  );
}

export function useColorTheme(): Ctx {
  const ctx = useContext(ColorThemeContext);
  if (!ctx) {
    // Fallback för komponenter som råkar renderas utanför providern
    return { colorTheme: DEFAULT_COLOR_THEME, setColorTheme: () => {} };
  }
  return ctx;
}

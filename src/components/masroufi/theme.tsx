import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type MasroofiTheme = "teal" | "pink";
const STORAGE_KEY = "masroofi-theme";

type ThemeContextValue = {
  theme: MasroofiTheme;
  setTheme: (theme: MasroofiTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readTheme(): MasroofiTheme | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "pink" || value === "teal" ? value : null;
  } catch {
    return null;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<MasroofiTheme>(() => readTheme() ?? "teal");

  useEffect(() => {
    document.documentElement.classList.toggle("theme-pink", theme === "pink");
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage may be unavailable; the theme still applies for this session.
    }
  }, [theme]);

  const value = useMemo(
    () => ({ theme, setTheme: (next: MasroofiTheme) => setThemeState(next) }),
    [theme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}

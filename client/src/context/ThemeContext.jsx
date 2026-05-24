import { createContext, useContext, useEffect } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";

const ThemeContext = createContext(null);

const STORAGE_KEY = "vaultfs-theme";
const DEFAULT_THEME = "system";
const MEDIA_QUERY = "(prefers-color-scheme: dark)";

function getSystemTheme() {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia(MEDIA_QUERY).matches ? "dark" : "light";
}

function applyTheme(theme) {
  if (typeof document === "undefined") return;

  const resolvedTheme = theme === "system" ? getSystemTheme() : theme;
  const root = document.documentElement;
  const themeColor = resolvedTheme === "dark" ? "#09090b" : "#f8fafc";

  root.dataset.theme = theme;
  root.dataset.resolvedTheme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute("content", themeColor);
}

export function initializeTheme() {
  if (typeof window === "undefined") return;

  let theme = DEFAULT_THEME;

  try {
    const storedTheme = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (["light", "dark", "system"].includes(storedTheme)) theme = storedTheme;
  } catch {
    theme = DEFAULT_THEME;
  }

  applyTheme(theme);
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useLocalStorage(STORAGE_KEY, DEFAULT_THEME);
  const resolvedTheme = theme === "system" ? getSystemTheme() : theme;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia(MEDIA_QUERY);
    const syncSystemTheme = () => {
      if (theme === "system") applyTheme(theme);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", syncSystemTheme);
      return () => mediaQuery.removeEventListener("change", syncSystemTheme);
    }

    mediaQuery.addListener(syncSystemTheme);
    return () => mediaQuery.removeListener(syncSystemTheme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider.");
  return context;
}

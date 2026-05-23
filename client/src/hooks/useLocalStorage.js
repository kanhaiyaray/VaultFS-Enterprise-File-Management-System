/**
 * hooks/useLocalStorage.js
 * useState that persists to localStorage.
 * Usage: const [theme, setTheme] = useLocalStorage("theme", "dark");
 */
import { useState } from "react";

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (err) {
      console.error("useLocalStorage error:", err);
    }
  };

  return [storedValue, setValue];
}

"use client";

import { useSyncExternalStore, useCallback, useEffect } from "react";

export type Theme = "system" | "light" | "dark";

const STORAGE_KEY = "theme";
const CHANGE_EVENT = "theme-change";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getSnapshot(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return v ?? "light";
  } catch {
    return "light";
  }
}

function getServerSnapshot(): Theme {
  return "light";
}

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  if (theme === "dark") {
    html.classList.add("dark");
  } else if (theme === "light") {
    html.classList.remove("dark");
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    html.classList.add("dark");
  } else {
    html.classList.remove("dark");
  }
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Sincroniza la clase .dark con el theme actual. Cubre cambios cross-tab.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Reacciona a cambios del tema del SO cuando theme = "system".
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      /* localStorage no disponible */
    }
    // El evento `storage` solo dispara entre pestañas; este custom event
    // notifica a otros consumidores del hook en la misma pestaña.
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { theme, setTheme };
}

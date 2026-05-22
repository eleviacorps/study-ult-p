"use client";

import { create } from "zustand";
import { useEffect } from "react";

type Theme = "dark" | "cream";

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = localStorage.getItem("studyult-theme");
    if (stored === "cream" || stored === "dark") return stored;
  } catch {}
  return "dark";
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "dark",
  toggle: () => {
    const next = get().theme === "dark" ? "cream" : "dark";
    set({ theme: next });
    if (typeof window !== "undefined") {
      localStorage.setItem("studyult-theme", next);
      document.documentElement.setAttribute("data-theme", next);
    }
  },
  setTheme: (t) => {
    set({ theme: t });
    if (typeof window !== "undefined") {
      localStorage.setItem("studyult-theme", t);
      document.documentElement.setAttribute("data-theme", t);
    }
  },
}));

export function ThemeInitializer() {
  const { setTheme } = useThemeStore();

  useEffect(() => {
    const theme = getInitialTheme();
    setTheme(theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [setTheme]);

  return null;
}

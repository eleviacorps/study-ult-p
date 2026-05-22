"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "cream";

const ThemeContext = createContext<Theme>("dark");

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("studyult-theme") as Theme;
    if (stored === "dark" || stored === "cream") {
      setTheme(stored);
      document.documentElement.setAttribute("data-theme", stored);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "cream" : "dark";
    setTheme(next);
    localStorage.setItem("studyult-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const setThemeValue = (t: Theme) => {
    setTheme(t);
    localStorage.setItem("studyult-theme", t);
    document.documentElement.setAttribute("data-theme", t);
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export { ThemeContext };

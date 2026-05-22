"use client";

import { useTheme } from "@/components/theme-provider";

export function useThemeColors() {
  const theme = useTheme();
  const isDark = theme === "dark";

  return {
    text: isDark
      ? ({ primary: "#F8FAFC", secondary: "#94A3B8", muted: "#475569" } as const)
      : ({ primary: "#1C1917", secondary: "#57534E", muted: "#8C8A85" } as const),
    textOpacity: (opacity: number) =>
      isDark ? `rgba(248,250,252,${opacity})` : `rgba(28,25,23,${opacity})`,
    borderOpacity: (opacity: number) =>
      isDark ? `rgba(255,255,255,${opacity})` : `rgba(17,17,17,${opacity})`,
    bgOpacity: (opacity: number) =>
      isDark ? `rgba(255,255,255,${opacity})` : `rgba(17,17,17,${opacity})`,
    cardBg: isDark ? "rgba(255,255,255,0.03)" : "rgba(17,17,17,0.04)",
    cardBgHover: isDark ? "rgba(255,255,255,0.06)" : "rgba(17,17,17,0.08)",
    accent: (color: string) => {
      const colors: Record<string, string> = {
        primary: isDark ? "#1856FF" : "#2563EB",
        cyan: isDark ? "#06B6D4" : "#0891B2",
        emerald: isDark ? "#10B981" : "#059669",
        purple: isDark ? "#8B5CF6" : "#7C3AED",
        orange: isDark ? "#F97316" : "#EA580C",
        red: isDark ? "#EF4444" : "#DC2626",
        amber: isDark ? "#F59E0B" : "#D97706",
        indigo: isDark ? "#6366F1" : "#4F46E5",
      };
      return colors[color] || "#1856FF";
    },
  };
}

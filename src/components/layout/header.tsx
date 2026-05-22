"use client";

import { motion } from "framer-motion";
import { Search, Command, Sun, Moon } from "lucide-react";
import { useThemeStore } from "@/stores/theme-store";
import { GlobalSearch } from "@/components/global-search";
import { cn } from "@/lib/cn";

interface HeaderProps {
  title?: string;
  breadcrumbs?: { label: string; href: string }[];
}

export function Header({ title, breadcrumbs }: HeaderProps) {
  const { theme, toggle } = useThemeStore();

  return (
    <header className="sticky top-0 z-20 h-16 flex items-center justify-between px-4 sm:px-6 border-b border-[var(--glass-border)] bg-[var(--bg-surface)] rounded-none">
      <div className="flex items-center gap-3">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1.5 text-sm">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-1.5">
                {i > 0 && (
                  <span className="opacity-15" style={{ color: "var(--text-muted)" }}>/</span>
                )}
                <span
                  className={cn(
                    i === breadcrumbs.length - 1
                      ? "opacity-80"
                      : "opacity-35"
                  )}
                  style={{ color: "var(--text-primary)" }}
                >
                  {crumb.label}
                </span>
              </span>
            ))}
          </div>
        )}
        {title && !breadcrumbs && (
          <h1 className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{title}</h1>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2 sm:gap-3"
      >
        <GlobalSearch />
        <button
          onClick={toggle}
          className="p-2 rounded-xl glass-interactive"
          style={{ color: "var(--text-muted)" }}
          title={`Switch to ${theme === "dark" ? "cream" : "dark"} theme`}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1856FF] to-[#8B5CF6] flex items-center justify-center text-xs font-medium text-white">
          S
        </div>
      </motion.div>
    </header>
  );
}

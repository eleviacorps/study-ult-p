"use client";

import { motion } from "framer-motion";
import { Search, Command } from "lucide-react";
import { cn } from "@/lib/cn";

interface HeaderProps {
  title?: string;
  breadcrumbs?: { label: string; href: string }[];
}

export function Header({ title, breadcrumbs }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-6 glass border-b-0 border-l-0 border-r-0 rounded-none">
      <div className="flex items-center gap-3">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1.5 text-sm">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-1.5">
                {i > 0 && (
                  <span className="text-white/15">/</span>
                )}
                <span
                  className={cn(
                    i === breadcrumbs.length - 1
                      ? "text-white/80"
                      : "text-white/35"
                  )}
                >
                  {crumb.label}
                </span>
              </span>
            ))}
          </div>
        )}
        {title && !breadcrumbs && (
          <h1 className="text-sm font-medium text-white/70">{title}</h1>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-3"
      >
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-white/30 text-xs hover:border-white/[0.1] hover:text-white/50 transition-all">
          <Search className="w-3.5 h-3.5" />
          <span>Search</span>
          <span className="flex items-center gap-0.5 ml-2 text-white/15">
            <Command className="w-3 h-3" />
            <span className="text-[10px]">K</span>
          </span>
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1856FF] to-[#8B5CF6] flex items-center justify-center text-xs font-medium">
          S
        </div>
      </motion.div>
    </header>
  );
}

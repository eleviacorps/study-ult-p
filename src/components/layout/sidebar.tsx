"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useVaultStore } from "@/stores/vault-store";
import {
  LayoutDashboard,
  BookOpen,
  HelpCircle,
  Layers,
  ClipboardList,
  BarChart3,
  Share2,
  Bot,
  Settings,
  ChevronLeft,
  ChevronRight,
  Atom,
} from "lucide-react";
import { cn } from "@/lib/cn";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reader", label: "Reader", icon: BookOpen },
  { href: "/questions", label: "Questions", icon: HelpCircle },
  { href: "/flashcards", label: "Flashcards", icon: Layers },
  { href: "/tests", label: "Mock Tests", icon: ClipboardList },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/graph", label: "Graph View", icon: Share2 },
  { href: "/tutor", label: "AI Tutor", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { vault } = useVaultStore();

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 260 }}
      transition={{ duration: 0.25, ease: [0.25, 0.4, 0.25, 1] }}
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col glass border-r-0 border-l-0 border-b-0 rounded-none overflow-hidden"
    >
      <div
        className={cn(
          "flex items-center h-16 px-4 border-b border-white/[0.04]",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-[#1856FF]/20 flex items-center justify-center">
                <Atom className="w-4.5 h-4.5 text-[#1856FF]" />
              </div>
              <span className="font-semibold text-sm tracking-tight">
                StudyUlt
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg glass-interactive text-white/40 hover:text-white/80 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group",
                isActive
                  ? "bg-white/[0.06] text-white border border-white/[0.08]"
                  : "text-white/50 hover:text-white hover:bg-white/[0.03] border border-transparent"
              )}
            >
              <item.icon
                className={cn(
                  "w-4.5 h-4.5 flex-shrink-0 transition-colors",
                  isActive ? "text-[#1856FF]" : "text-white/30 group-hover:text-white/60"
                )}
              />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      <AnimatePresence mode="wait">
        {!collapsed && vault?.chapters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/[0.04] p-3 max-h-48 overflow-y-auto"
          >
            <p className="text-[10px] uppercase tracking-wider text-white/25 mb-2 px-3">
              Chapters
            </p>
            <div className="space-y-0.5">
              {vault.chapters.slice(0, 8).map((ch) => (
                <Link
                  key={ch.name}
                  href={`/reader/${encodeURIComponent(ch.name)}`}
                  className="block px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.03] transition-colors truncate"
                >
                  {ch.name}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}

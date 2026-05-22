"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useVaultStore } from "@/stores/vault-store";
import {
  LayoutDashboard, BookOpen, HelpCircle, Layers, ClipboardList,
  BarChart3, Share2, Bot, Settings, ChevronLeft, ChevronRight,
  Atom, Menu, X, FileCheck, Play,
} from "lucide-react";
import { cn } from "@/lib/cn";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reader", label: "Reader", icon: BookOpen },
  { href: "/questions", label: "Questions", icon: HelpCircle },
  { href: "/flashcards", label: "Flashcards", icon: Layers },
  { href: "/tests", label: "Mock Tests", icon: ClipboardList },
  { href: "/quizzes", label: "Quizzes", icon: FileCheck },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/graph", label: "Graph View", icon: Share2 },
  { href: "/simulations", label: "Simulations", icon: Play },
  { href: "/tutor", label: "AI Tutor", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const { vault } = useVaultStore();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const sidebarWidth = isMobile ? 260 : collapsed ? 60 : 240;

  return (
    <>
      {!isMobile && (
        <div style={{ width: sidebarWidth, flexShrink: 0 }} />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-full z-30 flex flex-col",
          "bg-[var(--bg-surface)] border-r border-[var(--glass-border)]",
          isMobile ? (mobileOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0",
          "transition-transform duration-200"
        )}
        style={{ width: sidebarWidth }}
      >
        <div className="flex items-center h-14 px-4 border-b border-[var(--glass-border)] flex-shrink-0 justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#1856FF]/20 flex items-center justify-center flex-shrink-0">
              <Atom className="w-4 h-4 text-[#1856FF]" />
            </div>
            {(!collapsed || isMobile) && (
              <span className="font-semibold text-sm truncate">StudyUlt</span>
            )}
          </div>
          {isMobile ? (
            <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-md hover:bg-white/[0.05] opacity-40">
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-md hover:bg-white/[0.05] opacity-40 hidden lg:flex">
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors",
                  isActive
                    ? "bg-[#1856FF]/10 text-[#1856FF]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.03]"
                )}>
                <item.icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-[#1856FF]" : "opacity-40")} />
                {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {vault?.chapters && (!collapsed || isMobile) && (
          <div className="border-t border-[var(--glass-border)] p-2 max-h-40 overflow-y-auto flex-shrink-0">
            <p className="text-[10px] uppercase tracking-wider opacity-25 mb-1.5 px-3">Chapters</p>
            <div className="space-y-0.5">
              {vault.chapters.slice(0, 6).map((ch) => (
                <Link key={ch.name} href={`/reader/${encodeURIComponent(ch.name)}`}
                  className="block px-3 py-1 text-xs opacity-40 hover:opacity-70 hover:bg-white/[0.03] transition-colors truncate">
                  {ch.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </aside>

      {isMobile && mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-20" onClick={() => setMobileOpen(false)} />
      )}

      {isMobile && (
        <button onClick={() => setMobileOpen(true)}
          className="fixed top-2.5 left-2.5 z-40 lg:hidden p-2 glass rounded-xl opacity-60">
          <Menu className="w-5 h-5" />
        </button>
      )}
    </>
  );
}

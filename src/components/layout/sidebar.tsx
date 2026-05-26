"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useVaultStore } from "@/stores/vault-store";
import {
  LayoutDashboard, BookOpen, HelpCircle, Layers, ClipboardList,
  BarChart3, Share2, Bot, Settings, ChevronLeft, ChevronRight,
  Atom, Menu, X, FileCheck, Play, Wand2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { motion, AnimatePresence } from "framer-motion";

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
  { href: "/note-agent", label: "Note Agent", icon: Wand2 },
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

  const sidebarWidth = collapsed ? 60 : 240;

  const panel = (
    <div className={cn(
      "flex flex-col h-full",
      "bg-black/30 backdrop-blur-xl border border-white/10",
      "shadow-[0_0_40px_rgba(24,86,255,0.06)]",
      isMobile ? "rounded-r-3xl" : "rounded-3xl"
    )}>
      <div className="flex items-center h-14 px-4 border-b border-white/[0.06] flex-shrink-0 justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1856FF] to-[#8B5CF6] flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(24,86,255,0.2)]">
            <Atom className="w-4 h-4 text-white" />
          </div>
          {(!collapsed || isMobile) && (
            <span className="font-semibold text-sm">StudyUlt</span>
          )}
        </div>
        {isMobile ? (
          <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-xl hover:bg-white/5 opacity-40 hover:opacity-70 transition-all">
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-xl hover:bg-white/5 opacity-40 hover:opacity-70 transition-all hidden lg:flex">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-[13px] rounded-2xl transition-all duration-200 group",
                isActive
                  ? "bg-[#1856FF]/15 text-[#1856FF] shadow-[0_0_20px_rgba(24,86,255,0.1)]"
                  : "text-white/40 hover:text-white/80 hover:bg-white/[0.04]"
              )}>
              <item.icon className={cn("w-4 h-4 flex-shrink-0 transition-all duration-200",
                isActive ? "text-[#1856FF]" : "opacity-50 group-hover:opacity-80"
              )} />
              {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {vault?.chapters && (!collapsed || isMobile) && (
        <div className="border-t border-white/[0.06] p-3 max-h-40 overflow-y-auto flex-shrink-0">
          <p className="text-[10px] uppercase tracking-widest opacity-30 mb-2 px-3 font-medium">Chapters</p>
          <div className="space-y-0.5">
            {vault.chapters.slice(0, 6).map((ch) => (
              <Link key={ch.name} href={`/reader/${encodeURIComponent(ch.name)}`}
                className="block px-3 py-1.5 text-xs opacity-40 hover:opacity-70 hover:bg-white/[0.03] transition-all rounded-xl truncate">
                {ch.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {!isMobile && (
        <div style={{ width: sidebarWidth + 16, flexShrink: 0 }} />
      )}

      {!isMobile && (
        <aside className="fixed left-2 top-2 bottom-2 z-30" style={{ width: sidebarWidth }}>
          {panel}
        </aside>
      )}

      <AnimatePresence>
        {isMobile && mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {isMobile && (
        <aside className={cn(
          "fixed top-0 left-0 h-full z-50 transition-transform duration-300 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ width: "85vw", maxWidth: "320px" }}>
          {panel}
        </aside>
      )}

      {isMobile && !mobileOpen && (
        <button onClick={() => setMobileOpen(true)}
          className="fixed top-2.5 left-2.5 z-30 lg:hidden p-2.5 rounded-2xl bg-black/30 backdrop-blur-xl border border-white/10 shadow-lg opacity-70 hover:opacity-100 transition-all">
          <Menu className="w-5 h-5" />
        </button>
      )}
    </>
  );
}

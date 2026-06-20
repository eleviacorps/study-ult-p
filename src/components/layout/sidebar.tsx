"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useVaultStore } from "@/stores/vault-store";
import {
  LayoutDashboard, BookOpen, HelpCircle, Layers, ClipboardList,
  BarChart3, Share2, Bot, Settings, ChevronLeft, ChevronRight,
  Menu, X, FileCheck, Play, Wand2, UserRound, Database,
  User, LogOut, ChevronDown, Activity,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

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
  { href: "/note-agent?tab=vault", label: "Vault Bank", icon: Database },
  { href: "/roc2", label: "ROC2", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

const mobilePrimaryNav = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/reader", label: "Reader", icon: BookOpen },
  { type: "menu", label: "Menu", icon: Menu },
  { href: "/tutor", label: "Tutor", icon: Bot },
  { href: "/settings", label: "Profile", icon: UserRound },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [profile, setProfile] = useState<{ name?: string; avatar_url?: string; username?: string; role?: string } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAclose, setIsAclose] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { vault } = useVaultStore();
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-mobile", isMobile ? "true" : "false");
  }, [isMobile]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: any } }) => {
      if (!user) return;
      fetch("/api/profile")
        .then((r) => r.ok ? r.json() : null)
        .then((d) => {
          if (d?.id) {
            setProfile(d);
            setIsAdmin(d.role === "admin");
            setIsAclose(d.role === "aclose");
          }
        })
        .catch(() => {});
    });
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const sidebarWidth = collapsed ? 60 : 240;

  const panel = (
    <div className={cn(
      "flex flex-col h-full",
      "bg-[#09090B] border border-white/[0.06]",
      isMobile ? "rounded-r-3xl" : "rounded-3xl"
    )}>
      <div className="flex items-center h-14 px-4 border-b border-white/[0.06] flex-shrink-0 justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img src="/app-logo.png" alt="StudyUlt" className="w-full h-full object-cover" />
          </div>
          {(!collapsed || isMobile) && (
            <span className="font-semibold text-sm text-white/80">StudyUlt</span>
          )}
        </div>
        {isMobile ? (
          <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-xl hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-all">
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-xl hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-all hidden lg:flex">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 bg-[#09090B]">
        {navItems.filter((item) => {
          if (item.href === "/roc2") return isAdmin;
          if (item.href === "/note-agent?tab=vault") return isAdmin || isAclose;
          return true;
        }).map((item) => {
          const [pathPart, queryPart] = item.href.split("?");
          const isActive = pathname === pathPart && (
            !queryPart
              ? true
              : typeof window !== "undefined" && window.location.search.includes(queryPart)
          ) || (pathPart && pathname?.startsWith(pathPart + "/"));
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-[13px] rounded-2xl transition-all duration-200 group",
                isActive
                  ? "bg-[#1856FF]/15 text-[#1856FF] shadow-[0_0_20px_rgba(24,86,255,0.1)]"
                  : "text-[var(--text-primary)]/40 hover:text-[var(--text-primary)]/80 hover:bg-[var(--glass-light)]"
              )}>
              <item.icon className={cn("w-4 h-4 flex-shrink-0 transition-all duration-200",
                isActive ? "text-[#1856FF]" : "text-[var(--text-primary)]/40 group-hover:text-[var(--text-primary)]/80"
              )} />
              {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {vault?.chapters && (!collapsed || isMobile) && (
        <div className="border-t border-white/[0.06] p-3 max-h-40 overflow-y-auto flex-shrink-0 bg-[#09090B]">
          <p className="text-[10px] uppercase tracking-widest text-[var(--text-primary)]/30 mb-2 px-3 font-medium">Chapters</p>
          <div className="space-y-0.5">
            {vault.chapters.slice(0, 6).map((ch) => (
              <Link key={ch.name} href={`/reader/${encodeURIComponent(ch.name)}`}
                className="block px-3 py-1.5 text-xs text-[var(--text-primary)]/40 hover:text-[var(--text-primary)]/70 hover:bg-[var(--glass-light)] transition-all rounded-xl truncate">
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

      {isMobile && (
        <nav className="fixed inset-x-3 bottom-3 z-30 rounded-[28px] border border-white/[0.08] bg-[#05060A]/92 px-2 py-2 shadow-[0_16px_48px_rgba(0,0,0,0.58)] backdrop-blur-2xl pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
          <div className="grid grid-cols-5 gap-1">
            {mobilePrimaryNav.map((item) => {
              if (item.type === "menu") {
                return (
                  <button
                    key="menu"
                    onClick={() => setMobileOpen(true)}
                    className="min-h-12 rounded-2xl flex flex-col items-center justify-center gap-1 text-[10px] transition-colors text-[var(--text-primary)]/45 active:bg-[var(--glass-light)]"
                  >
                    <Menu className="w-[18px] h-[18px] text-[var(--text-primary)]/50" />
                    <span className="leading-none">Menu</span>
                  </button>
                );
              }
              if (item.label === "Profile") {
                return (
                  <div key="profile" className="relative" ref={profileRef}>
                    <button
                      onClick={() => setProfileOpen(!profileOpen)}
                      className="min-h-12 w-full rounded-2xl flex flex-col items-center justify-center gap-1 text-[10px] transition-colors text-[var(--text-primary)]/45 active:bg-[var(--glass-light)]"
                    >
                      <div className="w-[18px] h-[18px] rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-[7px] font-medium text-white overflow-hidden">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          profile?.name?.charAt(0)?.toUpperCase() || "S"
                        )}
                      </div>
                      <span className="leading-none">Profile</span>
                    </button>
                    <AnimatePresence>
                      {profileOpen && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 4 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          className="absolute right-0 bottom-full mb-2 w-48 bg-[var(--glass-dropdown)] border border-[var(--glass-border-strong)] rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.3)] overflow-hidden z-50"
                        >
                          {profile?.name && (
                            <div className="px-3 py-2.5 border-b border-[var(--glass-border)]">
                              <p className="text-xs font-medium text-[var(--text-primary)] truncate">{profile.name}</p>
                              {profile.username && (
                                <p className="text-[10px] text-[var(--text-primary)]/40 truncate">@{profile.username}</p>
                              )}
                            </div>
                          )}
                          <div className="p-1.5">
                            <button
                              onClick={() => { setProfileOpen(false); router.push("/settings/profile"); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[var(--text-primary)]/70 hover:text-[var(--text-primary)] hover:bg-[var(--glass-light)] transition-all text-left"
                            >
                              <User className="w-3.5 h-3.5 text-[var(--text-primary)]/40" />
                              Edit Profile
                            </button>
                            <button
                              onClick={() => { setProfileOpen(false); router.push("/settings"); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[var(--text-primary)]/70 hover:text-[var(--text-primary)] hover:bg-[var(--glass-light)] transition-all text-left"
                            >
                              <Settings className="w-3.5 h-3.5 text-[var(--text-primary)]/40" />
                              Settings
                            </button>
                            <button
                              onClick={async () => { const supabase = createClient(); await supabase.auth.signOut(); router.push("/login"); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#EF4444]/80 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all text-left mt-0.5 border-t border-[var(--glass-border)] pt-2.5"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              Sign Out
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }
              const link = item as { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
              const isActive = pathname === link.href || pathname?.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "min-h-12 rounded-2xl flex flex-col items-center justify-center gap-1 text-[10px] transition-colors",
                    isActive
                      ? "bg-[#1856FF]/18 text-[#1856FF] shadow-[0_0_24px_rgba(24,86,255,0.14)]"
                      : "text-[var(--text-primary)]/45 active:bg-[var(--glass-light)]"
                  )}
                >
                  <link.icon className={cn("w-[18px] h-[18px]", isActive ? "text-[#1856FF]" : "text-[var(--text-primary)]/50")} />
                  <span className="leading-none">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Settings, LogOut, User, ChevronDown } from "lucide-react";
import { useThemeStore } from "@/stores/theme-store";
import { GlobalSearch } from "@/components/global-search";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface HeaderProps {
  title?: string;
  breadcrumbs?: { label: string; href: string }[];
}

export function Header({ title, breadcrumbs }: HeaderProps) {
  const router = useRouter();
  const { theme, toggle } = useThemeStore();
  const [profile, setProfile] = useState<{ name?: string; avatar_url?: string; username?: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      fetch("/api/profile")
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d?.id) setProfile(d); })
        .catch(() => {});
    });
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const initial = profile?.name?.charAt(0)?.toUpperCase() || "S";

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="top-nav-header sticky top-2 z-20 mx-2 sm:mx-4 rounded-2xl bg-[var(--glass-panel)] backdrop-blur-xl border border-[var(--glass-border-strong)] shadow-[0_0_30px_rgba(24,86,255,0.04)] h-14 flex items-center justify-between px-3 sm:px-5">
      <div className="flex items-center gap-3 min-w-0 overflow-hidden">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <div className="flex items-center gap-1.5 text-sm truncate min-w-0">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-1.5 truncate min-w-0">
                {i > 0 && <span className="text-[var(--text-primary)]/15 shrink-0">/</span>}
                <span className={cn("truncate", i === breadcrumbs.length - 1 ? "text-[var(--text-primary)]/80" : "text-[var(--text-primary)]/35")}>
                  {crumb.label}
                </span>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        <GlobalSearch />

        <button
          onClick={toggle}
          className="p-2 rounded-xl hover:bg-[var(--glass-light)] transition-all text-[var(--text-primary)]/60 hover:text-[var(--text-primary)]"
          title={`Switch to ${theme === "dark" ? "cream" : "dark"} theme`}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1 p-1 rounded-xl hover:bg-[var(--glass-light)] transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1856FF] to-[#8B5CF6] flex items-center justify-center text-[10px] font-medium text-white overflow-hidden shadow-[0_0_12px_rgba(24,86,255,0.2)]">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <ChevronDown className={cn("w-3 h-3 text-[var(--text-primary)]/40 transition-transform", menuOpen && "rotate-180")} />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 top-full mt-2 w-48 bg-[var(--glass-dropdown)] border border-[var(--glass-border-strong)] rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.3)] overflow-hidden z-50"
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
                    onClick={() => { setMenuOpen(false); router.push("/settings/profile"); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[var(--text-primary)]/70 hover:text-[var(--text-primary)] hover:bg-[var(--glass-light)] transition-all text-left"
                  >
                    <User className="w-3.5 h-3.5 text-[var(--text-primary)]/40" />
                    Edit Profile
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); router.push("/settings"); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[var(--text-primary)]/70 hover:text-[var(--text-primary)] hover:bg-[var(--glass-light)] transition-all text-left"
                  >
                    <Settings className="w-3.5 h-3.5 text-[var(--text-primary)]/40" />
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
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
      </div>
    </header>
  );
}

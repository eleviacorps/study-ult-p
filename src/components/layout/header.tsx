"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
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

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1 p-1 rounded-xl glass-interactive"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1856FF] to-[#8B5CF6] flex items-center justify-center text-[10px] font-medium text-white overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <ChevronDown className="w-3 h-3 opacity-40" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 glass p-2 rounded-2xl border border-white/[0.08] shadow-xl z-30">
              {profile?.name && (
                <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                  <p className="text-xs font-medium">{profile.name}</p>
                  {profile.username && (
                    <p className="text-[10px] opacity-40">@{profile.username}</p>
                  )}
                </div>
              )}
              <button
                onClick={() => { setMenuOpen(false); router.push("/settings/profile"); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs hover:bg-white/[0.04] transition-colors text-left"
              >
                <User className="w-3.5 h-3.5 opacity-40" />
                Edit Profile
              </button>
              <button
                onClick={() => { setMenuOpen(false); router.push("/settings"); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs hover:bg-white/[0.04] transition-colors text-left"
              >
                <Settings className="w-3.5 h-3.5 opacity-40" />
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs hover:bg-[#EF4444]/10 text-[#EF4444] transition-colors text-left mt-1 border-t border-white/[0.06] pt-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </header>
  );
}

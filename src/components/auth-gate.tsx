"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/layout/sidebar";
import { Loader2 } from "lucide-react";

const PUBLIC_ROUTES = ["/login", "/auth/callback"];
const SHELLLESS_ROUTES = ["/login", "/auth/callback", "/onboarding"];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<"loading" | "authed" | "public">("loading");

  useEffect(() => {
    const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
    const isOnboarding = pathname.startsWith("/onboarding");

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setStatus("authed");
      return;
    }

    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        if (!isPublic) {
          try {
            const res = await fetch("/api/profile");
            const profile = res.ok ? await res.json() : null;
            if (!profile?.onboarding_completed && !isOnboarding) {
              window.location.replace("/onboarding");
              return;
            }
            if (profile?.onboarding_completed && isOnboarding) {
              window.location.replace("/dashboard");
              return;
            }
          } catch {}
        }
        setStatus(isPublic ? "public" : "authed");
      } else if (isPublic) {
        setStatus("public");
      } else {
        window.location.replace("/login");
      }
    }

    check().catch(() => {
      setStatus(isPublic ? "public" : "authed");
    });
  }, [pathname]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <Loader2 className="w-6 h-6 animate-spin opacity-30" />
      </div>
    );
  }

  const shellless = SHELLLESS_ROUTES.some((route) => pathname.startsWith(route));

  if (status === "public" || shellless) {
    return <main className="flex-1 min-h-screen relative z-0 overflow-x-hidden min-w-0">{children}</main>;
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 min-h-screen relative z-0 overflow-x-hidden min-w-0 pb-24 lg:pb-0">{children}</main>
    </>
  );
}

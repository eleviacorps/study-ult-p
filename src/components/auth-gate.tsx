"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/layout/sidebar";
import { Loader2 } from "lucide-react";

const PUBLIC_ROUTES = ["/login", "/auth/callback"];

function isNative(): boolean {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<"loading" | "authed" | "public">("loading");

  useEffect(() => {
    const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setStatus("authed");
      return;
    }

    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
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

  // Android deep link handler
  useEffect(() => {
    if (!isNative()) return;

    let terminated = false;
    let handle: { remove: () => void } | null = null;

    async function init() {
      try {
        await new Promise((r) => setTimeout(r, 300));
        if (terminated) return;

        const { App } = await import("@capacitor/app");
        if (terminated) return;

        const listener = await App.addListener("appUrlOpen", async (event: { url: string }) => {
          try {
            const url = new URL(event.url);
            if (url.pathname === "/auth/callback" || url.host === "auth") {
              const code = url.searchParams.get("code");
              if (code) {
                const supabase = createClient();
                await supabase.auth.exchangeCodeForSession(code);
                window.location.href = "/dashboard";
              }
            }
          } catch (err) {
            console.error("Deep link handler error:", err);
          }
        });
        handle = { remove: () => listener.remove() };
      } catch (err) {
        console.error("Capacitor App plugin init failed:", err);
      }
    }

    init();
    return () => {
      terminated = true;
      handle?.remove();
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <Loader2 className="w-6 h-6 animate-spin opacity-30" />
      </div>
    );
  }

  if (status === "public") {
    return <main className="flex-1 min-h-screen relative z-0 overflow-x-hidden min-w-0">{children}</main>;
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 min-h-screen relative z-0 overflow-x-hidden min-w-0">{children}</main>
    </>
  );
}

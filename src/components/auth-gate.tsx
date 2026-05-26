"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/layout/sidebar";
import { Loader2 } from "lucide-react";

declare const Capacitor: any | undefined;

const PUBLIC_ROUTES = ["/login", "/auth/callback"];

function isNative(): boolean {
  try { return typeof Capacitor !== "undefined"; } catch { return false; }
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "authed" | "public" | "unauthed">("loading");
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setStatus("authed");
      done.current = true;
      return;
    }

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setStatus(isPublic ? "public" : "authed");
      } else {
        if (isPublic) {
          setStatus("public");
        } else {
          setStatus("unauthed");
          router.replace("/login");
        }
      }
      done.current = true;
    });
  }, [pathname, router]);

  // Android deep link handler — captures OAuth callback from system browser
  useEffect(() => {
    if (!isNative()) return;

    let handle: { remove: () => void } | null = null;

    async function init() {
      const { App } = await import("@capacitor/app");
      const listener = await App.addListener("appUrlOpen", async (event) => {
        const url = new URL(event.url);

        if (url.pathname === "/auth/callback" || url.host === "auth") {
          const code = url.searchParams.get("code");
          if (code) {
            const supabase = createClient();
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error) {
              window.location.href = "/dashboard";
            }
          }
        }
      });
      handle = { remove: () => listener.remove() };
    }

    init();
    return () => { handle?.remove(); };
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <Loader2 className="w-6 h-6 animate-spin opacity-30" />
      </div>
    );
  }

  if (status === "unauthed") return null;

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

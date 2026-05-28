"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/layout/sidebar";
import { SplashScreen } from "@/components/splash-screen";

const PUBLIC_ROUTES = ["/login", "/auth/callback"];
const SHELLLESS_ROUTES = ["/login", "/auth/callback", "/onboarding"];
const MIN_SPLASH_MS = 2000;

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<"loading" | "authed" | "public">("loading");
  const [splashDone, setSplashDone] = useState(false);
  const splashStart = useRef<number | null>(null);

  useEffect(() => {
    if (!splashStart.current) splashStart.current = Date.now();
    const remaining = Math.max(0, MIN_SPLASH_MS - (Date.now() - splashStart.current));
    const t = setTimeout(() => setSplashDone(true), remaining);
    return () => clearTimeout(t);
  }, []);

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
            const { data: profile } = await supabase
              .from("profiles")
              .select("onboarding_completed")
              .eq("id", user.id)
              .maybeSingle();
            const onboarded = profile?.onboarding_completed === true;
            if (!onboarded && !isOnboarding) {
              window.location.replace("/onboarding");
              return;
            }
            if (onboarded && isOnboarding) {
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

    check();
  }, [pathname]);

  return (
    <>
      <AnimatePresence mode="wait">
        {(!splashDone || status === "loading") && <SplashScreen key="splash" />}
      </AnimatePresence>

      {splashDone && status !== "loading" && (
        <motion.div
          key="app"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="contents"
        >
          {(() => {
            const shellless = SHELLLESS_ROUTES.some((route) => pathname.startsWith(route));
            if (status === "public" || shellless) {
              return <main className="flex-1 min-h-screen relative z-0 overflow-x-hidden min-w-0">{children}</main>;
            }
            return (
              <>
                <Sidebar />
                <main className="flex-1 min-h-screen relative z-0 overflow-x-hidden min-w-0">{children}</main>
              </>
            );
          })()}
        </motion.div>
      )}
    </>
  );
}

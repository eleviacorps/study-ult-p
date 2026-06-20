"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signInWithGoogle, isNative } from "@/lib/native-auth";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: any } }) => {
      if (user) router.replace("/dashboard");
    }).finally(() => setLoading(false));
  }, [router]);

  const signIn = async () => {
    setLoading(true);
    setError("");

    if (isNative()) {
      const { error } = await signInWithGoogle();
      if (error) { setError(error); setLoading(false); return; }
      await new Promise(r => setTimeout(r, 500));
      router.replace("/dashboard");
      router.refresh();
      return;
    }

    const supabase = createClient();
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${location.origin}/auth/callback`,
        },
      });
      if (error) { setError(error.message); setLoading(false); return; }
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      setError(e?.message || "Sign in failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-[var(--glass-panel)] backdrop-blur-xl border border-[var(--glass-border-strong)] rounded-3xl p-8 sm:p-10 max-w-sm w-full text-center shadow-[0_0_40px_rgba(24,86,255,0.06)]">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 overflow-hidden">
          <img src="/app-logo.png" alt="StudyUlt" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-xl font-bold mb-1">StudyUlt</h1>
        <p className="text-sm opacity-40 mb-8">Sign in to sync your progress</p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-xs text-[#EF4444]/80">
            {error}
          </div>
        )}

        <button
          onClick={signIn}
          disabled={loading}
          className="w-full py-3 rounded-2xl bg-[var(--glass-light)] hover:bg-[var(--glass-medium)] backdrop-blur-sm border border-[var(--glass-border-strong)] text-[var(--text-primary)] text-sm font-medium flex items-center justify-center gap-3 transition-all disabled:opacity-30"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          Sign in with Google
        </button>

        <p className="mt-6 text-[10px] opacity-30">
          Your progress syncs across devices when signed in
        </p>
      </div>
    </div>
  );
}

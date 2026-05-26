import { Capacitor } from "@capacitor/core";
import { createClient } from "@/lib/supabase/client";

let initialized = false;

export function isNative(): boolean {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

export async function signInWithGoogle(): Promise<{ error?: string }> {
  try {
    const { GoogleSignIn } = await import("@capawesome/capacitor-google-sign-in");

    if (!initialized) {
      const clientId = (process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID || "").trim();
      if (!clientId) return { error: "Google Sign-In is not configured" };
      await GoogleSignIn.initialize({ clientId, scopes: ["openid", "email", "profile"] });
      initialized = true;
    }

    const result = await GoogleSignIn.signIn();
    if (!result.idToken) return { error: "Failed to get ID token" };

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: result.idToken,
    });

    if (error) return { error: error.message };
    return {};
  } catch (e: any) {
    if (e?.message === "USER_CANCELLED" || e?.code === "SIGN_IN_CANCELED") return {};
    return { error: e?.message || "Sign in failed" };
  }
}

export async function signOut(): Promise<void> {
  try {
    const { GoogleSignIn } = await import("@capawesome/capacitor-google-sign-in");
    await GoogleSignIn.signOut();
  } catch {
    // ignore
  }
}

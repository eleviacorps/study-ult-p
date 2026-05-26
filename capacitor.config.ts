import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.studyult.app",
  appName: "StudyUlt",
  webDir: "capacitor-public",
  server: {
    url: "https://study-ult-p.vercel.app",
    cleartext: true,
    allowNavigation: ["study-ult-p.vercel.app", "*.vercel.app", "accounts.google.com", "google.com", "*.google.com", "ysfmppybkccqkieielej.supabase.co", "*.supabase.co"],
  },
} as any;

export default config;

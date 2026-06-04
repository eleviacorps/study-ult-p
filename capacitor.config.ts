import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.studyult.app",
  appName: "StudyUlt",
  webDir: "capacitor-public",
  server: {
    url: "https://evstudy.vercel.app",
    cleartext: true,
    allowNavigation: ["evstudy.vercel.app", "*.vercel.app"],
  },
} as any;

export default config;

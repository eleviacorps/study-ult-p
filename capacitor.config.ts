import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.studyult.app",
  appName: "StudyUlt",
  webDir: "capacitor-public",
  server: {
    url: "https://study-ult-p.vercel.app",
    cleartext: true,
    allowNavigation: ["study-ult-p.vercel.app", "*.vercel.app"],
  },
} as any;

export default config;

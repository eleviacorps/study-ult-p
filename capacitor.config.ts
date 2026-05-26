import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.studyult.app",
  appName: "StudyUlt",
  webDir: ".next",
  server: {
    url: "https://study-ult-p.vercel.app",
    cleartext: true,
  },
} as any;

export default config;

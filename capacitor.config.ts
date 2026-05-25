import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.studyult.app",
  appName: "StudyUlt",
  webDir: "out",
} as any;

(config as any).CapacitorHttp = { enabled: true };

export default config;

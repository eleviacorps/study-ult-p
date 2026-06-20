import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GalaxyBackground } from "@/components/galaxy-background";
import { VaultLoader } from "@/components/layout/vault-loader";
import { LlmProvider } from "@/lib/llm-context";
import { AuthGate } from "@/components/auth-gate";
import { ErrorBoundary } from "@/components/error-boundary";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import dynamic from "next/dynamic";

const VoiceTutorButton = dynamic(
  () => import("@/components/voice-tutor/voice-tutor-button").then((m) => ({ default: m.VoiceTutorButton })),
  { ssr: false }
);

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StudyUlt — AI Educational OS",
  description:
    "Premium AI-powered JEE preparation platform with Obsidian vault integration, interactive flashcards, mock tests, and knowledge graphs.",
  icons: {
    icon: "/app-logo.png",
    apple: "/app-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      style={{ backgroundColor: "#09090B" }}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex relative" style={{ backgroundColor: "#09090B" }}>
        <GalaxyBackground />
        <ServiceWorkerRegister />
        <ErrorBoundary>
          <LlmProvider>
            <VaultLoader />
            <AuthGate>
              {children}
              <VoiceTutorButton />
            </AuthGate>
          </LlmProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

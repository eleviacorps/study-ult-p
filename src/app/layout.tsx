import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GalaxyBackground } from "@/components/galaxy-background";
import { VaultLoader } from "@/components/layout/vault-loader";
import { LlmProvider } from "@/lib/llm-context";
import { AuthGate } from "@/components/auth-gate";
import { ErrorBoundary } from "@/components/error-boundary";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex relative">
        <GalaxyBackground />
        <ErrorBoundary>
          <LlmProvider>
            <VaultLoader />
            <AuthGate>
              {children}
            </AuthGate>
          </LlmProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

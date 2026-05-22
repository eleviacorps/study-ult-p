import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { VaultLoader } from "@/components/layout/vault-loader";

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
  description: "Premium AI-powered JEE preparation platform with Obsidian vault integration, interactive flashcards, mock tests, and knowledge graphs.",
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
      style={{ colorScheme: "dark" }}
    >
      <body className="min-h-full flex relative">
        <VaultLoader />
        <Sidebar />
        <main className="flex-1 ml-[260px] min-h-screen relative z-10">
          {children}
        </main>
      </body>
    </html>
  );
}

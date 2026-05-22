"use client";

import { Header } from "@/components/layout/header";
import { useThemeStore } from "@/stores/theme-store";
import { Settings, Database, Bot, Eye, Bell, Shield, Palette, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/cn";

export default function SettingsPage() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="min-h-screen">
      <Header title="Settings" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-sm opacity-40 mb-8" style={{ color: "var(--text-muted)" }}>
          Configure your study environment
        </p>

        <div className="space-y-4">
          <div className="glass glass-interactive p-5">
            <div className="flex items-center gap-4">
              <Palette className="w-4.5 h-4.5" style={{ color: "var(--text-muted)" }} />
              <div className="flex-1">
                <h3 className="text-sm font-medium">Theme</h3>
                <p className="text-xs opacity-50" style={{ color: "var(--text-muted)" }}>
                  Switch between dark and cream themes
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04]">
                <button
                  onClick={() => setTheme("dark")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all",
                    theme === "dark"
                      ? "bg-[#1856FF]/15 text-[#1856FF]"
                      : "opacity-30 hover:opacity-60"
                  )}
                >
                  <Moon className="w-3.5 h-3.5" />
                  Dark
                </button>
                <button
                  onClick={() => setTheme("cream")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all",
                    theme === "cream"
                      ? "bg-[#F59E0B]/15 text-[#D97706]"
                      : "opacity-30 hover:opacity-60"
                  )}
                >
                  <Sun className="w-3.5 h-3.5" />
                  Cream
                </button>
              </div>
            </div>
          </div>

          {[
            {
              icon: Database,
              label: "Vault Path",
              desc: "PhysicsCh1/ — Physics knowledge vault",
              action: "Change",
            },
            {
              icon: Bot,
              label: "AI Provider",
              desc: "Configure Ollama, LM Studio, or OpenRouter in AI Tutor",
              action: "Open Tutor",
            },
            {
              icon: Bell,
              label: "Study Goals",
              desc: "Set daily study targets and reminders",
              action: "Configure",
            },
            {
              icon: Shield,
              label: "Data",
              desc: "Export or import your study progress and settings",
              action: "Manage",
            },
          ].map((setting) => (
            <div
              key={setting.label}
              className="glass glass-interactive p-5 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                <setting.icon className="w-4.5 h-4.5" style={{ color: "var(--text-muted)" }} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium">{setting.label}</h3>
                <p className="text-xs opacity-50" style={{ color: "var(--text-muted)" }}>
                  {setting.desc}
                </p>
              </div>
              <button
                className="text-xs text-[#1856FF] hover:opacity-80 transition-opacity px-3 py-1.5 rounded-lg bg-[#1856FF]/10 hover:bg-[#1856FF]/20"
              >
                {setting.action}
              </button>
            </div>
          ))}

          <div className="glass p-5">
            <h3 className="text-sm font-medium mb-3">About StudyUlt</h3>
            <div className="space-y-2 text-xs opacity-50" style={{ color: "var(--text-muted)" }}>
              <p>Version 1.0 — Premium AI Educational OS</p>
              <p>Powered by Next.js 15, React 19, Tailwind CSS, Framer Motion</p>
              <p>Vault: PhysicsCh1/ (3 chapters, 26 notes, 427 questions, 244 flashcards)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

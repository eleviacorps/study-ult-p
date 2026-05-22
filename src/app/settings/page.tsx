"use client";

import { Header } from "@/components/layout/header";
import { Settings, Database, Bot, Eye, Bell, Shield } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="min-h-screen">
      <Header title="Settings" />
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-sm text-white/35 mb-8">
          Configure your study environment
        </p>

        <div className="space-y-4">
          {[
            {
              icon: Database,
              label: "Vault Path",
              desc: "PhysicsCh1/",
              action: "Change",
            },
            {
              icon: Bot,
              label: "AI Provider",
              desc: "Configure Ollama, LM Studio, or OpenRouter",
              action: "Setup",
            },
            {
              icon: Eye,
              label: "Appearance",
              desc: "Dark theme (more themes coming soon)",
              action: "Customize",
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
              desc: "Export or import your study data",
              action: "Manage",
            },
          ].map((setting, i) => (
            <div
              key={setting.label}
              className="glass glass-interactive p-5 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                <setting.icon className="w-4.5 h-4.5 text-white/30" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium">{setting.label}</h3>
                <p className="text-xs text-white/25">{setting.desc}</p>
              </div>
              <button className="text-xs text-[#1856FF] hover:text-[#06B6D4] transition-colors px-3 py-1.5 rounded-lg bg-[#1856FF]/10 hover:bg-[#1856FF]/20">
                {setting.action}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

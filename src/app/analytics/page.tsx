"use client";

import { motion } from "framer-motion";
import { useVaultStore } from "@/stores/vault-store";
import { Header } from "@/components/layout/header";
import { cn } from "@/lib/cn";
import {
  BarChart3,
  Target,
  TrendingUp,
  Brain,
  Clock,
  AlertTriangle,
  Zap,
} from "lucide-react";

export default function AnalyticsPage() {
  const { vault, isLoaded } = useVaultStore();

  const metrics = [
    { label: "Overall Accuracy", value: "72%", change: "+3%", icon: Target, color: "#1856FF" },
    { label: "Questions Solved", value: "186", change: "+24 this week", icon: Zap, color: "#8B5CF6" },
    { label: "Study Hours", value: "24.5h", change: "This month", icon: Clock, color: "#06B6D4" },
    { label: "Flashcards Reviewed", value: "93", change: "35% mastered", icon: Brain, color: "#10B981" },
  ];

  return (
    <div className="min-h-screen">
      <Header title="Analytics" />
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Analytics</h1>
        <p className="text-sm text-white/35 mb-8">
          Deep insights into your study patterns
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${m.color}15` }}
                >
                  <m.icon className="w-4 h-4" style={{ color: m.color }} />
                </div>
                <span className="text-[10px] text-white/30">{m.label}</span>
              </div>
              <p className="text-2xl font-bold">{m.value}</p>
              <p className="text-[10px] text-white/25 mt-1">{m.change}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className="glass p-6">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-[#1856FF]" />
              Chapter Mastery
            </h3>
            <div className="space-y-3">
              {[
                { name: "Coulomb's Law", value: 85 },
                { name: "Electric Field", value: 72 },
                { name: "Gauss's Law", value: 45 },
                { name: "Electric Dipole", value: 58 },
                { name: "Dimensional Analysis", value: 68 },
              ].map((item) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/50">{item.name}</span>
                    <span className="text-[10px] text-white/30">{item.value}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        item.value >= 80
                          ? "bg-[#10B981]"
                          : item.value >= 60
                          ? "bg-[#06B6D4]"
                          : item.value >= 40
                          ? "bg-[#F59E0B]"
                          : "bg-[#EF4444]"
                      )}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass p-6">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-[#F97316]" />
              Mistake Patterns
            </h3>
            <div className="space-y-3">
              {[
                { pattern: "Unit conversion errors", freq: "24%", severity: "high" },
                { pattern: "Sign mistakes in vector addition", freq: "18%", severity: "medium" },
                { pattern: "Formula misapplication", freq: "15%", severity: "high" },
                { pattern: "Missing squaring in Coulomb's law", freq: "12%", severity: "medium" },
                { pattern: "Incorrect limit application", freq: "8%", severity: "low" },
              ].map((item) => (
                <div
                  key={item.pattern}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02]"
                >
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      item.severity === "high"
                        ? "bg-[#EF4444]"
                        : item.severity === "medium"
                        ? "bg-[#F59E0B]"
                        : "bg-[#06B6D4]"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{item.pattern}</p>
                  </div>
                  <span className="text-[10px] text-white/25">{item.freq}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass p-6">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[#10B981]" />
            Weekly Progress
          </h3>
          <div className="flex items-end gap-3 h-32">
            {[35, 42, 28, 55, 48, 62, 72].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-[10px] text-white/30">{h}%</span>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-[#1856FF]/30 to-[#06B6D4]/30"
                  style={{ height: `${h}%` }}
                />
                <span className="text-[10px] text-white/20">
                  {["M", "T", "W", "T", "F", "S", "S"][i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import type { VaultContent } from "@/types";
import { animations } from "@/lib/design-system";
import {
  Flame,
  Clock,
  BookOpen,
  Target,
  Zap,
  Brain,
  TrendingUp,
  AlertCircle,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface DashboardWidgetsProps {
  vault: VaultContent;
}

function WidgetCard({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={cn(
        "glass p-5 flex flex-col gap-3 group transition-all duration-300",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

function GlowDot({ color = "primary" }: { color?: "primary" | "emerald" | "amber" | "purple" | "cyan" }) {
  const colors = {
    primary: "bg-[#1856FF] shadow-[0_0_12px_rgba(24,86,255,0.5)]",
    emerald: "bg-[#10B981] shadow-[0_0_12px_rgba(16,185,129,0.5)]",
    amber: "bg-[#F59E0B] shadow-[0_0_12px_rgba(245,158,11,0.5)]",
    purple: "bg-[#8B5CF6] shadow-[0_0_12px_rgba(139,92,246,0.5)]",
    cyan: "bg-[#06B6D4] shadow-[0_0_12px_rgba(6,182,212,0.5)]",
  };
  return <div className={cn("w-2 h-2 rounded-full", colors[color])} />;
}

export function DashboardWidgets({ vault }: DashboardWidgetsProps) {
  const totalNotes = vault.notes.length;
  const totalQuestions = vault.questions.length;
  const totalFlashcards = vault.flashcards.length;
  const totalChapters = vault.chapters.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, <span className="text-[#1856FF]">Student</span>
          </h1>
          <p className="text-sm text-white/40 mt-1">
            Here&apos;s your study overview for today
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <WidgetCard delay={0}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1856FF]/10 flex items-center justify-center">
              <Flame className="w-5 h-5 text-[#1856FF]" />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">7</p>
              <p className="text-xs text-white/35">Day Streak</p>
            </div>
          </div>
          <div className="flex gap-1 mt-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
              <div
                key={i}
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-medium",
                  i < 5
                    ? "bg-[#1856FF]/15 text-[#1856FF]"
                    : "bg-white/[0.03] text-white/20"
                )}
              >
                {day}
              </div>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard delay={0.05}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#06B6D4]/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#06B6D4]" />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">2.4h</p>
              <p className="text-xs text-white/35">Today</p>
            </div>
          </div>
          <div className="flex items-end gap-1 mt-1 h-8">
            {[20, 35, 25, 45, 30, 40, 60].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm bg-[#06B6D4]/30"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </WidgetCard>

        <WidgetCard delay={0.1}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#8B5CF6]/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">
                {totalFlashcards}
              </p>
              <p className="text-xs text-white/35">Flashcards</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
              <div className="h-full w-[35%] rounded-full bg-[#8B5CF6]" />
            </div>
            <span className="text-xs text-white/30">35% reviewed</span>
          </div>
        </WidgetCard>

        <WidgetCard delay={0.15}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#10B981]/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">72%</p>
              <p className="text-xs text-white/35">Accuracy</p>
            </div>
          </div>
          <div className="mt-2 relative pt-1">
            <div className="flex justify-between text-[10px] text-white/25 mb-1">
              <span>Last test</span>
              <span>+3% from last</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
              <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[#10B981] to-[#06B6D4]" />
            </div>
          </div>
        </WidgetCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <WidgetCard delay={0.2} className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#1856FF]" />
              Active Chapters
            </h3>
            <span className="text-[10px] text-white/25">{totalChapters} total</span>
          </div>
          <div className="space-y-2.5 mt-1">
            {vault.chapters.slice(0, 5).map((ch, i) => (
              <div
                key={ch.name}
                className="flex items-center gap-3 p-2.5 rounded-xl glass-interactive cursor-pointer"
              >
                <span className="text-xs text-white/20 w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{ch.name}</p>
                  <p className="text-[10px] text-white/25">
                    {ch.totalTopics} topics
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#1856FF]/60"
                      style={{
                        width: `${Math.floor(Math.random() * 60 + 20)}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-white/25">
                    {Math.floor(Math.random() * 60 + 20)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard delay={0.25}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#F97316]" />
              Weak Areas
            </h3>
          </div>
          <div className="space-y-2.5 mt-1">
            {[
              { topic: "Gauss's Law", accuracy: 45, chapter: "Electric Charges" },
              { topic: "Dimensional Analysis", accuracy: 52, chapter: "Units & Measurement" },
              { topic: "Electric Dipole", accuracy: 58, chapter: "Electric Charges" },
              { topic: "Error Analysis", accuracy: 62, chapter: "Units & Measurement" },
            ].map((area) => (
              <div
                key={area.topic}
                className="flex items-center gap-3 p-2 rounded-xl"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate">{area.topic}</p>
                  <p className="text-[10px] text-white/20">{area.chapter}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        area.accuracy < 50
                          ? "bg-[#EF4444]/60"
                          : "bg-[#F59E0B]/60"
                      )}
                      style={{ width: `${area.accuracy}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-white/25">
                    {area.accuracy}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-2 flex items-center gap-1 text-[11px] text-[#1856FF] hover:text-[#06B6D4] transition-colors">
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </WidgetCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <WidgetCard delay={0.3}>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#8B5CF6]" />
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Quick Actions
            </h3>
          </div>
          <div className="space-y-2">
            {[
              { label: "Continue Reading", sub: "Electric Field" },
              { label: "Review Flashcards", sub: `${totalFlashcards} pending` },
              { label: "Take Mock Test", sub: "Electric Charges" },
            ].map((action) => (
              <div
                key={action.label}
                className="p-2.5 rounded-xl glass-interactive cursor-pointer flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-medium">{action.label}</p>
                  <p className="text-[10px] text-white/25">{action.sub}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-white/20" />
              </div>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard delay={0.35}>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#10B981]" />
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              AI Insight
            </h3>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-xs text-white/60 leading-relaxed">
              You&apos;re strongest in <span className="text-[#10B981]">Coulomb&apos;s Law</span>.
              Focus on <span className="text-[#F97316]">Gauss&apos;s Law applications</span> to
              improve accuracy by ~15%.
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <GlowDot color="emerald" />
            <span className="text-[10px] text-white/25">
              Based on 200+ question attempts
            </span>
          </div>
        </WidgetCard>

        <WidgetCard delay={0.4} className="md:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#06B6D4]" />
              Study Activity
            </h3>
            <span className="text-[10px] text-white/25">This week</span>
          </div>
          <div className="flex items-end gap-2 h-20 mt-1">
            {[40, 65, 30, 80, 45, 90, 55].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-[#1856FF]/40 to-[#06B6D4]/40 transition-all"
                  style={{ height: `${h}%` }}
                />
                <span className="text-[9px] text-white/20">
                  {["M", "T", "W", "T", "F", "S", "S"][i]}
                </span>
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>
    </div>
  );
}

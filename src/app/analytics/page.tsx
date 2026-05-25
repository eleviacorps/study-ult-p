"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useVaultStore } from "@/stores/vault-store";
import { Header } from "@/components/layout/header";
import { loadStudyState, computeAnalytics, updateStudyState } from "@/lib/study-state";
import type { StudyState } from "@/lib/study-state";
import { cn } from "@/lib/cn";
import { BarChart3, Target, TrendingUp, Brain, Clock, AlertTriangle, Zap, Trophy, BookOpen, RefreshCw } from "lucide-react";

export default function AnalyticsPage() {
  const { vault, isLoaded } = useVaultStore();
  const [data, setData] = useState<ReturnType<typeof computeAnalytics>>();

  useEffect(() => {
    const state = loadStudyState();
    setData(computeAnalytics(state));
  }, []);

  const refresh = () => {
    const state = loadStudyState();
    setData(computeAnalytics(state));
  };

  if (!data) {
    return (
      <div className="min-h-screen">
        <Header title="Analytics" />
        <div className="p-8 flex justify-center"><div className="h-80 skeleton rounded-xl w-full max-w-lg" /></div>
      </div>
    );
  }

  const totalFlashcards = vault?.flashcards.length || 0;
  const reviewPercent = totalFlashcards > 0 ? Math.round((data.reviewedCards / totalFlashcards) * 100) : 0;

  const topicBreakdown = Object.entries(data.topicAccuracy)
    .map(([topic, stats]) => ({ topic, ...stats, accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0 }))
    .filter((t) => t.total >= 2)
    .sort((a, b) => a.accuracy - b.accuracy);

  const state = loadStudyState();
  const chapterBreakdown = vault?.chapters.map((ch) => {
    const cards = vault.flashcards.filter((f) => f.chapter === ch.name);
    const reviewed = cards.filter((f) => state.reviewedFlashcards?.[f.id]).length;
    const pct = cards.length > 0 ? Math.round((reviewed / cards.length) * 100) : 0;
    return { name: ch.name, pct, total: cards.length };
  }) || [];

  return (
    <div className="min-h-screen">
      <Header title="Analytics" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold">Analytics</h1>
          <button onClick={refresh} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06]">
            <RefreshCw className="w-3 h-3" /> Update
          </button>
        </div>
        <p className="text-sm opacity-35 mb-8">Your study performance insights</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Accuracy", value: data.totalAttempts > 0 ? `${data.accuracy}%` : "--", change: `${data.totalAttempts} attempts`, icon: Target, color: "#1856FF" },
            { label: "Questions", value: data.totalAttempts, change: `${data.totalCorrect} correct`, icon: Zap, color: "#8B5CF6" },
            { label: "Cards Reviewed", value: data.reviewedCards, change: `${reviewPercent}% of ${totalFlashcards}`, icon: Brain, color: "#10B981" },
            { label: "Today", value: data.todayMinutes > 0 ? `${data.todayMinutes}m` : "0m", change: `${data.streak} day streak`, icon: Clock, color: "#06B6D4" },
          ].map((m, i) => (
            <motion.div key={m.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${m.color}15` }}>
                  <m.icon className="w-4 h-4" style={{ color: m.color }} />
                </div>
                <span className="text-[10px] opacity-30">{m.label}</span>
              </div>
              <p className="text-2xl font-bold">{m.value}</p>
              <p className="text-[10px] opacity-25 mt-1">{m.change}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#F59E0B]/10">
                <Trophy className="w-4 h-4 text-[#F59E0B]" />
              </div>
              <span className="text-[10px] opacity-30">Points</span>
            </div>
            <p className="text-2xl font-bold text-[#F59E0B]">{data.points}</p>
            <p className="text-[10px] opacity-25 mt-1">Keep earning!</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#06B6D4]/10">
                <BookOpen className="w-4 h-4 text-[#06B6D4]" />
              </div>
              <span className="text-[10px] opacity-30">Tests</span>
            </div>
            <p className="text-2xl font-bold">{data.recentTests.length}</p>
            <p className="text-[10px] opacity-25 mt-1">taken recently</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#10B981]/10">
                <TrendingUp className="w-4 h-4 text-[#10B981]" />
              </div>
              <span className="text-[10px] opacity-30">Trend</span>
            </div>
            <p className={cn("text-2xl font-bold", data.testTrend >= 0 ? "text-[#10B981]" : "text-[#EF4444]")}>
              {data.testTrend >= 0 ? "+" : ""}{Math.round(data.testTrend * 100)}%
            </p>
            <p className="text-[10px] opacity-25 mt-1">from last test</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#EF4444]/10">
                <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
              </div>
              <span className="text-[10px] opacity-30">Weak Areas</span>
            </div>
            <p className="text-2xl font-bold">{data.weakAreas.length}</p>
            <p className="text-[10px] opacity-25 mt-1">needs focus</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className="glass p-6">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-[#1856FF]" /> Chapter Progress
            </h3>
            <div className="space-y-3">
              {chapterBreakdown.map((item) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs opacity-50">{item.name}</span>
                    <span className="text-[10px] opacity-30">{item.pct}% · {item.total} cards</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all",
                      item.pct >= 50 ? "bg-[#10B981]" : item.pct >= 20 ? "bg-[#06B6D4]" : "bg-white/[0.1]"
                    )} style={{ width: `${Math.max(2, item.pct)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass p-6">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-[#8B5CF6]" /> Topic Accuracy
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {topicBreakdown.length > 0 ? topicBreakdown.map((t) => (
                <div key={t.topic} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.02]">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{t.topic}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-16 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                      <div className={cn("h-full rounded-full",
                        t.accuracy >= 70 ? "bg-[#10B981]" : t.accuracy >= 50 ? "bg-[#F59E0B]" : "bg-[#EF4444]"
                      )} style={{ width: `${Math.max(3, t.accuracy)}%` }} />
                    </div>
                    <span className="text-[10px] text-white/25 w-8 text-right">{t.accuracy}%</span>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-white/25 text-center py-4">Complete more questions to see topic breakdown</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass p-6">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-[#10B981]" /> Study Insights
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[#1856FF]/5 border border-[#1856FF]/10">
                <p className="text-xs opacity-60">
                  {data.totalAttempts > 0
                    ? `You've attempted ${data.totalAttempts} questions with ${data.accuracy}% accuracy. `
                    : "Start solving questions to see accuracy data. "}
                  {data.accuracy >= 70 ? "Great work! Keep it up." : data.accuracy >= 40 ? "Good progress — focus on weak areas." : "Try reviewing notes before attempting questions."}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#8B5CF6]/5 border border-[#8B5CF6]/10">
                <p className="text-xs opacity-60">
                  {data.reviewedCards > 0
                    ? `Reviewed ${data.reviewedCards} of ${totalFlashcards} flashcards (${reviewPercent}%). `
                    : "Start reviewing flashcards to build knowledge retention. "}
                  {reviewPercent >= 50 ? "Strong engagement with flashcard system." : "Try reviewing 5-10 cards daily for better retention."}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#F97316]/5 border border-[#F97316]/10">
                <p className="text-xs opacity-60">
                  {data.todayMinutes > 0
                    ? `Studied ${data.todayMinutes} minutes today. `
                    : "No study activity tracked today. "}
                  {data.streak} day streak — {data.streak >= 5 ? "Excellent consistency!" : data.streak >= 3 ? "Building momentum!" : "Keep going!"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#10B981]/5 border border-[#10B981]/10">
                <p className="text-xs opacity-60">
                  Points: {data.points} earned. {data.pendingAiTodos} AI tasks and {data.pendingUserTodos} personal tasks pending.
                  {data.pendingAiTodos > 0 ? " Check your dashboard for AI-suggested study tasks!" : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="glass p-6">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-[#F59E0B]" /> Recent Test Scores
            </h3>
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {data.recentTests.length > 0 ? data.recentTests.map((test, i) => {
                const pct = Math.round((test.score / test.total) * 100);
                return (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.02]">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold",
                      pct >= 70 ? "bg-[#10B981]/15 text-[#10B981]" :
                      pct >= 50 ? "bg-[#F59E0B]/15 text-[#F59E0B]" :
                      "bg-[#EF4444]/15 text-[#EF4444]"
                    )}>{pct}%</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate">{test.chapter}</p>
                      <p className="text-[10px] opacity-25">{new Date(test.date).toLocaleDateString()}</p>
                    </div>
                    <span className="text-xs font-mono opacity-50">{test.score}/{test.total}</span>
                  </div>
                );
              }) : (
                <p className="text-xs text-white/25 text-center py-4">Take a mock test to see scores here</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

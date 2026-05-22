"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useVaultStore } from "@/stores/vault-store";
import { Header } from "@/components/layout/header";
import { cn } from "@/lib/cn";
import { BarChart3, Target, TrendingUp, Brain, Clock, AlertTriangle, Zap } from "lucide-react";

interface StudyData {
  questionAttempts: number;
  correctAnswers: number;
  reviewedCards: number;
  masteredCards: number;
  todayMinutes: number;
  streak: number;
}

function loadStudyData(): StudyData {
  try {
    const raw = localStorage.getItem("studyult-state");
    if (!raw) return { questionAttempts: 0, correctAnswers: 0, reviewedCards: 0, masteredCards: 0, todayMinutes: 0, streak: 1 };
    const state = JSON.parse(raw);
    const totalAttempts = Object.values(state.questionAttempts || {}).reduce((s: number, a: any) => s + (a.total || 0), 0);
    const totalCorrect = Object.values(state.questionAttempts || {}).reduce((s: number, a: any) => s + (a.correct || 0), 0);
    const reviewed = Object.keys(state.reviewedFlashcards || {}).length;
    const mastered = Object.keys(state.masteredFlashcards || {}).length;
    const today = new Date().toISOString().split("T")[0];
    const todayMin = state.studyMinutes?.[today] || 0;
    return { questionAttempts: totalAttempts, correctAnswers: totalCorrect, reviewedCards: reviewed, masteredCards: mastered, todayMinutes: todayMin, streak: state.streak || 1 };
  } catch { return { questionAttempts: 0, correctAnswers: 0, reviewedCards: 0, masteredCards: 0, todayMinutes: 0, streak: 1 }; }
}

export default function AnalyticsPage() {
  const { vault, isLoaded } = useVaultStore();
  const [data, setData] = useState<StudyData>({ questionAttempts: 0, correctAnswers: 0, reviewedCards: 0, masteredCards: 0, todayMinutes: 0, streak: 1 });

  useEffect(() => { setData(loadStudyData()); }, []);

  const accuracy = data.questionAttempts > 0 ? Math.round((data.correctAnswers / data.questionAttempts) * 100) : 0;
  const totalFlashcards = vault?.flashcards.length || 0;
  const reviewPercent = totalFlashcards > 0 ? Math.round((data.reviewedCards / totalFlashcards) * 100) : 0;

  const chapterBreakdown = vault?.chapters.map((ch) => {
    const cards = vault.flashcards.filter((f) => f.chapter === ch.name);
    const reviewed = cards.filter((f) => data.reviewedCards > 0).length;
    const pct = cards.length > 0 ? Math.round((reviewed / cards.length) * 100) : 0;
    return { name: ch.name, pct, total: cards.length };
  }) || [];

  return (
    <div className="min-h-screen">
      <Header title="Analytics" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Analytics</h1>
        <p className="text-sm opacity-35 mb-8">Your study performance insights</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Accuracy", value: data.questionAttempts > 0 ? `${accuracy}%` : "--", change: `${data.questionAttempts} attempts`, icon: Target, color: "#1856FF" },
            { label: "Questions", value: data.questionAttempts, change: `${data.correctAnswers} correct`, icon: Zap, color: "#8B5CF6" },
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
              <TrendingUp className="w-4 h-4 text-[#10B981]" /> Study Insights
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[#1856FF]/5 border border-[#1856FF]/10">
                <p className="text-xs opacity-60">
                  {data.questionAttempts > 0
                    ? `You've attempted ${data.questionAttempts} questions with ${accuracy}% accuracy. `
                    : "Start solving questions to see accuracy data. "}
                  {accuracy >= 70 ? "Great work! Keep it up." : accuracy >= 40 ? "Good progress — focus on weak areas." : "Try reviewing notes before attempting questions."}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

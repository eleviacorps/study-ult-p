"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { VaultContent, ChapterMeta, Note } from "@/types";
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
  FileQuestion,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface DashboardWidgetsProps {
  vault: VaultContent;
}

interface StudyState {
  streak: number;
  lastStudyDate: string;
  studyMinutes: Record<string, number>;
  reviewedFlashcards: Record<string, number>;
  masteredFlashcards: Record<string, number>;
  questionAttempts: Record<string, { correct: number; total: number }>;
  testScores: { date: string; score: number; total: number; chapter: string }[];
}

function loadStudyState(): StudyState {
  if (typeof window === "undefined") {
    return {
      streak: 0,
      lastStudyDate: "",
      studyMinutes: {},
      reviewedFlashcards: {},
      masteredFlashcards: {},
      questionAttempts: {},
      testScores: [],
    };
  }
  try {
    const raw = localStorage.getItem("studyult-state");
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    streak: 0,
    lastStudyDate: "",
    studyMinutes: {},
    reviewedFlashcards: {},
    masteredFlashcards: {},
    questionAttempts: {},
    testScores: [],
  };
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

function computeWeakAreas(
  vault: VaultContent,
  studyState: StudyState
): { topic: string; accuracy: number; chapter: string }[] {
  const areas: Map<string, { chapter: string; correct: number; total: number }> =
    new Map();

  for (const question of vault.questions) {
    if (!question.topic) continue;
    const existing = areas.get(question.topic) || {
      chapter: question.chapter,
      correct: 0,
      total: 0,
    };
    const key = `q-${question.id}`;
    const attempt = studyState.questionAttempts[key];
    if (attempt) {
      existing.correct += attempt.correct;
      existing.total += attempt.total;
    }
    areas.set(question.topic, existing);
  }

  const result: { topic: string; accuracy: number; chapter: string }[] = [];
  for (const [topic, data] of areas) {
    if (data.total >= 2) {
      const acc = Math.round((data.correct / data.total) * 100);
      if (acc < 70) {
        result.push({ topic, accuracy: acc, chapter: data.chapter });
      }
    }
  }

  result.sort((a, b) => a.accuracy - b.accuracy);
  return result.slice(0, 4);
}

function computeChapterProgress(
  vault: VaultContent,
  studyState: StudyState
): { name: string; totalTopics: number; reviewedCards: number; totalCards: number; percent: number }[] {
  return vault.chapters.map((ch) => {
    const chapterFlashcards = vault.flashcards.filter(
      (f) => f.chapter === ch.name
    );
    let reviewed = 0;
    for (const fc of chapterFlashcards) {
      if (studyState.reviewedFlashcards[fc.id]) reviewed++;
    }
    const total = chapterFlashcards.length || 1;
    const percent = Math.round((reviewed / total) * 100);
    return {
      name: ch.name,
      totalTopics: ch.totalTopics,
      reviewedCards: reviewed,
      totalCards: chapterFlashcards.length,
      percent,
    };
  });
}

function getTodayStudyMinutes(studyState: StudyState): number {
  const today = new Date().toISOString().split("T")[0];
  return studyState.studyMinutes[today] || 0;
}

function getStreak(studyState: StudyState): number {
  return studyState.streak || 1;
}

function getWeeklyActivity(studyState: StudyState): number[] {
  const days: number[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const minutes = studyState.studyMinutes[key] || 0;
    days.push(Math.min(100, Math.max(5, Math.round((minutes / 120) * 100))));
  }
  return days;
}

export function DashboardWidgets({ vault }: DashboardWidgetsProps) {
  const [studyState, setStudyState] = useState<StudyState>(loadStudyState);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setStudyState(loadStudyState());
  }, []);

  const totalFlashcards = vault.flashcards.length;
  const totalQuestions = vault.questions.length;
  const totalChapters = vault.chapters.length;
  const chapterProgress = computeChapterProgress(vault, studyState);
  const weakAreas = computeWeakAreas(vault, studyState);
  const todayMinutes = getTodayStudyMinutes(studyState);
  const streak = getStreak(studyState);
  const weeklyActivity = getWeeklyActivity(studyState);

  const reviewedCards = vault.flashcards.filter(
    (fc) => studyState.reviewedFlashcards[fc.id]
  ).length;
  const masteredCards = vault.flashcards.filter(
    (fc) => studyState.masteredFlashcards[fc.id]
  ).length;
  const reviewPercent =
    totalFlashcards > 0
      ? Math.round((reviewedCards / totalFlashcards) * 100)
      : 0;

  const totalAttempts = Object.values(studyState.questionAttempts).reduce(
    (sum, a) => sum + a.total,
    0
  );
  const totalCorrect = Object.values(studyState.questionAttempts).reduce(
    (sum, a) => sum + a.correct,
    0
  );
  const overallAccuracy =
    totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const today = new Date().getDay();

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-44 skeleton rounded-[20px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, <span className="text-[#1856FF]">Student</span>
          </h1>
          <p className="text-sm text-white/40 mt-1">
            {totalChapters} chapters • {vault.notes.length} notes •{" "}
            {totalQuestions} problems
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <WidgetCard delay={0}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1856FF]/10 flex items-center justify-center">
              <Flame className="w-5 h-5 text-[#1856FF]" />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">{streak}</p>
              <p className="text-xs text-white/35">Day Streak</p>
            </div>
          </div>
          <div className="flex gap-1 mt-1 flex-wrap">
            {days.map((day, i) => {
              const active = i <= today;
              return (
                <div
                  key={i}
                  className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-medium flex-shrink-0",
                    i === today
                      ? "bg-[#1856FF]/20 text-[#1856FF] border border-[#1856FF]/30"
                      : active
                      ? "bg-[#1856FF]/10 text-[#1856FF]/60"
                      : "bg-white/[0.03] text-white/20"
                  )}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </WidgetCard>

        <WidgetCard delay={0.05}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#06B6D4]/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#06B6D4]" />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">
                {todayMinutes > 60
                  ? `${(todayMinutes / 60).toFixed(1)}h`
                  : `${todayMinutes}m`}
              </p>
              <p className="text-xs text-white/35">Today</p>
            </div>
          </div>
          <div className="flex items-end gap-1 mt-1 h-8">
            {weeklyActivity.map((h, i) => (
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
              <Layers className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">
                {reviewedCards}
              </p>
              <p className="text-xs text-white/35">
                of {totalFlashcards} cards
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#8B5CF6] transition-all"
                style={{ width: `${reviewPercent}%` }}
              />
            </div>
            <span className="text-xs text-white/30">
              {reviewPercent}% reviewed
            </span>
          </div>
          {masteredCards > 0 && (
            <p className="text-[10px] text-white/25">
              {masteredCards} mastered ({Math.round(
                (masteredCards / reviewedCards) * 100
              )}
              % of reviewed)
            </p>
          )}
        </WidgetCard>

        <WidgetCard delay={0.15}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#10B981]/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">
                {overallAccuracy > 0 ? `${overallAccuracy}%` : "--"}
              </p>
              <p className="text-xs text-white/35">Accuracy</p>
            </div>
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-[10px] text-white/25 mb-1">
              <span>{totalAttempts} attempts</span>
              <span>{totalCorrect} correct</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#10B981] to-[#06B6D4] transition-all"
                style={{ width: `${overallAccuracy > 0 ? overallAccuracy : 5}%` }}
              />
            </div>
          </div>
        </WidgetCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <WidgetCard delay={0.2} className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#1856FF]" />
              Chapter Progress
            </h3>
            <span className="text-[10px] text-white/25">
              {totalChapters} chapters
            </span>
          </div>
          <div className="space-y-2.5 mt-1">
            {chapterProgress.map((ch, i) => (
              <Link
                key={ch.name}
                href={`/reader/${encodeURIComponent(ch.name)}`}
                className="flex items-center gap-3 p-2.5 rounded-xl glass-interactive cursor-pointer no-underline"
              >
                <span className="text-xs text-white/20 w-5 flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{ch.name}</p>
                  <p className="text-[10px] text-white/25">
                    {ch.totalTopics} topics • {ch.totalCards} flashcards
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-16 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#1856FF]/60 transition-all"
                      style={{ width: `${ch.percent}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-white/25 w-8 text-right">
                    {ch.percent}%
                  </span>
                </div>
              </Link>
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
            {weakAreas.length > 0 ? (
              weakAreas.map((area) => (
                <div
                  key={area.topic}
                  className="flex items-center gap-3 p-2 rounded-xl"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{area.topic}</p>
                    <p className="text-[10px] text-white/20">{area.chapter}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
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
              ))
            ) : (
              <p className="text-xs text-white/25 py-4 text-center">
                Start practicing questions to see weak areas
              </p>
            )}
          </div>
          {weakAreas.length > 0 && (
            <Link
              href="/analytics"
              className="mt-2 flex items-center gap-1 text-[11px] text-[#1856FF] hover:text-[#06B6D4] transition-colors"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          )}
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
            {vault.chapters.slice(0, 1).map((ch) => (
              <Link
                key={`read-${ch.name}`}
                href={`/reader/${encodeURIComponent(ch.name)}`}
                className="p-2.5 rounded-xl glass-interactive cursor-pointer flex items-center justify-between no-underline"
              >
                <div>
                  <p className="text-xs font-medium">Continue Reading</p>
                  <p className="text-[10px] text-white/25">{ch.name}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-white/20" />
              </Link>
            ))}
            <Link
              href="/flashcards"
              className="p-2.5 rounded-xl glass-interactive cursor-pointer flex items-center justify-between no-underline"
            >
              <div>
                <p className="text-xs font-medium">Review Flashcards</p>
                <p className="text-[10px] text-white/25">
                  {totalFlashcards - reviewedCards} pending
                </p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-white/20" />
            </Link>
            {vault.chapters.filter((ch) =>
              vault.questions.some((q) => q.chapter === ch.name)
            ).length > 0 && (
              <Link
                href={`/tests/${encodeURIComponent(
                  vault.chapters.find((ch) =>
                    vault.questions.some((q) => q.chapter === ch.name)
                  )?.name || ""
                )}`}
                className="p-2.5 rounded-xl glass-interactive cursor-pointer flex items-center justify-between no-underline"
              >
                <div>
                  <p className="text-xs font-medium">Take Mock Test</p>
                  <p className="text-[10px] text-white/25">
                    {
                      vault.chapters.find((ch) =>
                        vault.questions.some((q) => q.chapter === ch.name)
                      )?.name
                    }
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-white/20" />
              </Link>
            )}
          </div>
        </WidgetCard>

        <WidgetCard delay={0.35}>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#10B981]" />
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Study Insights
            </h3>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-xs text-white/60 leading-relaxed">
              {totalQuestions > 0
                ? `You have ${totalQuestions} questions to practice across ${totalChapters} chapters. `
                : ""}
              {reviewedCards > 0
                ? `${reviewedCards} flashcards reviewed. `
                : "Start reviewing flashcards to build knowledge. "}
              {weakAreas.length > 0
                ? `Focus on ${weakAreas[0]?.topic} to improve accuracy.`
                : "Keep practicing to identify improvement areas."}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] text-white/25">
              {totalAttempts > 0
                ? `Based on ${totalAttempts} question attempts`
                : "Start solving questions"}
            </span>
          </div>
        </WidgetCard>

        <WidgetCard delay={0.4} className="md:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#06B6D4]" />
              Weekly Activity
            </h3>
            <span className="text-[10px] text-white/25">Last 7 days</span>
          </div>
          <div className="flex items-end gap-2 h-20 mt-1">
            {weeklyActivity.map((h, i) => (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-1"
              >
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
          <p className="text-[10px] text-white/25 mt-2">
            {todayMinutes > 0
              ? `Total this week: ~${Math.round(
                  Object.entries(studyState.studyMinutes).reduce(
                    (sum, [date, mins]) => {
                      const d = new Date(date);
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      return d >= weekAgo ? sum + mins : sum;
                    },
                    0
                  )
                )} minutes`
              : "No activity tracked yet this week"}
          </p>
        </WidgetCard>
      </div>

      {vault.chapters.length > 0 && studyState.testScores.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-white/25">
          <span>
            Latest test:{" "}
            {studyState.testScores[studyState.testScores.length - 1]?.score}/
            {studyState.testScores[studyState.testScores.length - 1]?.total} on{" "}
            {
              studyState.testScores[studyState.testScores.length - 1]?.chapter
            }
          </span>
        </div>
      )}
    </div>
  );
}

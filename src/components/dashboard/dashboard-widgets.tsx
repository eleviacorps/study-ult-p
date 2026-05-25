"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { VaultContent } from "@/types";
import { loadStudyState, computeAnalytics, addAiTodo, addPoints, updateStudyState } from "@/lib/study-state";
import type { StudyState } from "@/lib/study-state";
import { useLlm } from "@/lib/llm-context";
import { PROMPTS } from "@/lib/ai-config";
import {
  Flame,
  Clock,
  BookOpen,
  Target,
  Trophy,
  Brain,
  TrendingUp,
  AlertCircle,
  BarChart3,
  ArrowRight,
  Layers,
  CheckCircle2,
  Circle,
  Plus,
  Sparkles,
  Loader2,
  Trash2,
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
      className={cn("glass p-5 flex flex-col gap-3", className)}
    >
      {children}
    </motion.div>
  );
}

export function DashboardWidgets({ vault }: DashboardWidgetsProps) {
  const { ask, config } = useLlm();
  const [studyState, setStudyState] = useState<StudyState>(loadStudyState);
  const [mounted, setMounted] = useState(false);
  const [newTodo, setNewTodo] = useState("");
  const [newTodoPriority, setNewTodoPriority] = useState<"high" | "medium" | "low">("medium");
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    setMounted(true);
    setStudyState(loadStudyState());
  }, []);

  const refresh = useCallback(() => {
    setStudyState(loadStudyState());
  }, []);

  const analytics = computeAnalytics(studyState);

  const totalFlashcards = vault.flashcards.length;
  const totalQuestions = vault.questions.length;
  const totalChapters = vault.chapters.length;

  const reviewedCards = analytics.reviewedCards;
  const masteredCards = analytics.masteredCards;
  const reviewPercent = totalFlashcards > 0 ? Math.round((reviewedCards / totalFlashcards) * 100) : 0;

  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const today = new Date().getDay();

  const addUserTodo = () => {
    if (!newTodo.trim()) return;
    updateStudyState((state) => {
      state.userTodos.unshift({
        id: `user-${Date.now()}`,
        task: newTodo.trim(),
        priority: newTodoPriority,
        createdAt: new Date().toISOString(),
        completed: false,
      });
    });
    addPoints(5, "Todo Added", newTodo.trim());
    setNewTodo("");
    refresh();
  };

  const toggleTodo = (id: string, isAi: boolean) => {
    updateStudyState((state) => {
      const list = isAi ? state.aiTodos : state.userTodos;
      const item = list.find((t) => t.id === id);
      if (item) {
        item.completed = !item.completed;
        if (item.completed && isAi) {
          addPoints(15, "Todo Completed", item.task);
        }
      }
    });
    refresh();
  };

  const deleteTodo = (id: string, isAi: boolean) => {
    updateStudyState((state) => {
      if (isAi) {
        state.aiTodos = state.aiTodos.filter((t) => t.id !== id);
      } else {
        state.userTodos = state.userTodos.filter((t) => t.id !== id);
      }
    });
    refresh();
  };

  const generateAiTodos = async () => {
    if (!config.enabled || aiGenerating) return;
    setAiGenerating(true);

    const weakTopics = (studyState.weakAreas || []).slice(0, 3).map((w) => w.topic).join(", ");
    const strongTopics = (studyState.strongAreas || []).slice(0, 2).map((w) => w.topic).join(", ");
    const testScores = (studyState.testScores || []).slice(-3).map((t) => `${t.chapter}: ${t.score}/${t.total}`).join("; ");
    const accuracy = analytics.accuracy;
    const flashcardProgress = reviewPercent;

    // Today's activity
    const today = new Date().toISOString().split("T")[0];
    const todayActivities = (studyState.activityLog || []).filter((a) => a.timestamp.startsWith(today));
    const chaptersStudiedToday = [...new Set(todayActivities.map((a) => {
      for (const ch of vault.chapters) {
        if (a.details.includes(ch.name)) return ch.name;
      }
      return null;
    }).filter(Boolean))];

    // Available chapters not yet started
    const startedChapterNames = new Set([
      ...Object.keys(studyState.reviewedFlashcards || {}).map(id => vault.flashcards.find(f => f.id === id)?.chapter),
      ...(studyState.testScores || []).map(t => t.chapter),
      ...(studyState.activityLog || []).slice(0, 100).map(a => {
        for (const ch of vault.chapters) if (a.details.includes(ch.name)) return ch.name;
        return null;
      }),
    ].filter(Boolean));

    const availableChapters = vault.chapters
      .filter(ch => !startedChapterNames.has(ch.name))
      .map(ch => `${ch.name} (${ch.totalTopics} topics)`)
      .slice(0, 3);

    // Question-type weaknesses from topicAccuracy
    type QuestionTypeStats = { theoretical: number; numerical: number; mcq: number };
    const questionTypeWeakness: QuestionTypeStats = { theoretical: 0, numerical: 0, mcq: 0 };
    let typeCount = 0;
    for (const [topic, stats] of Object.entries(studyState.topicAccuracy || {})) {
      const acc = stats.total > 0 ? stats.correct / stats.total : 1;
      if (acc < 0.7) {
        if (topic.includes("theory") || topic.includes("concept")) questionTypeWeakness.theoretical++;
        else if (topic.includes("num") || topic.includes("calc")) questionTypeWeakness.numerical++;
        else questionTypeWeakness.mcq++;
        typeCount++;
      }
    }
    const typeWeaknessStr = typeCount > 0
      ? Object.entries(questionTypeWeakness)
        .filter(([, c]) => c > 0)
        .map(([t, c]) => `${t}: ${c} weak topics`)
        .join(", ")
      : "not enough data";

    // Flashcards due
    let flashcardDueCount = 0;
    try {
      const sm2Data = JSON.parse(localStorage.getItem("studyult-sm2") || "{}");
      const todayStr = new Date().toISOString().split("T")[0];
      for (const card of vault.flashcards) {
        const sched = sm2Data[`sm2-${card.id}`];
        if (sched && sched.nextReview <= todayStr) flashcardDueCount++;
      }
    } catch {}

    const quizScores = (studyState.quizScores || []).slice(-3).map((q) => `${q.score}/${q.total} (net: ${q.netScore})`).join("; ");
    const conversationCount = (studyState.aiConversations || []).length;
    const topWeaknesses = (studyState.weakAreas || []).slice(0, 5).map((w) => `${w.topic} (${w.accuracy}%)`).join(", ");

    const context = PROMPTS.STUDY_PLANNER
      .replace("{ACCURACY}", String(accuracy))
      .replace("{WEAK_TOPICS}", topWeaknesses || weakTopics || "none yet")
      .replace("{STRONG_TOPICS}", strongTopics || "none yet")
      .replace("{TYPE_WEAKNESS}", typeWeaknessStr)
      .replace("{AVAILABLE_CHAPTERS}", availableChapters.join("; ") || "none \u2014 all started")
      .replace("{CHAPTERS_TODAY}", chaptersStudiedToday.length > 0 ? chaptersStudiedToday.join(", ") : "none yet")
      .replace("{FLASHCARD_DUE}", String(flashcardDueCount))
      .replace("{TEST_SCORES}", testScores || "none yet")
      .replace("{QUIZ_SCORES}", quizScores || "none yet")
      .replace("{CONVERSATIONS}", String(conversationCount))
      .replace("{FLASHCARD_PCT}", String(reviewPercent));

    try {
      const { content } = await ask(context, "");
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const tasks = JSON.parse(jsonMatch[0]);
        for (const t of tasks) {
          if (t.task && t.priority) {
            addAiTodo(t.task, t.priority, "AI Analysis");
          }
        }
      }
    } catch {}
    setAiGenerating(false);
    refresh();
  };

  const getWeeklyActivity = (): number[] => {
    const days: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const minutes = studyState.studyMinutes?.[key] || 0;
      days.push(Math.min(100, Math.max(5, Math.round((minutes / 120) * 100))));
    }
    return days;
  };

  const weeklyActivity = getWeeklyActivity();

  const highPriorityTodos = [
    ...analytics.userTodos.filter((t) => !t.completed && t.priority === "high"),
    ...analytics.aiTodos.filter((t) => !t.completed && t.priority === "high"),
  ].slice(0, 5);

  const allPendingTodos = [
    ...analytics.aiTodos.filter((t) => !t.completed),
    ...analytics.userTodos.filter((t) => !t.completed),
  ];

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
            {totalChapters} chapters · {vault.notes.length} notes · {totalQuestions} problems
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20">
            <Trophy className="w-4 h-4 text-[#F59E0B]" />
            <span className="text-sm font-bold text-[#F59E0B]">{analytics.points}</span>
            <span className="text-[10px] text-[#F59E0B]/60">pts</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <WidgetCard delay={0}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1856FF]/10 flex items-center justify-center">
              <Flame className="w-5 h-5 text-[#1856FF]" />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">{analytics.streak}</p>
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
                {analytics.todayMinutes > 60
                  ? `${(analytics.todayMinutes / 60).toFixed(1)}h`
                  : `${analytics.todayMinutes}m`}
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
              <p className="text-2xl font-bold tracking-tight">{reviewedCards}</p>
              <p className="text-xs text-white/35">of {totalFlashcards} cards</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#8B5CF6] transition-all"
                style={{ width: `${reviewPercent}%` }}
              />
            </div>
            <span className="text-xs text-white/30">{reviewPercent}%</span>
          </div>
          {masteredCards > 0 && (
            <p className="text-[10px] text-white/25">
              {masteredCards} mastered ({reviewedCards > 0 ? Math.round((masteredCards / reviewedCards) * 100) : 0}%)
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
                {analytics.totalAttempts > 0 ? `${analytics.accuracy}%` : "--"}
              </p>
              <p className="text-xs text-white/35">Accuracy</p>
            </div>
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-[10px] text-white/25 mb-1">
              <span>{analytics.totalAttempts} attempts</span>
              <span>{analytics.totalCorrect} correct</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#10B981] to-[#06B6D4] transition-all"
                style={{ width: `${analytics.totalAttempts > 0 ? analytics.accuracy : 5}%` }}
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
          </div>
          <div className="space-y-2.5 mt-1">
            {vault.chapters.map((ch, i) => {
              const chapterCards = vault.flashcards.filter((f) => f.chapter === ch.name);
              const reviewed = chapterCards.filter((f) => studyState.reviewedFlashcards?.[f.id]).length;
              const pct = chapterCards.length > 0 ? Math.round((reviewed / chapterCards.length) * 100) : 0;
              const chapterQuestions = vault.questions.filter((q) => q.chapter === ch.name);
              const attempted = chapterQuestions.filter((q) => studyState.questionAttempts?.[`q-${q.id}`]).length;
              return (
                <Link
                  key={ch.name}
                  href={`/reader/${encodeURIComponent(ch.name)}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl glass-interactive cursor-pointer no-underline"
                >
                  <span className="text-xs text-white/20 w-5 flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{ch.name}</p>
                    <p className="text-[10px] text-white/25">
                      {ch.totalTopics} topics · {chapterCards.length} cards · {attempted}/{chapterQuestions.length} questions
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-16 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                      <div className="h-full rounded-full bg-[#1856FF]/60 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-white/25 w-8 text-right">{pct}%</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </WidgetCard>

        <WidgetCard delay={0.25}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#F97316]" />
              Weak Areas
            </h3>
          </div>
          <div className="space-y-2 mt-1">
            {analytics.weakAreas.length > 0 ? (
              analytics.weakAreas.slice(0, 4).map((area) => (
                <div key={area.topic} className="flex items-center gap-3 p-2 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{area.topic}</p>
                    <p className="text-[10px] text-white/20">{area.chapter}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-12 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", area.accuracy < 50 ? "bg-[#EF4444]/60" : "bg-[#F59E0B]/60")}
                        style={{ width: `${area.accuracy}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-white/25">{area.accuracy}%</span>
                  </div>
                </div>
              ))
            ) : analytics.strongAreas.length > 0 ? (
              analytics.strongAreas.slice(0, 3).map((area) => (
                <div key={area.topic} className="flex items-center gap-3 p-2 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{area.topic}</p>
                    <p className="text-[10px] text-white/20">{area.chapter}</p>
                  </div>
                  <span className="text-[10px] text-[#10B981]">{area.accuracy}%</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-white/25 py-4 text-center">Start practicing to see analysis</p>
            )}
          </div>
        </WidgetCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WidgetCard delay={0.3}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#8B5CF6]" />
              AI To-Do List
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={generateAiTodos}
                disabled={aiGenerating || !config.enabled}
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-[#8B5CF6]/10 text-[#8B5CF6] hover:bg-[#8B5CF6]/20 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {aiGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                {aiGenerating ? "Analyzing..." : "AI Suggest"}
              </button>
            </div>
          </div>
          <div className="space-y-1.5 mt-1 max-h-[280px] overflow-y-auto">
            {analytics.aiTodos.filter((t) => !t.completed).length === 0 && analytics.aiTodos.filter((t) => t.completed).length === 0 ? (
              <p className="text-xs text-white/25 py-4 text-center">
                {config.enabled ? "Click AI Suggest to get personalized tasks" : "Enable AI in Settings for suggestions"}
              </p>
            ) : (
              <>
                {analytics.aiTodos
                  .sort((a, b) => {
                    const p = { high: 0, medium: 1, low: 2 };
                    if (a.completed !== b.completed) return a.completed ? 1 : -1;
                    return (p[a.priority] || 1) - (p[b.priority] || 1);
                  })
                  .slice(0, 10)
                  .map((todo) => (
                    <div
                      key={todo.id}
                      className={cn("flex items-center gap-2 p-2 rounded-lg group", todo.completed ? "opacity-30" : "hover:bg-white/[0.03]")}
                    >
                      <button onClick={() => toggleTodo(todo.id, true)} className="flex-shrink-0">
                        {todo.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                        ) : (
                          <Circle className="w-4 h-4 opacity-20" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs", todo.completed && "line-through")}>{todo.task}</p>
                        <p className="text-[9px] opacity-20">{todo.source} · {new Date(todo.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded flex-shrink-0",
                        todo.priority === "high" ? "bg-[#EF4444]/10 text-[#EF4444]" :
                        todo.priority === "medium" ? "bg-[#F59E0B]/10 text-[#F59E0B]" :
                        "bg-white/[0.04] text-white/40"
                      )}>{todo.priority}</span>
                      <button onClick={() => deleteTodo(todo.id, true)} className="opacity-0 group-hover:opacity-30 hover:!opacity-60 transition-opacity flex-shrink-0">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
              </>
            )}
          </div>
        </WidgetCard>

        <WidgetCard delay={0.35}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              My Tasks
            </h3>
            <span className="text-[10px] opacity-25">{analytics.pendingUserTodos} pending</span>
          </div>
          <div className="space-y-1.5 mt-1 max-h-[200px] overflow-y-auto">
            {analytics.userTodos.filter((t) => !t.completed).length === 0 && analytics.userTodos.filter((t) => t.completed).length === 0 ? (
              <p className="text-xs text-white/25 py-2">Add your own study tasks below</p>
            ) : (
              analytics.userTodos
                .sort((a, b) => {
                  const p = { high: 0, medium: 1, low: 2 };
                  if (a.completed !== b.completed) return a.completed ? 1 : -1;
                  return (p[a.priority] || 1) - (p[b.priority] || 1);
                })
                .map((todo) => (
                  <div
                    key={todo.id}
                    className={cn("flex items-center gap-2 p-2 rounded-lg group", todo.completed ? "opacity-30" : "hover:bg-white/[0.03]")}
                  >
                    <button onClick={() => toggleTodo(todo.id, false)} className="flex-shrink-0">
                      {todo.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                      ) : (
                        <Circle className="w-4 h-4 opacity-20" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs", todo.completed && "line-through")}>{todo.task}</p>
                    </div>
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded flex-shrink-0",
                      todo.priority === "high" ? "bg-[#EF4444]/10 text-[#EF4444]" :
                      todo.priority === "medium" ? "bg-[#F59E0B]/10 text-[#F59E0B]" :
                      "bg-white/[0.04] text-white/40"
                    )}>{todo.priority}</span>
                    <button onClick={() => deleteTodo(todo.id, false)} className="opacity-0 group-hover:opacity-30 hover:!opacity-60 transition-opacity flex-shrink-0">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
            )}
          </div>
          <div className="mt-2 flex gap-1.5">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addUserTodo()}
              placeholder="Add a task..."
              className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs outline-none focus:border-[#10B981]/30"
              style={{ color: "var(--text-primary)" }}
            />
            <select
              value={newTodoPriority}
              onChange={(e) => setNewTodoPriority(e.target.value as any)}
              className="w-20 px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] outline-none"
              style={{ color: "var(--text-secondary)" }}
            >
              <option value="high">High</option>
              <option value="medium">Med</option>
              <option value="low">Low</option>
            </select>
            <button
              onClick={addUserTodo}
              disabled={!newTodo.trim()}
              className="px-3 py-1.5 rounded-lg bg-[#10B981]/15 text-[#10B981] text-xs disabled:opacity-20 border border-[#10B981]/20 hover:bg-[#10B981]/25"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </WidgetCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <WidgetCard delay={0.4} className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#10B981]" />
              Performance
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-1">
            <div className="p-3 rounded-xl bg-[#1856FF]/5 border border-[#1856FF]/10">
              <p className="text-[10px] opacity-30 mb-1">Questions</p>
              <p className="text-lg font-bold">{analytics.totalAttempts}</p>
              <p className="text-[10px] opacity-30">{analytics.totalCorrect} correct · {analytics.accuracy}%</p>
            </div>
            <div className="p-3 rounded-xl bg-[#8B5CF6]/5 border border-[#8B5CF6]/10">
              <p className="text-[10px] opacity-30 mb-1">Tests Taken</p>
              <p className="text-lg font-bold">{analytics.recentTests.length}</p>
              {analytics.recentTests[0] && (
                <p className="text-[10px] opacity-30">Latest: {analytics.recentTests[0].score}/{analytics.recentTests[0].total}</p>
              )}
            </div>
            <div className="p-3 rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/10">
              <p className="text-[10px] opacity-30 mb-1">Points Earned</p>
              <p className="text-lg font-bold text-[#F59E0B]">{analytics.points}</p>
              <p className="text-[10px] opacity-30">Keep it up!</p>
            </div>
            <div className="p-3 rounded-xl bg-[#10B981]/5 border border-[#10B981]/10">
              <p className="text-[10px] opacity-30 mb-1">Trend</p>
              <p className={cn("text-lg font-bold", analytics.testTrend >= 0 ? "text-[#10B981]" : "text-[#EF4444]")}>
                {analytics.testTrend >= 0 ? "+" : ""}{Math.round(analytics.testTrend * 100)}%
              </p>
              <p className="text-[10px] opacity-30">from last test</p>
            </div>
          </div>
        </WidgetCard>

        <WidgetCard delay={0.45}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#06B6D4]" />
              Recent Activity
            </h3>
          </div>
          <div className="space-y-2 mt-1 max-h-[240px] overflow-y-auto">
            {analytics.activityLog.length > 0 ? (
              analytics.activityLog.slice(0, 8).map((entry, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1856FF]/50 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px]">{entry.action}</p>
                    <p className="text-[10px] opacity-25 truncate">{entry.details}</p>
                  </div>
                  <span className="text-[10px] text-[#10B981] flex-shrink-0">+{entry.points}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-white/25 py-4 text-center">Activity will appear here as you study</p>
            )}
          </div>
        </WidgetCard>
      </div>

      {highPriorityTodos.length > 0 && (
        <div className="p-4 rounded-xl bg-[#EF4444]/5 border border-[#EF4444]/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-[#EF4444]" />
            <span className="text-xs font-semibold text-[#EF4444]">Priority Tasks</span>
          </div>
          <div className="space-y-1">
            {highPriorityTodos.map((todo) => (
              <div key={todo.id} className="flex items-center gap-2 p-1.5">
                <div className="w-1 h-1 rounded-full bg-[#EF4444] flex-shrink-0" />
                <p className="text-xs opacity-60">{todo.task}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

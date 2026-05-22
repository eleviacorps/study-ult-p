"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useVaultStore } from "@/stores/vault-store";
import { Header } from "@/components/layout/header";
import {
  Clock,
  ChevronRight,
  ChevronLeft,
  Flag,
  CheckCircle,
  AlertCircle,
  Timer,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface TestConfig {
  questionCount: number;
  timeMinutes: number;
  chapter: string;
}

export default function TestTakePage() {
  const params = useParams<{ chapter: string }>();
  const { vault, isLoaded } = useVaultStore();
  const chapterName = decodeURIComponent(params.chapter);

  const [phase, setPhase] = useState<"config" | "started" | "finished">(
    "config"
  );
  const [config, setConfig] = useState<TestConfig>({
    questionCount: 10,
    timeMinutes: 15,
    chapter: chapterName,
  });
  const [questions, setQuestions] = useState<
    {
      id: string;
      title: string;
      options: string[];
      answer: string;
      difficulty: string;
    }[]
  >([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Map<number, string>>(new Map());
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState<{ correct: number; wrong: number; total: number } | null>(null);

  const prepareQuestions = useCallback(() => {
    if (!vault) return;
    const chapterQs = vault.questions.filter(
      (q) => q.chapter === chapterName
    );
    const selected = chapterQs.slice(0, config.questionCount).map((q) => ({
      id: q.id,
      title: q.title,
      options: q.options
        ? q.options.map((o) => `${o.label}) ${o.text}`)
        : [],
      answer: q.answer,
      difficulty: q.difficulty,
    }));
    setQuestions(selected);
    setTimeLeft(config.timeMinutes * 60);
    setCurrentQ(0);
    setAnswers(new Map());
    setMarked(new Set());
    setScore(null);
  }, [vault, chapterName, config]);

  useEffect(() => {
    if (phase !== "started" || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          finishTest();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, timeLeft]);

  const startTest = () => {
    prepareQuestions();
    setPhase("started");
  };

  const finishTest = () => {
    let correct = 0;
    let wrong = 0;
    for (let i = 0; i < questions.length; i++) {
      const userAnswer = answers.get(i);
      const correctAnswer = questions[i]?.answer;
      if (userAnswer && correctAnswer && userAnswer === correctAnswer) {
        correct++;
      } else if (userAnswer) {
        wrong++;
      }
    }
    setScore({ correct, wrong, total: questions.length });
    setPhase("finished");
  };

  const selectAnswer = (optLabel: string) => {
    setAnswers((prev) => new Map(prev).set(currentQ, optLabel));
  };

  const toggleMarked = () => {
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(currentQ)) next.delete(currentQ);
      else next.add(currentQ);
      return next;
    });
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const isUrgent = timeLeft < 60;

  if (!isLoaded) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="p-8">
          <div className="h-80 skeleton rounded-[24px] max-w-lg mx-auto" />
        </div>
      </div>
    );
  }

  const availableCount = vault?.questions.filter(
    (q) => q.chapter === chapterName
  ).length || 0;

  if (phase === "config") {
    return (
      <div className="min-h-screen">
        <Header
          breadcrumbs={[
            { label: "Mock Tests", href: "/tests" },
            { label: chapterName, href: "#" },
          ]}
        />
        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full glass p-8"
          >
            <h1 className="text-xl font-bold mb-1">{chapterName}</h1>
            <p className="text-xs text-white/40 mb-6">
              Configure your test settings
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/30 mb-2 block">
                  Questions
                </label>
                <div className="flex items-center gap-2">
                  {[5, 10, 15, 20].map((n) => (
                    <button
                      key={n}
                      onClick={() =>
                        setConfig((c) => ({ ...c, questionCount: n }))
                      }
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs transition-all",
                        config.questionCount === n
                          ? "bg-[#1856FF]/15 text-[#1856FF] border border-[#1856FF]/20"
                          : "bg-white/[0.03] text-white/40 border border-transparent hover:border-white/[0.05]"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-white/20 mt-1">
                  {availableCount} questions available
                </p>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/30 mb-2 block">
                  Time Limit
                </label>
                <div className="flex items-center gap-2">
                  {[10, 15, 20, 30].map((n) => (
                    <button
                      key={n}
                      onClick={() =>
                        setConfig((c) => ({ ...c, timeMinutes: n }))
                      }
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs transition-all",
                        config.timeMinutes === n
                          ? "bg-[#1856FF]/15 text-[#1856FF] border border-[#1856FF]/20"
                          : "bg-white/[0.03] text-white/40 border border-transparent hover:border-white/[0.05]"
                      )}
                    >
                      {n} min
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={startTest}
              disabled={availableCount === 0}
              className="w-full mt-6 py-3 rounded-xl bg-[#1856FF] hover:bg-[#1856FF]/90 disabled:bg-white/[0.05] disabled:text-white/20 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Timer className="w-4 h-4" />
              Start Test
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (phase === "finished" && score) {
    const pct = Math.round((score.correct / score.total) * 100);
    return (
      <div className="min-h-screen">
        <Header
          breadcrumbs={[
            { label: "Mock Tests", href: "/tests" },
            { label: chapterName, href: "#" },
          ]}
        />
        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full glass p-8 text-center"
          >
            <div
              className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4",
                pct >= 60
                  ? "bg-[#10B981]/10"
                  : pct >= 40
                  ? "bg-[#F59E0B]/10"
                  : "bg-[#EF4444]/10"
              )}
            >
              {pct >= 60 ? (
                <CheckCircle className="w-10 h-10 text-[#10B981]" />
              ) : (
                <AlertCircle className="w-10 h-10 text-[#F59E0B]" />
              )}
            </div>
            <h1 className="text-2xl font-bold mb-2">Test Complete!</h1>
            <p className="text-3xl font-bold text-[#1856FF] mb-4">
              {score.correct}/{score.total} ({pct}%)
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-3 rounded-xl bg-[#10B981]/5 border border-[#10B981]/10">
                <p className="text-[10px] text-[#10B981] mb-1 uppercase tracking-wider">
                  Correct
                </p>
                <p className="text-lg font-bold">+{score.correct * 4}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#EF4444]/5 border border-[#EF4444]/10">
                <p className="text-[10px] text-[#EF4444] mb-1 uppercase tracking-wider">
                  Wrong
                </p>
                <p className="text-lg font-bold">
                  -{score.wrong}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  prepareQuestions();
                  setPhase("started");
                }}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.04] text-white/60 text-xs hover:bg-white/[0.08] transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => setPhase("config")}
                className="flex-1 py-2.5 rounded-xl bg-[#1856FF]/15 text-[#1856FF] text-xs hover:bg-[#1856FF]/25 transition-colors border border-[#1856FF]/20"
              >
                New Config
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const q = questions[currentQ];

  return (
    <div className="min-h-screen">
      <Header
        breadcrumbs={[
          { label: "Mock Tests", href: "/tests" },
          { label: chapterName, href: "#" },
        ]}
      />
      <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)]">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div
              className={cn(
                "flex items-center gap-2 text-lg font-mono font-bold px-4 py-2 rounded-xl",
                isUrgent
                  ? "bg-[#EF4444]/10 text-[#EF4444]"
                  : "glass text-white/60"
              )}
            >
              <Clock className="w-4 h-4" />
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/30">
                {currentQ + 1} / {questions.length}
              </span>
              <button
                onClick={toggleMarked}
                className={cn(
                  "p-2 rounded-xl transition-all text-xs",
                  marked.has(currentQ)
                    ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                    : "glass-interactive text-white/30"
                )}
              >
                <Flag className="w-4 h-4" />
              </button>
            </div>
          </div>

          {q && (
            <motion.div
              key={currentQ}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass p-6 max-w-2xl mx-auto"
            >
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-white/25 mb-3 inline-block">
                {q.difficulty}
              </span>
              <h2 className="text-sm sm:text-base font-medium mb-6">
                {q.title}
              </h2>
              <div className="grid grid-cols-1 gap-2">
                {q.options.map((opt) => {
                  const label = opt.charAt(0);
                  const isSelected = answers.get(currentQ) === label;
                  return (
                    <button
                      key={label}
                      onClick={() => selectAnswer(label)}
                      className={cn(
                        "p-3 sm:p-4 rounded-xl text-sm text-left transition-all",
                        isSelected
                          ? "bg-[#1856FF]/15 border border-[#1856FF]/30 text-white"
                          : "bg-white/[0.03] border border-white/[0.04] text-white/50 hover:border-white/[0.1]"
                      )}
                    >
                      <span className="text-white/25 mr-3">{label})</span>
                      {opt.substring(2)}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          <div className="flex items-center justify-between max-w-2xl mx-auto mt-4">
            <button
              onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
              disabled={currentQ === 0}
              className="flex items-center gap-1 px-4 py-2 rounded-xl glass-interactive disabled:opacity-20 text-white/40 text-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            {currentQ < questions.length - 1 ? (
              <button
                onClick={() => setCurrentQ(currentQ + 1)}
                className="flex items-center gap-1 px-4 py-2 rounded-xl glass-interactive text-white/60 text-xs"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={finishTest}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-[#1856FF]/15 border border-[#1856FF]/20 text-[#1856FF] text-xs font-medium hover:bg-[#1856FF]/25"
              >
                Submit Test
              </button>
            )}
          </div>
        </main>

        <aside className="w-full lg:w-64 flex-shrink-0 glass border-l-0 border-r-0 border-t border-t-white/[0.04] lg:border-t-0 lg:border-l lg:border-l-white/[0.04] rounded-none p-4">
          <p className="text-[10px] uppercase tracking-wider text-white/25 mb-3">
            Question Palette
          </p>
          <div className="grid grid-cols-10 lg:grid-cols-5 gap-1.5">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQ(i)}
                className={cn(
                  "w-full aspect-square rounded-lg flex items-center justify-center text-[10px] font-medium transition-all",
                  i === currentQ &&
                    "bg-[#1856FF]/15 text-[#1856FF] border border-[#1856FF]/20",
                  i !== currentQ &&
                    answers.has(i) &&
                    "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/15",
                  i !== currentQ &&
                    !answers.has(i) &&
                    "bg-white/[0.03] text-white/25 hover:bg-white/[0.06]",
                  marked.has(i) && "ring-1 ring-[#F59E0B]/50"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center gap-2 text-[10px] text-white/30">
              <div className="w-3 h-3 rounded bg-[#10B981]/10 border border-[#10B981]/15" />
              Answered
            </div>
            <div className="flex items-center gap-2 text-[10px] text-white/30">
              <div className="w-3 h-3 rounded bg-[#1856FF]/15 border border-[#1856FF]/20" />
              Current
            </div>
            <div className="flex items-center gap-2 text-[10px] text-white/30">
              <div className="w-3 h-3 rounded bg-white/[0.03]" />
              Unseen
            </div>
            <div className="flex items-center gap-2 text-[10px] text-white/30">
              <div className="w-3 h-3 rounded ring-1 ring-[#F59E0B]/50 bg-white/[0.03]" />
              Marked
            </div>
          </div>
          <button
            onClick={finishTest}
            className="w-full mt-6 py-2.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-xs font-medium hover:bg-[#EF4444]/20 transition-colors"
          >
            Submit Test
          </button>
        </aside>
      </div>
    </div>
  );
}

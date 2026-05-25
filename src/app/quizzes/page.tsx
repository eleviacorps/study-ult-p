"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useVaultStore } from "@/stores/vault-store";
import { useLlm } from "@/lib/llm-context";
import { MarkdownRenderer } from "@/components/reader/markdown-renderer";
import { addPoints, updateStudyState } from "@/lib/study-state";
import { PROMPTS } from "@/lib/ai-config";
import { Header } from "@/components/layout/header";
import { Clock, ChevronRight, ChevronLeft, Flag, CheckCircle, AlertCircle, Timer, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  type: "single" | "multi" | "numerical";
}

export default function QuizPage() {
  const { vault, isLoaded } = useVaultStore();
  const { ask, config } = useLlm();

  const [phase, setPhase] = useState<"config" | "started" | "finished">("config");
  const [questionCount, setQuestionCount] = useState(10);
  const [timeMinutes, setTimeMinutes] = useState(15);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Map<number, number | null>>(new Map());
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [score, setScore] = useState<{ correct: number; wrong: number; unanswered: number; total: number; netScore: number; feedback: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const generateQuiz = useCallback(() => {
    if (!vault) return;
    const allQuizzes = vault.quizzes || [];
    if (allQuizzes.length === 0) {
      const qs = vault.questions
        .sort(() => Math.random() - 0.5)
        .slice(0, questionCount)
        .map((q, i) => {
          const opts = q.options?.length ? q.options.map((o) => o.text) : ["A", "B", "C", "D"];
          const correctMatch = q.answer?.match(/[A-D](?=\))/)?.[0];
          return {
            id: `quiz-${i}`,
            text: q.given || q.title,
            options: opts,
            correctIndex: correctMatch ? "ABCD".indexOf(correctMatch) : 0,
            explanation: q.solution || "",
            type: "single" as const,
          };
        });
      setQuestions(qs.slice(0, questionCount));
    } else {
      const shuffled = [...allQuizzes].sort(() => Math.random() - 0.5).slice(0, questionCount);
      setQuestions(
        shuffled.map((q, i) => ({
          id: q.id || `q-${i}`,
          text: q.question,
          options: q.options?.map((o) => o.text) || ["A", "B", "C", "D"],
          correctIndex: q.options?.findIndex((o) => o.correct) ?? 0,
          explanation: q.explanation || "",
          type: "single" as const,
        }))
      );
    }
    setTimeLeft(timeMinutes * 60);
    setTimeSpent(0);
    setCurrentQ(0);
    setAnswers(new Map());
    setMarked(new Set());
    setPhase("started");
  }, [vault, questionCount, timeMinutes]);

  useEffect(() => {
    if (phase !== "started" || timeLeft <= 0) return;
    if (timeLeft <= 1) { finishQuiz(); return; }
    const t = setInterval(() => {
      setTimeLeft((p) => Math.max(0, p - 1));
      setTimeSpent((p) => p + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [phase, timeLeft]);

  const finishQuiz = async () => {
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;

    for (let i = 0; i < questions.length; i++) {
      const user = answers.get(i);
      if (user === undefined || user === null) {
        unanswered++;
      } else if (user === questions[i].correctIndex) {
        correct++;
      } else {
        wrong++;
      }
    }

    const netScore = correct * 4 - wrong * 1;
    setScore({ correct, wrong, unanswered, total: questions.length, netScore, feedback: "" });
    setPhase("finished");

    addPoints(correct * 5 + (netScore > 0 ? netScore * 2 : 0), "Quiz Completed", `${correct}/${questions.length} correct`);

    updateStudyState((state) => {
      state.quizScores.push({
        date: new Date().toISOString(),
        score: correct,
        total: questions.length,
        netScore,
      });
      questions.forEach((q, i) => {
        const userAns = answers.get(i);
        const isCorrect = userAns === q.correctIndex;
        state.questionAttempts[`quiz-${q.id}`] = {
          correct: (state.questionAttempts[`quiz-${q.id}`]?.correct || 0) + (isCorrect ? 1 : 0),
          total: (state.questionAttempts[`quiz-${q.id}`]?.total || 0) + 1,
        };
      });
    });

    if (config.enabled) {
      setAiLoading(true);
      try {
        const wrongSummary = questions
          .filter((q, i) => answers.get(i) !== q.correctIndex)
          .map((q, i) => `Q${i + 1}: ${q.text}\nCorrect: ${q.options[q.correctIndex]}\nYour: ${answers.get(i) !== undefined ? q.options[answers.get(i) as number] : "Skipped"}`)
          .join("\n\n");

        if (wrongSummary) {
          const ctx = PROMPTS.QUIZ_COACH.replace("{SCORE}", String(correct)).replace("{TOTAL}", String(questions.length)).replace("{NET_SCORE}", String(netScore));
          const analysis = PROMPTS.QUIZ_WRONG_ANALYSIS.replace("{WRONG_SUMMARY}", wrongSummary);
          const { content } = await ask(ctx, analysis);
          setScore((prev) => prev ? { ...prev, feedback: content } : prev);
        }
      } catch {}
      setAiLoading(false);
    }
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  if (!isLoaded) return <div className="min-h-screen"><Header /><div className="p-8"><div className="h-80 skeleton rounded-xl max-w-lg mx-auto" /></div></div>;

  if (phase === "config") {
    return (
      <div className="min-h-screen">
        <Header breadcrumbs={[{ label: "Quizzes", href: "/quizzes" }]} />
        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <div className="max-w-md w-full glass p-8">
            <h1 className="text-xl font-bold mb-1">JEE Pattern Quiz</h1>
            <p className="text-xs opacity-40 mb-6">+4 for correct, -1 for wrong, 0 for unanswered</p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider opacity-30 mb-2 block">Questions</label>
                <div className="flex gap-2">
                  {[5, 10, 15, 20].map((n) => (
                    <button key={n} onClick={() => setQuestionCount(n)}
                      className={cn("flex-1 py-2 text-xs", questionCount === n
                        ? "bg-[#1856FF]/20 text-[#1856FF] border border-[#1856FF]/30" : "bg-white/[0.03] opacity-50 border border-transparent")}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider opacity-30 mb-2 block">Time</label>
                <div className="flex gap-2">
                  {[10, 15, 20, 30].map((n) => (
                    <button key={n} onClick={() => setTimeMinutes(n)}
                      className={cn("flex-1 py-2 text-xs", timeMinutes === n
                        ? "bg-[#1856FF]/20 text-[#1856FF] border border-[#1856FF]/30" : "bg-white/[0.03] opacity-50 border border-transparent")}>
                      {n}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={generateQuiz}
              className="w-full mt-6 py-3 bg-[#1856FF] hover:bg-[#1856FF]/90 text-white text-sm font-medium flex items-center justify-center gap-2">
              <Timer className="w-4 h-4" /> Start Quiz
            </button>

            <div className="mt-4 p-3 bg-[#F59E0B]/5 border border-[#F59E0B]/10">
              <p className="text-[10px] text-[#F59E0B] font-semibold mb-1">Marking Scheme</p>
              <p className="text-[10px] text-white/30">+4 correct | -1 wrong | 0 unanswered</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "finished" && score) {
    const maxScore = score.total * 4;
    const pct = Math.round((score.correct / score.total) * 100);
    return (
      <div className="min-h-screen">
        <Header breadcrumbs={[{ label: "Quizzes", href: "/quizzes" }]} />
        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <div className="max-w-lg w-full glass p-8 text-center">
            <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4",
              pct >= 60 ? "bg-[#10B981]/10" : "bg-[#EF4444]/10")}>
              {pct >= 60 ? <CheckCircle className="w-10 h-10 text-[#10B981]" /> : <AlertCircle className="w-10 h-10 text-[#EF4444]" />}
            </div>
            <h1 className="text-2xl font-bold mb-2">Quiz Complete</h1>
            <p className="text-3xl font-bold text-[#1856FF] mb-1">{score.netScore}/{maxScore}</p>
            <p className="text-sm opacity-40 mb-1">Net Score</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="p-2 bg-[#10B981]/5 border border-[#10B981]/10"><p className="text-sm font-bold text-[#10B981]">{score.correct}</p><p className="text-[9px] text-white/30">Correct</p></div>
              <div className="p-2 bg-[#EF4444]/5 border border-[#EF4444]/10"><p className="text-sm font-bold text-[#EF4444]">{score.wrong}</p><p className="text-[9px] text-white/30">Wrong</p></div>
              <div className="p-2 bg-white/[0.03]"><p className="text-sm font-bold text-white/30">{score.unanswered}</p><p className="text-[9px] text-white/25">Skipped</p></div>
            </div>

            {aiLoading && (
              <div className="flex items-center justify-center gap-2 mb-4 opacity-60">
                <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
              </div>
            )}

            {score.feedback && (
              <div className="text-left p-4 bg-[#8B5CF6]/5 border border-[#8B5CF6]/10 mb-6">
                <div className="prose-glass text-xs leading-relaxed max-w-none opacity-70">
                  <MarkdownRenderer content={score.feedback} />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setPhase("config"); setScore(null); }}
                className="flex-1 py-2.5 bg-white/[0.04] opacity-60 text-xs hover:bg-white/[0.08]">
                New Quiz
              </button>
              <button onClick={generateQuiz}
                className="flex-1 py-2.5 bg-[#1856FF]/15 text-[#1856FF] text-xs hover:bg-[#1856FF]/25 border border-[#1856FF]/20">
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[currentQ];
  if (!q) return null;

  return (
    <div className="min-h-screen">
      <Header breadcrumbs={[{ label: "Quizzes", href: "/quizzes" }]} />
      <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)]">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className={cn("flex items-center gap-2 text-lg font-mono font-bold px-4 py-2",
              timeLeft < 60 ? "bg-[#EF4444]/10 text-[#EF4444]" : "glass opacity-60")}>
              <Clock className="w-4 h-4" /> {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs opacity-30">{currentQ + 1}/{questions.length}</span>
              <button onClick={() => setMarked((p) => { const n = new Set(p); n.has(currentQ) ? n.delete(currentQ) : n.add(currentQ); return n; })}
                className={cn("p-2 text-xs", marked.has(currentQ) ? "bg-[#F59E0B]/10 text-[#F59E0B]" : "opacity-30")}>
                <Flag className="w-4 h-4" />
              </button>
            </div>
          </div>

          <motion.div key={currentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass p-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] px-2 py-0.5 bg-[#EF4444]/10 text-[#EF4444]">-1 wrong</span>
              <span className="text-[10px] px-2 py-0.5 bg-[#10B981]/10 text-[#10B981]">+4 correct</span>
            </div>
            <h2 className="text-sm sm:text-base font-medium mb-6">{q.text}</h2>

            <div className="grid grid-cols-1 gap-2">
              {q.options.map((opt, oi) => {
                const selected = answers.get(currentQ) === oi;
                return (
                  <button key={oi} onClick={() => setAnswers((p) => new Map(p).set(currentQ, oi))}
                    className={cn("p-3 sm:p-4 text-sm text-left transition-all",
                      selected ? "bg-[#1856FF]/15 border border-[#1856FF]/30" : "bg-white/[0.03] border border-white/[0.06] opacity-50 hover:opacity-80")}>
                    <span className="opacity-25 mr-2">{String.fromCharCode(65 + oi)})</span> {opt}
                  </button>
                );
              })}
            </div>

            <button onClick={() => setAnswers((p) => { const n = new Map(p); n.delete(currentQ); return n; })}
              className="mt-3 text-[10px] text-[#EF4444]/50 hover:text-[#EF4444] transition-colors">
              Clear selection
            </button>
          </motion.div>

          <div className="flex items-center justify-between max-w-2xl mx-auto mt-4">
            <button onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0}
              className="flex items-center gap-1 px-4 py-2 glass-interactive disabled:opacity-20 opacity-40 text-xs">
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            {currentQ < questions.length - 1 ? (
              <button onClick={() => setCurrentQ(currentQ + 1)}
                className="flex items-center gap-1 px-4 py-2 glass-interactive opacity-60 text-xs">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={finishQuiz}
                className="px-4 py-2 bg-[#1856FF]/15 border border-[#1856FF]/20 text-[#1856FF] text-xs font-medium">
                Submit Quiz
              </button>
            )}
          </div>
        </main>

        <aside className="w-full lg:w-56 flex-shrink-0 bg-[var(--bg-surface)] border-l-0 border-r-0 border-t border-[var(--glass-border)] lg:border-t-0 lg:border-l lg:border-[var(--glass-border)] p-4">
          <p className="text-[10px] uppercase tracking-wider opacity-25 mb-3">Palette</p>
          <div className="grid grid-cols-5 sm:grid-cols-10 lg:grid-cols-5 gap-1.5">
            {questions.map((_, i) => (
              <button key={i} onClick={() => setCurrentQ(i)}
                className={cn("w-full aspect-square flex items-center justify-center text-[10px] font-medium",
                  i === currentQ && "bg-[#1856FF]/15 text-[#1856FF]",
                  i !== currentQ && answers.has(i) && "bg-[#10B981]/10 text-[#10B981]",
                  i !== currentQ && !answers.has(i) && "bg-white/[0.03] opacity-25 hover:opacity-50",
                  marked.has(i) && "ring-1 ring-[#F59E0B]/50")}>
                {i + 1}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-1">
            <div className="flex items-center gap-2 text-[10px] opacity-30"><div className="w-2.5 h-2.5 bg-[#10B981]/20" /> Answered</div>
            <div className="flex items-center gap-2 text-[10px] opacity-30"><div className="w-2.5 h-2.5 bg-[#1856FF]/20" /> Current</div>
          </div>
          <button onClick={finishQuiz}
            className="w-full mt-4 py-2 bg-[#EF4444]/10 text-[#EF4444] text-xs font-medium hover:bg-[#EF4444]/20 transition-colors">
            Submit
          </button>
        </aside>
      </div>
    </div>
  );
}

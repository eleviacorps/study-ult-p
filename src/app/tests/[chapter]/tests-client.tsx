"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useVaultStore } from "@/stores/vault-store";
import { useLlm } from "@/lib/llm-context";
import { MarkdownRenderer } from "@/components/reader/markdown-renderer";
import { updateStudyState, saveActivitySnapshot } from "@/lib/study-state";
import { PROMPTS } from "@/lib/ai-config";
import { recordEvaluationAttempt } from "@/lib/evaluation-sync";
import { Header } from "@/components/layout/header";
import { Clock, ChevronRight, ChevronLeft, Flag, CheckCircle, AlertCircle, Timer, Loader2, RefreshCw, Play } from "lucide-react";
import { cn } from "@/lib/cn";

const TEST_KEY = "studyult-test-inprogress";

function saveTestProgress(state: { questions: TestQuestion[]; currentQ: number; answers: Map<number, string | number>; marked: Set<number>; timeLeft: number; timeSpent: number }) {
  try { localStorage.setItem(TEST_KEY, JSON.stringify({
    questions: state.questions, currentQ: state.currentQ,
    answers: Array.from(state.answers.entries()), marked: Array.from(state.marked),
    timeLeft: state.timeLeft, timeSpent: state.timeSpent, savedAt: Date.now(),
  })); } catch {}
}

function clearTestProgress() {
  try { localStorage.removeItem(TEST_KEY); } catch {}
}

function loadTestProgress(): { questions: TestQuestion[]; currentQ: number; answers: Map<number, string | number>; marked: Set<number>; timeLeft: number; timeSpent: number } | null {
  try {
    const raw = localStorage.getItem(TEST_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    const elapsed = Math.floor((Date.now() - d.savedAt) / 1000);
    return {
      questions: d.questions, currentQ: d.currentQ,
      answers: new Map(d.answers), marked: new Set(d.marked),
      timeLeft: Math.max(0, d.timeLeft - elapsed),
      timeSpent: d.timeSpent + elapsed,
    };
  } catch { return null; }
}

interface TestQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  type: "mcq" | "input";
}

const QUESTION_COUNTS = [5, 10, 15, 20, 30, 50] as const;
const TIME_LIMITS = [10, 15, 20, 30, 45, 60, 90, 120] as const;

export default function TestTakePage() {
  const params = useParams<{ chapter: string }>();
  const { vault, isLoaded } = useVaultStore();
  const { ask, config, isAsking } = useLlm();
  const chapterName = decodeURIComponent(params.chapter);

  const [phase, setPhase] = useState<"config" | "loading" | "started" | "finished">("config");
  const [questionCount, setQuestionCount] = useState(10);
  const [timeMinutes, setTimeMinutes] = useState(15);
  const [customQuestionCount, setCustomQuestionCount] = useState("");
  const [customTimeMinutes, setCustomTimeMinutes] = useState("");
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Map<number, string | number>>(new Map());
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [score, setScore] = useState<{ correct: number; wrong: number; total: number; feedback: string } | null>(null);
  const [aiScoreLoading, setAiScoreLoading] = useState(false);
  const [resumeData, setResumeData] = useState<{ questions: TestQuestion[]; currentQ: number; timeLeft: number; timeSpent: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const questionsRef = useRef(questions);
  const answersRef = useRef(answers);
  questionsRef.current = questions;
  answersRef.current = answers;

  function parseJsonArray(text: string): TestQuestion[] | null {
    // Strategy 1: strip markdown code fences, then try parsing whole response
    const noFences = text.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
    try {
      const parsed = JSON.parse(noFences);
      if (Array.isArray(parsed)) return parsed as TestQuestion[];
    } catch {}

    // Strategy 2: find `[{...}]` or `[   {...}]` anywhere in the text
    const jsonMatch = text.match(/\[[\s\S]*?\]\s*(?:\n|$)/);
    if (jsonMatch) {
      try {
        const cleaned = jsonMatch[0]
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
          .replace(/,\s*\]/g, "]")
          .trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) return parsed as TestQuestion[];
      } catch {}
    }
    return null;
  }

  const generateQuestions = useCallback(async () => {
    const actualCount = customQuestionCount ? parseInt(customQuestionCount) || questionCount : questionCount;
    setPhase("loading");

    const chapterQs = vault?.questions.filter((q) => q.chapter === chapterName) || [];
    const shuffled = [...chapterQs].sort(() => Math.random() - 0.5);

    if (shuffled.length === 0) {
      setErrorMessage("No questions available for this chapter in the vault.");
      setPhase("config");
      return;
    }

    const questionsContent = shuffled.map((q, i) =>
      `Q${i+1}. ${q.given || q.title}\nOptions: ${q.options?.map(o => `${o.label}) ${o.text}`).join(" | ") || "N/A"}\nAnswer: ${q.answer}\nDifficulty: ${q.difficulty}\n`
    ).join("\n").substring(0, 8000);

    let mapped: TestQuestion[] | null = null;

    // Try AI-based question selection with proper answer mapping
    try {
      const prompt = PROMPTS.TEST_GENERATOR.replace("{COUNT}", String(actualCount)).replace("{QUESTIONS}", questionsContent);
      const { content: response } = await ask(prompt, "", { reasoning: false });
      const parsed = parseJsonArray(response);
      if (parsed && parsed.length > 0) {
        mapped = parsed.slice(0, actualCount);
      }
    } catch {}

    // Fallback: use vault questions directly
    if (!mapped) {
      const selected = shuffled.slice(0, actualCount);
      mapped = selected.map((q) => ({
        text: q.given || q.title || "",
        options: q.options?.map((o) => `${o.label}) ${o.text}`) || ["A", "B", "C", "D"],
        correctIndex: q.options?.findIndex((o) => {
          const answerLabel = (q.answer || "").trim().charAt(0).toUpperCase();
          return o.label.toUpperCase() === answerLabel;
        }) ?? 0,
        type: "mcq" as const,
      }));
    }

    setQuestions(mapped);
    setTimeLeft(timeMinutes * 60);
    setTimeSpent(0);
    setCurrentQ(0);
    setAnswers(new Map());
    setMarked(new Set());
    setPhase("started");
    clearTestProgress();
  }, [vault, chapterName, questionCount, timeMinutes, customQuestionCount, ask]);

  useEffect(() => {
    if (phase !== "started" || timeLeft <= 0) return;
    if (timeLeft <= 1) { finishTest(); return; }
    const t = setInterval(() => {
      setTimeLeft((p) => Math.max(0, p - 1));
      setTimeSpent((p) => p + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [phase, timeLeft]);

  // Check for in-progress test on mount
  useEffect(() => {
    const saved = loadTestProgress();
    if (saved && saved.questions.length > 0 && saved.timeLeft > 0) {
      setResumeData(saved);
    }
  }, []);

  // Save progress on every meaningful change during "started" phase
  useEffect(() => {
    if (phase !== "started") return;
    saveTestProgress({ questions, currentQ, answers, marked, timeLeft, timeSpent });
  }, [phase, currentQ, answers, marked, timeLeft, questions]);

  // Capture timer on visibility change
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden" && phase === "started") {
        saveTestProgress({ questions, currentQ, answers, marked, timeLeft, timeSpent });
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [phase, questions, currentQ, answers, marked, timeLeft, timeSpent]);

  const resumeTest = () => {
    if (!resumeData) return;
    setQuestions(resumeData.questions);
    setCurrentQ(resumeData.currentQ);
    setTimeLeft(resumeData.timeLeft);
    setTimeSpent(resumeData.timeSpent);
    setResumeData(null);
    setPhase("started");
  };

  const discardTest = () => {
    clearTestProgress();
    setResumeData(null);
  };

  const startTest = () => {
    const totalMin = customTimeMinutes ? parseInt(customTimeMinutes) || timeMinutes : timeMinutes;
    setTimeMinutes(totalMin);
    generateQuestions();
  };

  const finishTest = async () => {
    const qs = questionsRef.current;
    const ans = answersRef.current;
    let correct = 0;
    for (let i = 0; i < qs.length; i++) {
      const user = ans.get(i);
      const q = qs[i];
      if (q.type === "mcq" && typeof user === "number" && user === q.correctIndex) correct++;
    }

    setScore({ correct, wrong: qs.length - correct, total: qs.length, feedback: "" });
    setPhase("finished");
    clearTestProgress();

    const today = new Date().toISOString().split("T")[0];

    updateStudyState((state) => {
      qs.forEach((q, i) => {
        const userAns = ans.get(i);
        const isCorrect = q.type === "mcq"
          ? (typeof userAns === "number" && userAns === q.correctIndex)
          : (typeof userAns === "string" && userAns.trim().length > 0);
        recordEvaluationAttempt({
          surface: "test",
          questionId: `${chapterName}-q${i}`,
          topic: `${chapterName} > Test Q${i + 1}`,
          chapter: chapterName,
          correct: isCorrect,
          score: isCorrect ? 1 : 0,
          maxScore: 1,
          metadata: {
            selected: userAns ?? null,
            correctIndex: q.correctIndex,
            type: q.type,
          },
        });
        const key = `test-${chapterName}-q${i}`;
        const current = state.questionAttempts[key] || { correct: 0, total: 0 };
        state.questionAttempts[key] = {
          correct: current.correct + (isCorrect ? 1 : 0),
          total: current.total + 1,
        };
        const topicKey = `${chapterName} > Test Q${i}`;
        const t = state.topicAccuracy[topicKey] || { correct: 0, total: 0 };
        state.topicAccuracy[topicKey] = {
          correct: t.correct + (isCorrect ? 1 : 0),
          total: t.total + 1,
        };
      });
      state.testScores.push({
        date: new Date().toISOString(),
        score: correct,
        total: qs.length,
        chapter: chapterName,
      });
      state.studyMinutes[today] = (state.studyMinutes[today] || 0) + Math.round(timeSpent / 60);
    });
    saveActivitySnapshot("test", correct, qs.length, chapterName, qs.map((q) => q.text.substring(0, 40)));

    if (config.enabled && correct < qs.length) {
      setAiScoreLoading(true);
      try {
        const wrongQs = qs
          .map((q, i) => {
            const userAns = ans.get(i);
            if (userAns === undefined || userAns === null) return "";
            if (typeof userAns === "number" && userAns === q.correctIndex) return "";
            return `Q${i+1}: ${q.text}\nCorrect: ${q.options[q.correctIndex] || "N/A"}\nYour answer: ${typeof userAns === "number" ? q.options[userAns] || "skipped" : userAns}`;
          })
          .filter(Boolean).join("\n\n");

        const feedbackContext = PROMPTS.TEST_FEEDBACK
          .replace("{CHAPTER}", chapterName)
          .replace("{SCORE}", String(correct))
          .replace("{TOTAL}", String(questions.length))
          .replace("{PERCENT}", String(Math.round((correct / questions.length) * 100)))
          .replace("{MINUTES}", String(Math.round(timeSpent / 60)));

        const analysisPrompt = PROMPTS.TEST_WRONG_ANALYSIS.replace("{WRONG_QUESTIONS}", wrongQs);

        const { content } = await ask(feedbackContext, analysisPrompt, { reasoning: false });
        setScore((prev) => prev ? { ...prev, feedback: content } : prev);
      } catch {}
      setAiScoreLoading(false);
    }
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  if (resumeData) {
    return (
      <div className="min-h-screen">
        <Header breadcrumbs={[{ label: "Mock Tests", href: "/tests" }, { label: chapterName, href: "#" }]} />
        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <div className="glass p-8 max-w-md w-full text-center">
            <RefreshCw className="w-10 h-10 mx-auto mb-3 text-[#F59E0B]" />
            <h2 className="text-lg font-semibold mb-1">In-Progress Test Found</h2>
            <p className="text-sm opacity-40 mb-1">{resumeData.questions.length} questions</p>
            <p className="text-xs opacity-30 mb-6">
              {Math.floor(resumeData.timeLeft / 60)}m {resumeData.timeLeft % 60}s remaining on Q{resumeData.currentQ + 1}
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={resumeTest} className="px-5 py-2 bg-[#1856FF] hover:bg-[#1856FF]/90 text-white text-sm flex items-center gap-2 transition-all">
                <Play className="w-4 h-4" /> Resume Test
              </button>
              <button onClick={discardTest} className="px-5 py-2 bg-[#EF4444]/10 text-[#EF4444] text-sm border border-[#EF4444]/20 flex items-center gap-2 hover:bg-[#EF4444]/20 transition-all">
                Discard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoaded) return <div className="min-h-screen"><Header /><div className="p-8"><div className="h-80 skeleton rounded-xl max-w-lg mx-auto" /></div></div>;

  if (phase === "config") {
    return (
      <div className="min-h-screen">
        <Header breadcrumbs={[{ label: "Mock Tests", href: "/tests" }, { label: chapterName, href: "#" }]} />
        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <div className="max-w-md w-full glass p-8">
            <h1 className="text-xl font-bold mb-1">{chapterName}</h1>
            <p className="text-xs opacity-40 mb-6" style={{ color: "var(--text-muted)" }}>
              {config.enabled ? "AI will generate questions from your vault" : "AI service is unavailable"}
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider opacity-30 mb-2 block">Questions</label>
                <div className="flex gap-2 flex-wrap">
                  {QUESTION_COUNTS.map((n) => (
                    <button key={n} onClick={() => { setQuestionCount(n); setCustomQuestionCount(""); }}
                      className={cn("py-2 px-3 rounded-lg text-xs",
                        questionCount === n && !customQuestionCount ? "bg-[#1856FF]/20 text-[#1856FF] border border-[#1856FF]/30" : "bg-white/[0.03] opacity-50 border border-transparent")}>
                      {n}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    value={customQuestionCount}
                    onChange={(e) => { setCustomQuestionCount(e.target.value); if (e.target.value) setQuestionCount(0); }}
                    placeholder="Custom"
                    className="w-20 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs outline-none focus:border-[#1856FF]/30"
                    style={{ color: "var(--text-primary)" }}
                  />
                  {customQuestionCount && <span className="text-[10px] opacity-30">custom quantity</span>}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider opacity-30 mb-2 block">Time Limit (minutes)</label>
                <div className="flex gap-2 flex-wrap">
                  {TIME_LIMITS.map((n) => (
                    <button key={n} onClick={() => { setTimeMinutes(n); setCustomTimeMinutes(""); }}
                      className={cn("py-2 px-3 rounded-lg text-xs",
                        timeMinutes === n && !customTimeMinutes ? "bg-[#1856FF]/20 text-[#1856FF] border border-[#1856FF]/30" : "bg-white/[0.03] opacity-50 border border-transparent")}>
                      {n}m
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    value={customTimeMinutes}
                    onChange={(e) => { setCustomTimeMinutes(e.target.value); if (e.target.value) setTimeMinutes(0); }}
                    placeholder="Custom min"
                    className="w-24 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs outline-none focus:border-[#1856FF]/30"
                    style={{ color: "var(--text-primary)" }}
                  />
                  {customTimeMinutes && <span className="text-[10px] opacity-30">custom time</span>}
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="mt-4 p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20">
                <p className="text-[10px] text-[#EF4444]">{errorMessage}</p>
              </div>
            )}

            <button onClick={() => { setErrorMessage(""); startTest(); }} disabled={isAsking}
              className="w-full mt-6 py-3 rounded-xl bg-[#1856FF] hover:bg-[#1856FF]/90 disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2">
              {isAsking ? <><Loader2 className="w-4 h-4 animate-spin" /> AI generating...</> : <><Timer className="w-4 h-4" /> Start Test</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="min-h-screen"><Header />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#1856FF] mx-auto mb-4" />
            <p className="text-sm opacity-60">AI is generating your test questions...</p>
            <p className="text-xs opacity-30 mt-1">This may take a few seconds</p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "finished" && score) {
    const pct = Math.round((score.correct / score.total) * 100);
    return (
      <div className="min-h-screen">
        <Header breadcrumbs={[{ label: "Mock Tests", href: "/tests" }, { label: chapterName, href: "#" }]} />
        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <div className="max-w-lg w-full glass p-8 text-center">
            <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4",
              pct >= 60 ? "bg-[#10B981]/10" : "bg-[#EF4444]/10")}>
              {pct >= 60 ? <CheckCircle className="w-10 h-10 text-[#10B981]" /> : <AlertCircle className="w-10 h-10 text-[#EF4444]" />}
            </div>
            <h1 className="text-2xl font-bold mb-2">Test Complete</h1>
            <p className="text-3xl font-bold text-[#1856FF] mb-1">{score.correct}/{score.total}</p>
            <p className="text-sm opacity-40 mb-1">{pct}% accuracy</p>
            <p className="text-[10px] opacity-20 mb-4">Time: {Math.round(timeSpent / 60)}m {timeSpent % 60}s</p>

            {aiScoreLoading && (
              <div className="flex items-center justify-center gap-2 mb-4 opacity-60">
                <Loader2 className="w-4 h-4 animate-spin" /> AI analyzing mistakes...
              </div>
            )}

            {score.feedback && (
              <div className="text-left p-4 rounded-xl bg-[#8B5CF6]/5 border border-[#8B5CF6]/10 mb-6">
                <div className="prose-glass text-xs leading-relaxed max-w-none opacity-70">
                  <MarkdownRenderer content={score.feedback} />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setPhase("config"); setScore(null); }}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.04] opacity-60 text-xs hover:bg-white/[0.08]">
                New Test
              </button>
              <button onClick={() => generateQuestions()}
                className="flex-1 py-2.5 rounded-xl bg-[#1856FF]/15 text-[#1856FF] text-xs hover:bg-[#1856FF]/25 border border-[#1856FF]/20">
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
      <Header breadcrumbs={[{ label: "Mock Tests", href: "/tests" }, { label: chapterName, href: "#" }]} />
      <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)]">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className={cn("flex items-center gap-2 text-lg font-mono font-bold px-4 py-2 rounded-xl",
              timeLeft < 60 ? "bg-[#EF4444]/10 text-[#EF4444]" : "glass opacity-60")}>
              <Clock className="w-4 h-4" /> {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs opacity-30">{currentQ + 1}/{questions.length}</span>
              <button onClick={() => setMarked((p) => { const n = new Set(p); n.has(currentQ) ? n.delete(currentQ) : n.add(currentQ); return n; })}
                className={cn("p-2 rounded-xl text-xs", marked.has(currentQ) ? "bg-[#F59E0B]/10 text-[#F59E0B]" : "opacity-30")}>
                <Flag className="w-4 h-4" />
              </button>
            </div>
          </div>

          <motion.div key={currentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass p-6 max-w-2xl mx-auto">
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] opacity-25 mb-3 inline-block">
              {q.type === "mcq" ? "MCQ" : "Text Input"}
            </span>
            <h2 className="text-sm sm:text-base font-medium mb-6">{q.text}</h2>

            {q.type === "mcq" ? (
              <div className="grid grid-cols-1 gap-2">
                {q.options.map((opt, oi) => {
                  const selected = answers.get(currentQ) === oi;
                  return (
                    <button key={oi} onClick={() => setAnswers((p) => new Map(p).set(currentQ, oi))}
                      className={cn("p-3 sm:p-4 rounded-xl text-sm text-left transition-all",
                        selected ? "bg-[#1856FF]/15 border border-[#1856FF]/30" : "bg-white/[0.03] border border-white/[0.06] opacity-50 hover:opacity-80")}>
                      <span className="opacity-25 mr-2">{String.fromCharCode(65 + oi)})</span> {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={(answers.get(currentQ) as string) || ""}
                  onChange={(e) => setAnswers((p) => new Map(p).set(currentQ, e.target.value))}
                  placeholder="Type your answer..."
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm outline-none focus:border-[#1856FF]/30"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
            )}
          </motion.div>

          <div className="flex items-center justify-between max-w-2xl mx-auto mt-4">
            <button onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0}
              className="flex items-center gap-1 px-4 py-2 rounded-xl glass-interactive disabled:opacity-20 opacity-40 text-xs">
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            {currentQ < questions.length - 1 ? (
              <button onClick={() => setCurrentQ(currentQ + 1)}
                className="flex items-center gap-1 px-4 py-2 rounded-xl glass-interactive opacity-60 text-xs">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={finishTest}
                className="px-4 py-2 rounded-xl bg-[#1856FF]/15 border border-[#1856FF]/20 text-[#1856FF] text-xs font-medium">
                Submit Test
              </button>
            )}
          </div>
        </main>

        <aside className="w-full lg:w-56 flex-shrink-0 glass border-l-0 border-r-0 border-t border-t-[var(--glass-border)] lg:border-t-0 lg:border-l lg:border-l-[var(--glass-border)] rounded-none p-4">
          <p className="text-[10px] uppercase tracking-wider opacity-25 mb-3">Palette</p>
          <div className="grid grid-cols-5 sm:grid-cols-10 lg:grid-cols-5 gap-1.5">
            {questions.map((_, i) => (
              <button key={i} onClick={() => setCurrentQ(i)}
                className={cn("w-full aspect-square rounded-md flex items-center justify-center text-[10px] font-medium transition-colors",
                  i === currentQ && "bg-[#1856FF]/15 text-[#1856FF]",
                  i !== currentQ && answers.has(i) && "bg-[#10B981]/10 text-[#10B981]",
                  i !== currentQ && !answers.has(i) && "bg-white/[0.03] opacity-25 hover:opacity-50",
                  marked.has(i) && "ring-1 ring-[#F59E0B]/50")}>
                {i + 1}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-1">
            <div className="flex items-center gap-2 text-[10px] opacity-30"><div className="w-2.5 h-2.5 rounded bg-[#10B981]/20" /> Answered</div>
            <div className="flex items-center gap-2 text-[10px] opacity-30"><div className="w-2.5 h-2.5 rounded bg-[#1856FF]/20" /> Current</div>
          </div>
          <button onClick={finishTest}
            className="w-full mt-4 py-2 rounded-lg bg-[#EF4444]/10 text-[#EF4444] text-xs font-medium hover:bg-[#EF4444]/20 transition-colors">
            Submit
          </button>
        </aside>
      </div>
    </div>
  );
}

"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVaultStore } from "@/stores/vault-store";
import { Header } from "@/components/layout/header";
import { MarkdownRenderer } from "@/components/reader/markdown-renderer";
import { useLlm } from "@/lib/llm-context";
import { updateStudyState, addPoints } from "@/lib/study-state";
import { getAiCache, setAiCache } from "@/lib/ai-cache";
import { PROMPTS } from "@/lib/ai-config";
import { recordEvaluationAttempt } from "@/lib/evaluation-sync";
import type { Question } from "@/types";
import {
  Lightbulb,
  ChevronDown,
  ListOrdered,
  BrainCircuit,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Bot,
  Loader2,
  Send,
  RotateCcw,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/cn";

const PAGE_SIZE = 15;

interface AiStructured {
  insight: string;
  approach: string;
  hint: string;
  stepByStep: string;
  answer: string;
}

function getTopicContent(vault: any, question: Question): string {
  const chapterNotes = vault?.notes?.filter((n: any) => n.chapter === question.chapter) || [];
  const relevant = chapterNotes.filter((n: any) =>
    question.topic && n.title.toLowerCase().includes(question.topic.toLowerCase())
  );
  if (relevant.length > 0) {
    return relevant.map((n: any) => n.content).join("\n\n").substring(0, 4000);
  }
  return chapterNotes.map((n: any) => n.content).join("\n\n").substring(0, 4000);
}

function parseAiJson(raw: string): AiStructured | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      insight: parsed.insight || "",
      approach: parsed.approach || "",
      hint: parsed.hint || "",
      stepByStep: parsed.stepByStep || parsed.step_by_step || "",
      answer: parsed.answer || "",
    };
  } catch {
    return null;
  }
}

function saveAnswer(questionId: string, chapter: string, topic: string, correct: boolean, syncEvaluation = true) {
  updateStudyState((state) => {
    const key = `q-${questionId}`;
    const current = state.questionAttempts[key] || { correct: 0, total: 0 };
    state.questionAttempts[key] = {
      correct: current.correct + (correct ? 1 : 0),
      total: current.total + 1,
    };
    const today = new Date().toISOString().split("T")[0];
    state.lastStudyDate = today;
    state.studyMinutes[today] = (state.studyMinutes[today] || 0) + 5;

    if (topic) {
      const tc = state.topicAccuracy[topic] || { correct: 0, total: 0 };
      state.topicAccuracy[topic] = {
        correct: tc.correct + (correct ? 1 : 0),
        total: tc.total + 1,
      };
    }
  });
  addPoints(correct ? 10 : 2, correct ? "Correct Answer" : "Answer Attempt", `${chapter} - ${topic || "General"}`);
  if (syncEvaluation) {
    recordEvaluationAttempt({
      surface: "practice",
      questionId,
      topic: topic || chapter,
      chapter,
      correct,
      score: correct ? 1 : 0,
      maxScore: 1,
    });
  }
}

function QuestionCard({ question, index }: { question: Question; index: number }) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStructured, setAiStructured] = useState<AiStructured | null>(null);
  const [aiRawContent, setAiRawContent] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [answerJudged, setAnswerJudged] = useState(false);
  const [aiScore, setAiScore] = useState<{ score: number; maxScore: number; feedback: string } | null>(null);
  const [showAnswerRevealed, setShowAnswerRevealed] = useState(false);
  const [judgeLoading, setJudgeLoading] = useState(false);
  const { vault } = useVaultStore();
  const { ask, config } = useLlm();

  const toggle = (key: string) => {
    const next = new Set(revealed);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setRevealed(next);
  };

  const solutionsRevealed = showAnswerRevealed || revealed.has("solution") || !!selectedOption;
  const isMcq = question.options && question.options.length >= 2;
  const correctLabel = question.answer?.trim().match(/^[A-D]/i)?.[0]?.toUpperCase() || "";

  const handleMcqSelect = (label: string) => {
    if (selectedOption) return;
    setSelectedOption(label);
    const correct = label === correctLabel;
    saveAnswer(question.id, question.chapter, question.topic, correct);
  };

  const handleAiHelp = async () => {
    if (aiLoading || aiStructured) return;

    const cached = getAiCache(question.id);
    if (cached) {
      setAiStructured({
        insight: cached.insight,
        approach: cached.approach,
        hint: cached.hint,
        stepByStep: cached.stepByStep,
        answer: cached.answer,
      });
      return;
    }

    setAiLoading(true);

    const topicContent = getTopicContent(vault, question);
    const context = PROMPTS.QUESTION_EXPLAINER.replace("{CONTENT}", topicContent);

    const questionText = `Question: ${question.title}\nGiven: ${question.given || "N/A"}\n${question.find ? `Find: ${question.find}` : ""}\n${question.options ? "Options: " + question.options.map((o) => `${o.label}) ${o.text}`).join(" | ") : ""}\nSolution: ${question.solution || "Not provided"}\nCorrect Answer: ${question.answer || "Not provided"}\n\nYou MUST respond with ONLY a valid JSON object (no markdown, no extra text). The JSON must have these exact keys:\n- "insight": A clear conceptual insight about the underlying physics principle (use LaTeX $$ for formulas).\n- "approach": A systematic step-by-step approach to solve this problem.\n- "hint": A single helpful hint that guides the student without giving away the full solution.\n- "stepByStep": A detailed step-by-step solution with full working (use LaTeX $$ for all formulas and equations).\n- "answer": The final answer clearly stated.\n\nFormat the JSON exactly like this:\n{\n  "insight": "...",\n  "approach": "...",\n  "hint": "...",\n  "stepByStep": "...",\n  "answer": "..."\n}`;

    const { content } = await ask(context, questionText);
    const structured = parseAiJson(content);

    if (structured) {
      setAiStructured(structured);
      setAiCache(question.id, { ...structured, rawContent: content });
    } else {
      setAiRawContent(content);
      setAiCache(question.id, { insight: "", approach: "", hint: "", stepByStep: "", answer: "", rawContent: content });
    }
    setAiLoading(false);
  };

  const handleJudgeAnswer = async () => {
    if (!userAnswer.trim() || judgeLoading) return;
    setJudgeLoading(true);

    const topicContent = getTopicContent(vault, question);
    const context = PROMPTS.STRICT_EXAMINER.replace("{CONTENT}", topicContent);

    const findLine = question.find ? `Find: ${question.find}` : "";
    const judgePrompt = PROMPTS.ANSWER_JUDGE
      .replace("{TITLE}", question.title)
      .replace("{GIVEN}", question.given || "N/A")
      .replace("{FIND_LINE}", findLine)
      .replace("{ANSWER}", question.answer || "Not provided")
      .replace("{SOLUTION}", question.solution || "Not provided")
      .replace("{USER_ANSWER}", userAnswer);

    const { content } = await ask(context, judgePrompt);
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        setAiScore({
          score: result.score ?? 0,
          maxScore: result.maxScore ?? 10,
          feedback: result.feedback ?? "",
        });
        const passed = (result.score ?? 0) >= 6;
        saveAnswer(question.id, question.chapter, question.topic, passed, false);
        recordEvaluationAttempt({
          surface: "ai_judge",
          questionId: question.id,
          topic: question.topic || question.chapter,
          chapter: question.chapter,
          subject: question.subject,
          correct: passed,
          score: result.score ?? 0,
          maxScore: result.maxScore ?? 10,
          feedback: result.feedback ?? "",
          misconception: passed ? "" : result.feedback ?? "",
        });
        setAnswerJudged(true);
      }
    } catch {}
    setJudgeLoading(false);
  };

  const handleRetry = () => {
    setAiStructured(null);
    setAiRawContent(null);
    setUserAnswer("");
    setAnswerJudged(false);
    setAiScore(null);
    setShowAnswerRevealed(false);
    setSelectedOption(null);
    const next = new Set(revealed);
    next.delete("answers");
    next.delete("insight");
    next.delete("approach");
    next.delete("hint");
    next.delete("solution");
    next.delete("storedAnswer");
    setRevealed(next);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-5 sm:p-6"
    >
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-xs font-mono opacity-20">Q{index + 1}</span>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-[10px] px-2 py-0.5 rounded-md font-medium",
            question.difficulty === "Easy" ? "bg-[#10B981]/10 text-[#10B981]" :
            question.difficulty === "Hard" ? "bg-[#EF4444]/10 text-[#EF4444]" :
            "bg-[#F59E0B]/10 text-[#F59E0B]")}>
            {question.difficulty}
          </span>
          {question.topic && <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] opacity-30">{question.topic}</span>}
          <span className="text-[10px] opacity-20">{question.marks} marks</span>
        </div>
      </div>

      <h3 className="text-sm font-semibold mb-3">{question.title}</h3>

      {question.given && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wider opacity-25 mb-1">Given</p>
          <div className="text-xs opacity-60"><MarkdownRenderer content={question.given} /></div>
        </div>
      )}

      {question.find && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wider opacity-25 mb-1">Find</p>
          <div className="text-xs opacity-60"><MarkdownRenderer content={question.find} /></div>
        </div>
      )}

      {isMcq && question.options && question.options.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {question.options.map((opt) => {
            const isSelected = selectedOption === opt.label;
            const isCorrect = opt.label === correctLabel;
            const showResult = !!selectedOption;
            return (
              <button
                key={opt.label}
                onClick={() => handleMcqSelect(opt.label)}
                disabled={!!selectedOption}
                className={cn("p-2.5 rounded-xl text-xs text-left transition-all border",
                  !showResult && "bg-white/[0.03] border-white/[0.04] opacity-50 hover:border-white/[0.1]",
                  showResult && isCorrect && "bg-[#10B981]/10 border-[#10B981]/30",
                  showResult && isSelected && !isCorrect && "bg-[#EF4444]/10 border-[#EF4444]/30",
                  showResult && !isSelected && !isCorrect && "bg-white/[0.03] border-white/[0.04] opacity-20",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="opacity-25">{opt.label})</span>
                  <span className="flex-1">{opt.text}</span>
                  {showResult && isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] flex-shrink-0" />}
                  {showResult && isSelected && !isCorrect && <XCircle className="w-3.5 h-3.5 text-[#EF4444] flex-shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Show Answer (from stored answer field) ── */}
      {question.answer && (
        <div className="mt-3 pt-3 border-t border-white/[0.04]">
          <button
            onClick={() => setShowAnswerRevealed(!showAnswerRevealed)}
            className="flex items-center gap-2 text-xs opacity-40 hover:opacity-70 transition-colors"
          >
            {showAnswerRevealed ? (
              <><EyeOff className="w-3.5 h-3.5" /> Hide Answer</>
            ) : (
              <><Eye className="w-3.5 h-3.5" /> Show Answer</>
            )}
          </button>
          <AnimatePresence>
            {showAnswerRevealed && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="p-3 mt-2 rounded-xl bg-[#10B981]/5 border border-[#10B981]/20">
                <p className="text-[10px] uppercase tracking-wider opacity-25 mb-1">Answer</p>
                <div className="prose-glass text-xs opacity-80 leading-relaxed max-w-none">
                  <MarkdownRenderer content={question.answer} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Solution (from stored solution field) ── */}
      {question.solution && (
        <div className="mt-3">
          <button
            onClick={() => toggle("solution_local")}
            className="flex items-center gap-2 text-xs opacity-40 hover:opacity-70 transition-colors"
          >
            <ListOrdered className="w-3.5 h-3.5" />
            {revealed.has("solution_local") ? "Hide Solution" : "Show Solution"}
          </button>
          <AnimatePresence>
            {revealed.has("solution_local") && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="p-3 mt-2 rounded-xl bg-[#06B6D4]/5 border border-[#06B6D4]/20">
                <p className="text-[10px] uppercase tracking-wider opacity-25 mb-1">Solution</p>
                <div className="prose-glass text-xs opacity-80 leading-relaxed max-w-none">
                  <MarkdownRenderer content={question.solution} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Explanation (from stored explanation field) ── */}
      {question.explanation && (
        <div className="mt-3">
          <button
            onClick={() => toggle("explanation")}
            className="flex items-center gap-2 text-xs opacity-40 hover:opacity-70 transition-colors"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            {revealed.has("explanation") ? "Hide Explanation" : "Show Explanation"}
          </button>
          <AnimatePresence>
            {revealed.has("explanation") && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="p-3 mt-2 rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/20">
                <p className="text-[10px] uppercase tracking-wider opacity-25 mb-1">Explanation</p>
                <div className="prose-glass text-xs opacity-80 leading-relaxed max-w-none">
                  <MarkdownRenderer content={question.explanation} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Your Answer Input (always visible) ── */}
      <div className="mt-4 pt-3 border-t border-white/[0.04]">
        {solutionsRevealed ? (
          <div className="mb-3 p-2.5 rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/20 text-[10px] text-[#F59E0B]/70">
            Grading skipped — solution was revealed
          </div>
        ) : !isMcq && (
          <div className="mb-3 space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-[10px] uppercase tracking-wider opacity-25">Your Answer</p>
              {answerJudged && aiScore && (
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded",
                  aiScore.score >= 6 ? "bg-[#10B981]/10 text-[#10B981]" : "bg-[#EF4444]/10 text-[#EF4444]")}>
                  {aiScore.score}/{aiScore.maxScore}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your answer..."
                disabled={answerJudged}
                className="flex-1 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs outline-none focus:border-[#1856FF]/30 disabled:opacity-30"
                style={{ color: "var(--text-primary)" }}
              />
              <button
                onClick={handleJudgeAnswer}
                disabled={!userAnswer.trim() || judgeLoading || answerJudged}
                className="px-3 py-2 rounded-xl bg-[#1856FF]/15 text-[#1856FF] text-xs border border-[#1856FF]/20 hover:bg-[#1856FF]/25 disabled:opacity-20 flex items-center gap-1.5"
              >
                {judgeLoading ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Judging</>
                ) : answerJudged ? (
                  <><CheckCircle2 className="w-3 h-3" /> Done</>
                ) : (
                  <><Send className="w-3 h-3" /> Submit</>
                )}
              </button>
            </div>
            {aiScore && aiScore.feedback && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-[#8B5CF6]/5 border border-[#8B5CF6]/10">
                <div className="prose-glass text-[11px] opacity-70 leading-relaxed max-w-none">
                  <MarkdownRenderer content={aiScore.feedback} />
                </div>
              </motion.div>
            )}
          </div>
        )}

        <button
          onClick={handleAiHelp}
          disabled={aiLoading || !!aiStructured}
          className="flex items-center gap-2 text-xs opacity-40 hover:opacity-70 transition-colors disabled:opacity-20"
        >
          {aiLoading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Asking AI...</>
          ) : aiStructured || aiRawContent ? (
            <><Bot className="w-3.5 h-3.5 text-[#8B5CF6]" /> AI Insights Generated</>
          ) : getAiCache(question.id) ? (
            <><Bot className="w-3.5 h-3.5 text-[#10B981]" /> Load Cached AI Insights</>
          ) : (
            <><Bot className="w-3.5 h-3.5" /> Ask AI to analyze this question</>
          )}
        </button>

        {(aiStructured || aiRawContent) && (
          <div className="space-y-2 mt-3">
            {aiRawContent && !aiStructured && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                className="p-3 rounded-xl bg-[#8B5CF6]/5 border border-[#8B5CF6]/10">
                <div className="prose-glass text-xs opacity-70 leading-relaxed max-w-none">
                  <MarkdownRenderer content={aiRawContent} />
                </div>
              </motion.div>
            )}

            {aiStructured && (
              <>
                <AiSection
                  key="insight"
                  stepKey="insight"
                  label="AI Insight & Approach"
                  icon={BrainCircuit}
                  color="indigo"
                  revealed={revealed}
                  onToggle={toggle}
                >
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider opacity-25 mb-1">Concept Insight</p>
                      <div className="prose-glass text-xs opacity-70 leading-relaxed max-w-none">
                        <MarkdownRenderer content={aiStructured.insight} />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider opacity-25 mb-1">Approach</p>
                      <div className="prose-glass text-xs opacity-70 leading-relaxed max-w-none">
                        <MarkdownRenderer content={aiStructured.approach} />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider opacity-25 mb-1">Hint</p>
                      <div className="prose-glass text-xs opacity-70 leading-relaxed max-w-none">
                        <MarkdownRenderer content={aiStructured.hint} />
                      </div>
                    </div>
                  </div>
                </AiSection>

                <AiSection
                  stepKey="solution"
                  label="Step-by-Step Solution & Answer"
                  icon={ListOrdered}
                  color="emerald"
                  revealed={revealed}
                  onToggle={toggle}
                >
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider opacity-25 mb-1">Step-by-Step</p>
                      <div className="prose-glass text-xs opacity-70 leading-relaxed max-w-none">
                        <MarkdownRenderer content={aiStructured.stepByStep} />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider opacity-25 mb-1">Answer</p>
                      <div className="prose-glass text-xs opacity-70 leading-relaxed max-w-none">
                        <MarkdownRenderer content={aiStructured.answer} />
                      </div>
                    </div>
                  </div>
                </AiSection>


              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex justify-end">
        <button
          onClick={handleRetry}
          className="flex items-center gap-1.5 text-[10px] opacity-25 hover:opacity-50 transition-opacity"
        >
          <RotateCcw className="w-3 h-3" /> Retry
        </button>
      </div>
    </motion.div>
  );
}

function AiSection({
  stepKey,
  label,
  icon: Icon,
  color,
  revealed,
  onToggle,
  children,
}: {
  stepKey: string;
  label: string;
  icon: typeof BrainCircuit;
  color: string;
  revealed: Set<string>;
  onToggle: (key: string) => void;
  children: React.ReactNode;
}) {
  const isOpen = revealed.has(stepKey);
  return (
    <div>
      <button
        onClick={() => onToggle(stepKey)}
        className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/[0.04]"
      >
        <div className="flex items-center gap-2.5">
          <Icon className={cn("w-4 h-4", isOpen ? "opacity-60" : "opacity-20")} />
          <span className={cn("text-xs", isOpen ? "opacity-70" : "opacity-30")}>
            {label}
          </span>
        </div>
        <ChevronDown className={cn("w-3.5 h-3.5 opacity-20 transition-transform", isOpen && "rotate-180")} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="p-3 mx-1 rounded-b-xl bg-white/[0.02] border-t border-white/[0.04]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function QuestionsPage() {
  const params = useParams<{ chapter: string }>();
  const { vault, isLoaded } = useVaultStore();
  const [page, setPage] = useState(0);
  const chapterName = decodeURIComponent(params.chapter);

  if (!isLoaded || !vault) {
    return (<div className="min-h-screen"><Header /><div className="p-8 space-y-4">{Array.from({ length: 3 }).map((_, i) => (<div key={i} className="h-40 skeleton rounded-[20px]" />))}</div></div>);
  }

  const allQuestions = vault.questions.filter((q) => q.chapter === chapterName);
  const totalPages = Math.max(1, Math.ceil(allQuestions.length / PAGE_SIZE));
  const questions = allQuestions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="min-h-screen">
      <Header breadcrumbs={[{ label: "Questions", href: "/questions" }, { label: chapterName, href: "#" }]} />
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold mb-1">{chapterName}</h1>
            <p className="text-sm opacity-35">{allQuestions.length} questions · Page {page + 1} of {totalPages}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
              className="p-2 rounded-xl glass-interactive disabled:opacity-20 opacity-40"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-xs opacity-30 px-2">{page + 1}/{totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
              className="p-2 rounded-xl glass-interactive disabled:opacity-20 opacity-40"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="space-y-4">
          {questions.map((q, i) => (<QuestionCard key={q.id} question={q} index={page * PAGE_SIZE + i} />))}
        </div>
      </div>
    </div>
  );
}

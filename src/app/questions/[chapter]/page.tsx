"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVaultStore } from "@/stores/vault-store";
import { Header } from "@/components/layout/header";
import { useLlm } from "@/lib/llm-context";
import type { Question } from "@/types";
import {
  Lightbulb,
  ChevronDown,
  Calculator,
  ListOrdered,
  BrainCircuit,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Bot,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/cn";

const PAGE_SIZE = 15;

const steps = [
  { key: "think", label: "Think Yourself", icon: BrainCircuit, color: "cyan" },
  { key: "hint", label: "Show Hint", icon: Lightbulb, color: "amber" },
  { key: "approach", label: "Show Approach", icon: ListOrdered, color: "purple" },
  { key: "formula", label: "Formula Used", icon: Calculator, color: "primary" },
  { key: "solution", label: "Step-by-Step", icon: ListOrdered, color: "emerald" },
  { key: "insight", label: "AI Insight", icon: BrainCircuit, color: "indigo" },
  { key: "mistake", label: "Common Mistake", icon: AlertTriangle, color: "red" },
];

function getTopicContent(vault: any, question: Question): string {
  const chapterNotes = vault?.notes?.filter((n: any) => n.chapter === question.chapter) || [];
  const relevant = chapterNotes.filter((n: any) =>
    question.topic && n.title.toLowerCase().includes(question.topic.toLowerCase())
  );
  if (relevant.length > 0) {
    return relevant.map((n: any) => n.content).join("\n\n").substring(0, 3000);
  }
  return chapterNotes.map((n: any) => n.content).join("\n\n").substring(0, 3000);
}

function QuestionCard({ question, index }: { question: Question; index: number }) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isMcqMode, setIsMcqMode] = useState(!!question.options?.length);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const { vault } = useVaultStore();
  const { ask, config } = useLlm();

  const toggle = (key: string) => {
    const next = new Set(revealed);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setRevealed(next);
  };

  const showAnswer = revealed.has("solution");
  const isMcq = question.options && question.options.length >= 2;

  const correctLabel = question.answer?.match(/[A-D](?=\))/)?.[0] || "";

  const handleMcqSelect = (label: string) => {
    if (selectedOption) return;
    setSelectedOption(label);
  };

  const handleAiHelp = async () => {
    if (aiLoading || aiAnswer) return;
    setAiLoading(true);
    const context = `You are a JEE physics tutor. Here is the chapter content:\n\n${getTopicContent(vault, question)}\n\nQuestion: ${question.title}\nGiven: ${question.given || "N/A"}\nSolution: ${question.solution || "Not provided"}\nAnswer: ${question.answer}`;
    const response = await ask(context, "Explain this question's concept, solution approach, and any tips for similar problems. Be concise.");
    setAiAnswer(response);
    setAiLoading(false);
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
          <p className="text-xs opacity-60">{question.given}</p>
        </div>
      )}

      {question.find && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wider opacity-25 mb-1">Find</p>
          <p className="text-xs opacity-60">{question.find}</p>
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

      <div className="space-y-2 mt-4">
        {steps.map((step) => (
          <div key={step.key}>
            <button onClick={() => toggle(step.key)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/[0.04]">
              <div className="flex items-center gap-2.5">
                <step.icon className={cn("w-4 h-4", revealed.has(step.key) ? "opacity-60" : "opacity-20")} />
                <span className={cn("text-xs", revealed.has(step.key) ? "opacity-70" : "opacity-30")}>{step.label}</span>
              </div>
              <ChevronDown className={cn("w-3.5 h-3.5 opacity-20 transition-transform", revealed.has(step.key) && "rotate-180")} />
            </button>
            <AnimatePresence>
              {revealed.has(step.key) && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="p-3 mx-1 rounded-b-xl bg-white/[0.02] border-t border-white/[0.04]">
                    {step.key === "think" && <p className="text-xs opacity-40 italic">Take a moment to think before revealing...</p>}
                    {step.key === "hint" && <p className="text-xs opacity-50">Identify relevant physical laws and convert to SI units first.</p>}
                    {step.key === "approach" && (
                      <div className="text-xs opacity-50 space-y-1">
                        <p>1. List all given quantities with SI units</p>
                        <p>2. Select the appropriate formula</p>
                        <p>3. Substitute values</p>
                        <p>4. Calculate the result</p>
                      </div>
                    )}
                    {step.key === "formula" && <p className="text-xs opacity-50">The relevant formula is determined by the topic. Check notes for exact expressions.</p>}
                    {step.key === "solution" && (
                      <div className="text-xs opacity-60 leading-relaxed whitespace-pre-wrap break-words">
                        {String(question.solution || question.answer || "").replace(/\[\[([^\]]+)\]\]/g, "$1").replace(/\*\*/g, "")}
                      </div>
                    )}
                    {step.key === "insight" && (
                      <p className="text-xs opacity-50">This tests conceptual understanding. Understanding the physics is more important than memorizing formulas.</p>
                    )}
                    {step.key === "mistake" && (
                      <p className="text-xs opacity-50">⚠️ Common mistake: Forgetting unit conversions. Always convert to SI before calculations.</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {showAnswer && question.answer && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="mt-4 p-3 rounded-xl bg-[#10B981]/5 border border-[#10B981]/10">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
            <span className="text-[10px] font-semibold text-[#10B981] uppercase tracking-wider">Answer</span>
          </div>
          <p className="text-xs opacity-60 whitespace-pre-wrap break-words">
            {String(question.answer || "").replace(/\[\[([^\]]+)\]\]/g, "$1").replace(/\*\*/g, "")}
          </p>
        </motion.div>
      )}

      <div className="mt-4 pt-3 border-t border-white/[0.04]">
        <button
          onClick={handleAiHelp}
          disabled={aiLoading || !!aiAnswer}
          className="flex items-center gap-2 text-xs opacity-40 hover:opacity-70 transition-colors disabled:opacity-20"
        >
          {aiLoading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Asking AI...</>
          ) : aiAnswer ? (
            <><Bot className="w-3.5 h-3.5 text-[#8B5CF6]" /> AI Explanation:</>
          ) : (
            <><Bot className="w-3.5 h-3.5" /> Ask AI to explain this question</>
          )}
        </button>
        {aiAnswer && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            className="mt-2 p-3 rounded-xl bg-[#8B5CF6]/5 border border-[#8B5CF6]/10 text-xs opacity-60 leading-relaxed">
            {aiAnswer}
          </motion.div>
        )}
      </div>
    </motion.div>
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

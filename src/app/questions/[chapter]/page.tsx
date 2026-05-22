"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVaultStore } from "@/stores/vault-store";
import { Header } from "@/components/layout/header";
import type { Question } from "@/types";
import {
  Lightbulb,
  ChevronDown,
  Calculator,
  ListOrdered,
  BrainCircuit,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/cn";

const steps = [
  { key: "think", label: "Think Yourself", icon: BrainCircuit, color: "cyan" },
  { key: "hint", label: "Show Hint", icon: Lightbulb, color: "amber" },
  { key: "approach", label: "Show Approach", icon: ListOrdered, color: "purple" },
  { key: "formula", label: "Formula Used", icon: Calculator, color: "primary" },
  { key: "solution", label: "Step-by-Step", icon: ListOrdered, color: "emerald" },
  { key: "insight", label: "AI Insight", icon: BrainCircuit, color: "indigo" },
  { key: "mistake", label: "Common Mistake", icon: AlertTriangle, color: "red" },
];

function QuestionCard({ question, index }: { question: Question; index: number }) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    const next = new Set(revealed);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setRevealed(next);
  };

  const showAnswer = revealed.has("solution");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-mono text-white/20">Q{index + 1}</span>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-md font-medium",
              question.difficulty === "Easy"
                ? "bg-[#10B981]/10 text-[#10B981]"
                : question.difficulty === "Hard"
                ? "bg-[#EF4444]/10 text-[#EF4444]"
                : "bg-[#F59E0B]/10 text-[#F59E0B]"
            )}
          >
            {question.difficulty}
          </span>
          {question.topic && (
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-white/30">
              {question.topic}
            </span>
          )}
          <span className="text-[10px] text-white/20">{question.marks} marks</span>
        </div>
      </div>

      <h3 className="text-sm font-semibold mb-3">{question.title}</h3>

      {question.given && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wider text-white/25 mb-1">
            Given
          </p>
          <p className="text-xs text-white/60">{question.given}</p>
        </div>
      )}

      {question.find && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wider text-white/25 mb-1">
            Find
          </p>
          <p className="text-xs text-white/60">{question.find}</p>
        </div>
      )}

      {question.options && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {question.options.map((opt) => (
            <div
              key={opt.label}
              className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04] text-xs text-white/50"
            >
              <span className="text-white/25 mr-2">{opt.label})</span>
              {opt.text}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 mt-4">
        {steps.map((step) => (
          <div key={step.key}>
            <button
              onClick={() => toggle(step.key)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/[0.04]"
            >
              <div className="flex items-center gap-2.5">
                <step.icon
                  className={cn(
                    "w-4 h-4",
                    revealed.has(step.key)
                      ? cn(
                          step.color === "cyan" && "text-[#06B6D4]",
                          step.color === "amber" && "text-[#F59E0B]",
                          step.color === "purple" && "text-[#8B5CF6]",
                          step.color === "primary" && "text-[#1856FF]",
                          step.color === "emerald" && "text-[#10B981]",
                          step.color === "indigo" && "text-[#6366F1]",
                          step.color === "red" && "text-[#EF4444]"
                        )
                      : "text-white/20"
                  )}
                />
                <span
                  className={cn(
                    "text-xs",
                    revealed.has(step.key) ? "text-white/70" : "text-white/30"
                  )}
                >
                  {step.label}
                </span>
              </div>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 text-white/20 transition-transform",
                  revealed.has(step.key) && "rotate-180"
                )}
              />
            </button>
            <AnimatePresence>
              {revealed.has(step.key) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 mx-1 rounded-b-xl bg-white/[0.02] border-t border-white/[0.04]">
                    {step.key === "think" && (
                      <p className="text-xs text-white/40 italic">
                        Take a moment to think about the approach before revealing the solution...
                      </p>
                    )}
                    {step.key === "hint" && (
                      <p className="text-xs text-white/50">
                        💡 Start by identifying the relevant formula. For this problem, consider
                        the relationship between the given quantities and what you need to find.
                      </p>
                    )}
                    {step.key === "approach" && (
                      <div className="text-xs text-white/50 space-y-1">
                        <p>1. Identify all given quantities and their units</p>
                        <p>2. Determine which physical law applies</p>
                        <p>3. Set up the equation with known values</p>
                        <p>4. Solve for the unknown</p>
                      </div>
                    )}
                    {step.key === "formula" && (
                      <p className="text-xs text-white/50">
                        The relevant formula involves the quantities mentioned in the given section.
                        Check the corresponding topic notes for exact equations.
                      </p>
                    )}
                    {step.key === "solution" && (
                      <div className="text-xs text-white/60 leading-relaxed">
                        {question.solution || question.answer}
                      </div>
                    )}
                    {step.key === "insight" && (
                      <p className="text-xs text-white/50">
                        This type of problem frequently appears in JEE. Understanding the underlying
                        concept will help you solve variations with different values.
                      </p>
                    )}
                    {step.key === "mistake" && (
                      <p className="text-xs text-white/50">
                        ⚠️ Common mistake: Forgetting to convert units to SI before plugging into
                        formulas. Always check centimeters → meters, micro → 10⁻⁶, etc.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {showAnswer && question.answer && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-4 p-3 rounded-xl bg-[#10B981]/5 border border-[#10B981]/10"
        >
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
            <span className="text-[10px] font-semibold text-[#10B981] uppercase tracking-wider">
              Answer
            </span>
          </div>
          <p className="text-xs text-white/60">{question.answer}</p>
        </motion.div>
      )}
    </motion.div>
  );
}

export default function QuestionsPage() {
  const params = useParams<{ chapter: string }>();
  const { vault, isLoaded } = useVaultStore();

  const chapterName = decodeURIComponent(params.chapter);

  if (!isLoaded || !vault) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="p-8 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 skeleton rounded-[20px]" />
          ))}
        </div>
      </div>
    );
  }

  const questions = vault.questions.filter((q) => q.chapter === chapterName);

  return (
    <div className="min-h-screen">
      <Header
        breadcrumbs={[
          { label: "Questions", href: "/questions" },
          { label: chapterName, href: "#" },
        ]}
      />
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">{chapterName}</h1>
          <p className="text-sm text-white/35">
            {questions.length} questions
          </p>
        </div>
        <div className="space-y-4">
          {questions.map((q, i) => (
            <QuestionCard key={q.id} question={q} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ChevronUp, BookOpen, Lightbulb, Target,
  AlertTriangle, Zap, Brain, CheckCircle, XCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface QuestionData {
  id: string;
  title: string;
  number: number;
  topic: string;
  subtopic: string;
  difficulty: string;
  type: string;
  marks: number;
  given: string;
  find: string;
  approach: string;
  solution: string;
  answer: string;
  explanation: string;
  content: string;
}

interface QuestionCardProps {
  question: QuestionData;
  index: number;
}

const difficultyColors: Record<string, string> = {
  Easy: "text-green-400 bg-green-400/10 border-green-400/20",
  Moderate: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  Hard: "text-red-400 bg-red-400/10 border-red-400/20",
};

function QuestionCard({ question, index }: QuestionCardProps) {
  const [open, setOpen] = useState(false);
  const dc = difficultyColors[question.difficulty] || "text-white/40 bg-white/[0.04] border-white/[0.04]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl border border-white/[0.04] overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#1856FF]/10 flex items-center justify-center text-xs font-semibold text-[#1856FF]">
          {question.number}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/80 font-medium line-clamp-2">{question.title}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border", dc)}>
              {question.difficulty}
            </span>
            {question.topic && (
              <span className="text-[10px] text-white/30 px-1.5 py-0.5 rounded-full bg-white/[0.03]">
                {question.topic}
              </span>
            )}
            {question.type && (
              <span className="text-[10px] text-white/30 px-1.5 py-0.5 rounded-full bg-white/[0.03]">
                {question.type}
              </span>
            )}
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-white/20 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/20 flex-shrink-0" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-white/[0.04] pt-3">
              {question.given && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Given</p>
                  <p className="text-sm text-white/60 whitespace-pre-wrap">{question.given}</p>
                </div>
              )}
              {question.find && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Find</p>
                  <p className="text-sm text-white/60 whitespace-pre-wrap">{question.find}</p>
                </div>
              )}
              {question.approach && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Approach</p>
                  <p className="text-sm text-white/60 whitespace-pre-wrap">{question.approach}</p>
                </div>
              )}
              {question.solution && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Solution</p>
                  <p className="text-sm text-white/60 whitespace-pre-wrap font-mono">{question.solution}</p>
                </div>
              )}
              {question.answer && (
                <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-green-400/60 mb-1">Answer</p>
                  <p className="text-sm text-green-400 whitespace-pre-wrap">{question.answer}</p>
                </div>
              )}
              {question.explanation && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Explanation</p>
                  <p className="text-sm text-white/60 whitespace-pre-wrap">{question.explanation}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function parseQuestionsFromContent(content: string): QuestionData[] {
  // Split by ## Q<number>. pattern, but only in the questions/mcq sections
  const lines = content.split("\n");
  const sections: string[] = [];
  let currentSection = "";
  let inQuestionSection = false;

  for (const line of lines) {
    if (line.startsWith("## ") && !line.match(/^## Q\d/)) {
      // Non-question heading — check if it's a questions/mcqs section
      const isQSection = /question|mcq|practice/i.test(line);
      if (isQSection || inQuestionSection) {
        if (currentSection.trim()) sections.push(currentSection);
        currentSection = "";
        inQuestionSection = isQSection;
      } else {
        if (currentSection.trim()) sections.push(currentSection);
        currentSection = "";
        inQuestionSection = false;
      }
    }
    if (inQuestionSection) {
      currentSection += line + "\n";
    }
  }
  if (currentSection.trim() && inQuestionSection) sections.push(currentSection);

  // Parse questions from each section
  const questions: QuestionData[] = [];
  for (const section of sections) {
    const blocks = section.split(/^## Q(\d+)\.\s*/m).filter(Boolean);
    // blocks[0] = text before Q1 (skip)
    // blocks[1] = number "1", blocks[2] = content
    for (let i = 1; i + 1 < blocks.length; i += 2) {
      const num = parseInt(blocks[i], 10);
      const content = blocks[i + 1];
      const titleLine = content.split("\n")[0]?.trim() || "";
      
      questions.push({
        id: `q-${num}`,
        title: titleLine,
        number: num,
        topic: "",
        subtopic: "",
        difficulty: "",
        type: "",
        marks: 0,
        given: "",
        find: "",
        approach: "",
        solution: "",
        answer: "",
        explanation: "",
        content: content,
      });
    }
  }
  return questions;
}

export { QuestionCard, parseQuestionsFromContent };

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Lightbulb, ListOrdered, ChevronDown, ChevronUp } from "lucide-react";
import { MarkdownRenderer } from "@/components/reader/markdown-renderer";
import { cn } from "@/lib/cn";

interface ParsedQ {
  id: string;
  number: number;
  title: string;
  topic: string;
  subtopic: string;
  difficulty: string;
  type: string;
  marks: string;
  given: string;
  find: string;
  approach: string;
  solution: string;
  answer: string;
  explanation: string;
}

function parseQuestionBlocks(content: string): ParsedQ[] {
  const blocks = content.split(/^## Q(\d+)\.\s*/m).filter(Boolean);
  const results: ParsedQ[] = [];
  for (let i = 1; i + 1 < blocks.length; i += 2) {
    const num = parseInt(blocks[i], 10);
    const raw = blocks[i + 1];
    const titleLine = raw.split("\n")[0]?.replace(/^##\s*/, "").trim() || "";

    const get = (key: string) => {
      const re = new RegExp(`### ${key}:\\s*\\n([\\s\\S]*?)(?=\\n###\\s|\\n##\\s|$)`, "i");
      const m = raw.match(re);
      return m ? m[1].trim() : "";
    };

    results.push({
      id: `q-${num}`,
      number: num,
      title: titleLine,
      topic: raw.match(/\*\*Topic:\*\*\s*(.+?)(?:\||$)/)?.[1]?.trim() || "",
      subtopic: raw.match(/\*\*Subtopic:\*\*\s*(.+?)(?:\||$)/)?.[1]?.trim() || "",
      difficulty: raw.match(/\*\*Difficulty:\*\*\s*(.+?)(?:\||$)/)?.[1]?.trim() || "",
      type: raw.match(/\*\*Type:\*\*\s*(.+?)(?:\||$)/)?.[1]?.trim() || "",
      marks: raw.match(/\*\*Marks:\*\*\s*(.+?)(?:\||$|\\n)/)?.[1]?.trim() || "",
      given: get("Given"),
      find: get("Find"),
      approach: get("Approach"),
      solution: get("Solution"),
      answer: get("Answer"),
      explanation: raw.match(/### Explanation:\\s*\\n([\\s\\S]*?)(?=\\n###\\s|\\n##\\s|$)/i)?.[1]?.trim() || "",
    });
  }
  return results;
}

const difficultyClass = (d: string) =>
  d === "Easy" ? "bg-[#10B981]/10 text-[#10B981]" :
  d === "Hard" ? "bg-[#EF4444]/10 text-[#EF4444]" :
  "bg-[#F59E0B]/10 text-[#F59E0B]";

export function QuestionCard({ block, index }: { block: ParsedQ; index: number }) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="glass p-5 sm:p-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-xs font-mono opacity-20">Q{index + 1}</span>
        <div className="flex items-center gap-2 flex-wrap">
          {block.difficulty && (
            <span className={cn("text-[10px] px-2 py-0.5 rounded-md font-medium", difficultyClass(block.difficulty))}>
              {block.difficulty}
            </span>
          )}
          {block.topic && <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] opacity-30">{block.topic}</span>}
          {block.marks && <span className="text-[10px] opacity-20">{block.marks} marks</span>}
        </div>
      </div>

      <h3 className="text-sm font-semibold mb-3">{block.title}</h3>

      {/* Given */}
      {block.given && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wider opacity-25 mb-1">Given</p>
          <div className="text-xs opacity-60"><MarkdownRenderer content={block.given} /></div>
        </div>
      )}

      {/* Find */}
      {block.find && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wider opacity-25 mb-1">Find</p>
          <div className="text-xs opacity-60"><MarkdownRenderer content={block.find} /></div>
        </div>
      )}

      {/* Solution toggle */}
      {block.solution && (
        <div className="mb-3">
          <button onClick={() => setShowSolution(!showSolution)}
            className="flex items-center gap-2 text-xs opacity-40 hover:opacity-70 transition-colors">
            <ListOrdered className="w-3.5 h-3.5" />
            {showSolution ? "Hide Solution" : "Show Solution"}
          </button>
          <AnimatePresence>
            {showSolution && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="p-3 mt-2 rounded-xl bg-[#1856FF]/5 border border-[#1856FF]/20">
                <p className="text-[10px] uppercase tracking-wider opacity-25 mb-1">Solution</p>
                <div className="prose-glass text-xs opacity-80 leading-relaxed max-w-none">
                  <MarkdownRenderer content={block.solution} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Approach */}
      {block.approach && (
        <div className="mb-3">
          <button onClick={() => {/* toggle approach */}}
            className="flex items-center gap-2 text-xs opacity-40 hover:opacity-70 transition-colors">
            <Lightbulb className="w-3.5 h-3.5" />
            Approach
          </button>
        </div>
      )}

      {/* Answer toggle */}
      {block.answer && (
        <div className="mt-3 pt-3 border-t border-white/[0.04]">
          <button onClick={() => setShowAnswer(!showAnswer)}
            className="flex items-center gap-2 text-xs opacity-40 hover:opacity-70 transition-colors">
            {showAnswer ? <><EyeOff className="w-3.5 h-3.5" /> Hide Answer</> : <><Eye className="w-3.5 h-3.5" /> Show Answer</>}
          </button>
          <AnimatePresence>
            {showAnswer && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="p-3 mt-2 rounded-xl bg-[#10B981]/5 border border-[#10B981]/20">
                <p className="text-[10px] uppercase tracking-wider opacity-25 mb-1">Answer</p>
                <div className="prose-glass text-xs opacity-80 leading-relaxed max-w-none">
                  <MarkdownRenderer content={block.answer} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

export { parseQuestionBlocks };

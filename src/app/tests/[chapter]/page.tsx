"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/header";
import { Clock, Flag, ChevronRight } from "lucide-react";

export default function TestTakePage() {
  const params = useParams<{ chapter: string }>();
  const chapterName = decodeURIComponent(params.chapter);
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [started]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  const questions = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    status: i === 0 ? "current" : i < 3 ? "answered" : "unseen",
  }));

  return (
    <div className="min-h-screen">
      <Header
        breadcrumbs={[
          { label: "Mock Tests", href: "/tests" },
          { label: chapterName, href: "#" },
        ]}
      />
      <div className="flex h-[calc(100vh-4rem)]">
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {!started ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto mt-20 glass p-8 text-center"
            >
              <div className="w-16 h-16 rounded-3xl bg-[#1856FF]/10 flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8 text-[#1856FF]" />
              </div>
              <h1 className="text-xl font-bold mb-2">{chapterName}</h1>
              <p className="text-sm text-white/40 mb-4">
                20 questions • 30 minutes • JEE Pattern
              </p>
              <div className="space-y-2 mb-6 text-left">
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <Flag className="w-3.5 h-3.5" />+4 for correct, -1 for wrong
                </div>
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <Flag className="w-3.5 h-3.5" />Questions can be marked for review
                </div>
              </div>
              <button
                onClick={() => setStarted(true)}
                className="w-full py-3 rounded-xl bg-[#1856FF] hover:bg-[#1856FF]/90 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                Start Test <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            <div className="max-w-2xl mx-auto">
              <div className="glass p-6 mb-6 text-center">
                <div className="text-3xl font-mono font-bold text-white/80">
                  {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
                </div>
                <p className="text-[10px] text-white/25 mt-1">Time Remaining</p>
              </div>

              <div className="glass p-8">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-mono text-white/25">Q1</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#10B981]/10 text-[#10B981]">
                    Easy
                  </span>
                </div>
                <p className="text-sm mb-6">
                  Two point charges +2μC and +3μC are placed 30cm apart in vacuum.
                  Calculate the magnitude of the electrostatic force between them.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {["0.3 N", "0.6 N", "0.9 N", "1.2 N"].map((opt, i) => (
                    <button
                      key={i}
                      className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.04] text-sm text-white/60 hover:border-white/[0.1] hover:bg-white/[0.05] transition-all text-left"
                    >
                      <span className="text-white/25 mr-2">
                        {String.fromCharCode(65 + i)})
                      </span>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>

        {started && (
          <aside className="w-64 glass border-l-0 border-r-0 border-t-0 border-b-0 rounded-none p-4 overflow-y-auto">
            <p className="text-[10px] uppercase tracking-wider text-white/25 mb-3">
              Question Palette
            </p>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-medium ${
                    q.status === "answered"
                      ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/20"
                      : q.status === "current"
                      ? "bg-[#1856FF]/15 text-[#1856FF] border border-[#1856FF]/20"
                      : "bg-white/[0.03] text-white/25"
                  }`}
                >
                  {q.id}
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-[10px] text-white/30">
                <div className="w-3 h-3 rounded bg-[#10B981]/15 border border-[#10B981]/20" />
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
            </div>
            <button className="w-full mt-6 py-2.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-xs font-medium hover:bg-[#EF4444]/20 transition-colors">
              Submit Test
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { useVaultStore } from "@/stores/vault-store";
import { Header } from "@/components/layout/header";
import Link from "next/link";
import { Clock, Timer, ChevronRight, BookOpen } from "lucide-react";

export default function TestsRootPage() {
  const { vault, isLoaded } = useVaultStore();

  const testChapters =
    vault?.chapters.filter((ch) =>
      vault.questions.some((q) => q.chapter === ch.name)
    ) || [];

  return (
    <div className="min-h-screen">
      <Header title="Mock Tests" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Mock Tests</h1>
        <p className="text-sm text-white/35 mb-8">
          JEE-pattern tests with timer, marking, and AI-powered analytics
        </p>

        {!isLoaded ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 skeleton rounded-[20px]" />
            ))}
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Timer className="w-4 h-4 text-[#1856FF]" />
                Chapter Tests
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {testChapters.map((ch, i) => (
                  <motion.div
                    key={ch.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      href={`/tests/${encodeURIComponent(ch.name)}`}
                      className="glass glass-interactive p-5 block no-underline"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold">{ch.name}</h3>
                        <ChevronRight className="w-4 h-4 text-white/20" />
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-white/30">
                        <span>{vault?.questions.filter((q) => q.chapter === ch.name).length || 0} questions available</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#10B981]/10 text-[#10B981]">
                          Custom quantity & timer
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#8B5CF6]/10 text-[#8B5CF6]">
                          AI feedback
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-[#8B5CF6]" />
                Full-Length & Advanced Tests
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    name: "Full Physics — All Chapters",
                    desc: `${vault?.questions.length || 0} questions available`,
                    time: "2 hours",
                    chapter: vault?.chapters[0]?.name || "",
                  },
                  {
                    name: "Mixed Chapter — Random Selection",
                    desc: "Questions from all chapters mixed",
                    time: "1.5 hours",
                    chapter: vault?.chapters[0]?.name || "",
                  },
                  {
                    name: "JEE Advanced Pattern",
                    desc: "Multiple sections, negative marking",
                    time: "3 hours",
                    chapter: vault?.chapters[0]?.name || "",
                  },
                  {
                    name: "Quick Sprint — 15 Questions",
                    desc: "Fast-paced practice with tight timer",
                    time: "15 min",
                    chapter: vault?.chapters[0]?.name || "",
                  },
                ].map((test, i) => (
                  <motion.div
                    key={test.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass p-5 flex flex-col"
                  >
                    <h3 className="text-sm font-semibold mb-1">{test.name}</h3>
                    <p className="text-[10px] text-white/25 mb-3">{test.desc}</p>
                    <div className="flex items-center gap-3 text-[10px] text-white/30 mb-4">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {test.time}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-auto">
                      <Link
                        href={`/tests/${encodeURIComponent(test.chapter)}`}
                        className="flex-1 py-2.5 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 text-[#8B5CF6] text-xs hover:bg-[#8B5CF6]/20 transition-colors text-center no-underline"
                      >
                        Start
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useVaultStore } from "@/stores/vault-store";
import { Command, Search, FileText, HelpCircle, Layers } from "lucide-react";
import { cn } from "@/lib/cn";

interface SearchResult {
  id: string;
  title: string;
  type: "note" | "question" | "flashcard";
  chapter: string;
  snippet: string;
  href: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { vault } = useVaultStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!vault || !query.trim()) {
      setResults([]);
      return;
    }
    const q = query.toLowerCase();

    const noteResults: SearchResult[] = vault.notes
      .filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags.some((t) => t.toLowerCase().includes(q)))
      .slice(0, 5)
      .map((n) => ({
        id: n.id,
        title: n.title,
        type: "note" as const,
        chapter: n.chapter,
        snippet: n.content.substring(0, 120).replace(/\n/g, " "),
        href: `/reader/${encodeURIComponent(n.chapter)}/${encodeURIComponent(n.title)}`,
      }));

    const questionResults: SearchResult[] = vault.questions
      .filter((qn) => qn.title.toLowerCase().includes(q) || qn.topic.toLowerCase().includes(q) || qn.tags.some((t) => t.toLowerCase().includes(q)))
      .slice(0, 5)
      .map((qn) => ({
        id: qn.id,
        title: qn.title,
        type: "question" as const,
        chapter: qn.chapter,
        snippet: `${qn.difficulty} · ${qn.topic} · ${qn.marks} marks`,
        href: `/questions/${encodeURIComponent(qn.chapter)}`,
      }));

    const flashcardResults: SearchResult[] = vault.flashcards
      .filter((f) => f.question.toLowerCase().includes(q) || f.topic.toLowerCase().includes(q) || f.tags.some((t) => t.toLowerCase().includes(q)))
      .slice(0, 3)
      .map((f) => ({
        id: f.id,
        title: f.question,
        type: "flashcard" as const,
        chapter: f.chapter,
        snippet: f.topic,
        href: `/flashcards/${encodeURIComponent(f.chapter)}`,
      }));

    setResults([...noteResults, ...questionResults, ...flashcardResults].slice(0, 12));
    setSelectedIndex(0);
  }, [query, vault]);

  const navigate = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      router.push(result.href);
    },
    [router]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      navigate(results[selectedIndex]);
    }
  };

  const typeIcon = {
    note: FileText,
    question: HelpCircle,
    flashcard: Layers,
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-white/25 hover:text-white/40 transition-colors"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-white/[0.04] border border-white/[0.06]">
          <Command className="w-2.5 h-2.5" />K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg bg-[var(--bg-elevated)] border border-[var(--glass-border)] rounded-2xl shadow-2xl mx-4">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--glass-border)]">
              <Search className="w-4 h-4 text-white/20" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search notes, questions, flashcards..."
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--text-primary)" }}
              />
              <kbd className="text-[10px] px-1.5 py-0.5 bg-white/[0.04] border border-white/[0.06] text-white/20">
                ESC
              </kbd>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {query.trim() && results.length === 0 ? (
                <div className="p-6 text-center text-xs text-white/20">
                  No results found for &quot;{query}&quot;
                </div>
              ) : results.length > 0 ? (
                results.map((result, i) => {
                  const Icon = typeIcon[result.type];
                  return (
                    <button
                      key={result.id}
                      onClick={() => navigate(result)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={cn(
                        "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors",
                        i === selectedIndex ? "bg-[#1856FF]/10" : "hover:bg-white/[0.02]"
                      )}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        <Icon className="w-4 h-4 text-white/30" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>
                          {result.title}
                        </p>
                        <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                          {result.snippet}
                        </p>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 bg-white/[0.03] border border-white/[0.06] text-white/20 flex-shrink-0">
                        {result.type}
                      </span>
                    </button>
                  );
                })
              ) : query.trim() === "" ? (
                <div className="p-6 text-center text-xs text-white/15">
                  Type to search across all content
                </div>
              ) : null}
            </div>

            {results.length > 0 && (
              <div className="px-4 py-2 border-t border-[var(--glass-border)] flex items-center justify-between text-[10px] text-white/15">
                <span>{results.length} results</span>
                <span className="flex items-center gap-0.5">↑↓ navigate · ↵ select · ESC close</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

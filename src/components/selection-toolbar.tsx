"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Search, Video, FileText } from "lucide-react";

interface SelectionToolbarProps {
  onExplain: (text: string) => void;
  onSummarize: (text: string) => void;
  onManim: (text: string) => void;
  onSearchVideos: (text: string) => void;
}

export function SelectionToolbar({ onExplain, onSummarize, onManim, onSearchVideos }: SelectionToolbarProps) {
  const [selectedText, setSelectedText] = useState("");
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const handleSelection = useCallback(() => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (text && text.length > 2) {
      setSelectedText(text);
      const range = sel?.getRangeAt(0);
      if (range) {
        const rect = range.getBoundingClientRect();
        setPosition({
          x: rect.left + rect.width / 2 - 150,
          y: rect.top - 56 - window.scrollY,
        });
      }
    } else {
      setSelectedText("");
      setPosition(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("keyup", handleSelection);
    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("keyup", handleSelection);
    };
  }, [handleSelection]);

  const dismiss = () => {
    setSelectedText("");
    setPosition(null);
  };

  const actions = [
    { icon: Sparkles, label: "Explain", action: () => { onExplain(selectedText); dismiss(); } },
    { icon: FileText, label: "Summarize", action: () => { onSummarize(selectedText); dismiss(); } },
    { icon: Video, label: "Manim", action: () => { onManim(selectedText); dismiss(); } },
    { icon: Search, label: "Videos", action: () => { onSearchVideos(selectedText); dismiss(); } },
  ];

  return (
    <AnimatePresence>
      {position && selectedText && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="fixed z-50 flex items-center gap-1 px-2 py-1.5 rounded-xl bg-[#0c0c0f]/95 backdrop-blur-xl border border-white/[0.08] shadow-2xl"
          style={{
            left: Math.max(10, position.x),
            top: Math.max(10, position.y),
          }}
        >
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={a.action}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors whitespace-nowrap"
            >
              <a.icon className="w-3.5 h-3.5 text-[#1856FF]" />
              {a.label}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

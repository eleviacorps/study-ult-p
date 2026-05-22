"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useVaultStore } from "@/stores/vault-store";
import { Header } from "@/components/layout/header";
import { MarkdownRenderer } from "@/components/reader/markdown-renderer";
import { updateStudyState, addPoints } from "@/lib/study-state";
import type { Flashcard } from "@/types";
import { RotateCw, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { cn } from "@/lib/cn";

function FlashcardView({ card, flipped, onFlip }: { card: Flashcard; flipped: boolean; onFlip: () => void }) {
  return (
    <div className="perspective-1000 w-full max-w-lg mx-auto" style={{ minHeight: 340 }}>
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
        className="relative w-full preserve-3d cursor-pointer"
        style={{ transformStyle: "preserve-3d", minHeight: 340 }}
        onClick={onFlip}
      >
        <div
          className="absolute inset-0 glass p-8 flex flex-col items-center justify-center text-center backface-hidden rounded-[24px]"
          style={{ backfaceVisibility: "hidden" }}
        >
          <span className="text-[10px] text-white/25 mb-4 uppercase tracking-widest">
            {card.topic}
          </span>
          <h3 className="text-lg font-semibold mb-3 leading-relaxed">
            {card.question}
          </h3>
          <p className="text-[11px] text-white/20 mt-auto">Tap to reveal answer</p>
        </div>

        <div
          className="absolute inset-0 glass p-8 flex flex-col items-center justify-center text-center backface-hidden rounded-[24px] overflow-y-auto"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <span className="text-[10px] text-[#10B981]/60 mb-4 uppercase tracking-widest">
            Answer
          </span>
          <p className="text-sm leading-relaxed text-white/70 mb-3">
            {card.answer}
          </p>
          {card.formula && (
            <div className="mt-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] w-full">
              <MarkdownRenderer content={card.formula} />
            </div>
          )}
          {card.memoryTrick && (
            <div className="mt-3 p-3 rounded-xl bg-[#F97316]/5 border border-[#F97316]/10 w-full">
              <p className="text-[10px] text-[#F97316] mb-1 font-semibold uppercase tracking-wider">
                Memory Trick
              </p>
              <p className="text-xs text-white/50">{card.memoryTrick}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function FlashcardsPage() {
  const params = useParams<{ chapter: string }>();
  const { vault, isLoaded } = useVaultStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [confidence, setConfidence] = useState<Map<number, number>>(new Map());

  const chapterName = decodeURIComponent(params.chapter);

  useEffect(() => {
    setCurrentIndex(0);
    setFlipped(false);
  }, [chapterName]);

  if (!isLoaded || !vault) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="p-8 flex flex-col items-center gap-4">
          <div className="h-80 w-full max-w-lg skeleton rounded-[24px]" />
        </div>
      </div>
    );
  }

  const cards = vault.flashcards.filter((f) => f.chapter === chapterName);

  if (cards.length === 0) {
    return (
      <div className="min-h-screen">
        <Header
          breadcrumbs={[
            { label: "Flashcards", href: "/flashcards" },
            { label: chapterName, href: "#" },
          ]}
        />
        <div className="p-8 text-center">
          <p className="text-white/30">No flashcards found for this chapter.</p>
        </div>
      </div>
    );
  }

  const card = cards[currentIndex];
  const cardConfidence = confidence.get(currentIndex);

  const setRating = (rating: number) => {
    setConfidence((prev) => new Map(prev).set(currentIndex, rating));

    updateStudyState((state) => {
      const fcId = card.id;
      state.reviewedFlashcards[fcId] = (state.reviewedFlashcards[fcId] || 0) + 1;
      if (rating >= 4) {
        state.masteredFlashcards[fcId] = (state.masteredFlashcards[fcId] || 0) + 1;
      }
      const today = new Date().toISOString().split("T")[0];
      state.lastStudyDate = today;
      state.studyMinutes[today] = (state.studyMinutes[today] || 0) + 2;
    });
    addPoints(rating >= 4 ? 8 : 3, rating >= 4 ? "Card Mastered" : "Card Reviewed", `${card.chapter} - ${card.topic}`);

    if (currentIndex < cards.length - 1) {
      setTimeout(() => {
        setCurrentIndex((i) => i + 1);
        setFlipped(false);
      }, 200);
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        breadcrumbs={[
          { label: "Flashcards", href: "/flashcards" },
          { label: chapterName, href: "#" },
        ]}
      />
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">{chapterName}</h1>
          <span className="text-xs text-white/30">
            {currentIndex + 1} / {cards.length}
          </span>
        </div>

        <div className="w-full bg-white/[0.03] rounded-full h-1 mb-8 overflow-hidden">
          <div
            className="h-full bg-[#1856FF] rounded-full transition-all duration-300"
            style={{
              width: `${((currentIndex + 1) / cards.length) * 100}%`,
            }}
          />
        </div>

        <FlashcardView
          card={card}
          flipped={flipped}
          onFlip={() => setFlipped(!flipped)}
        />

        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => {
              setCurrentIndex(Math.max(0, currentIndex - 1));
              setFlipped(false);
            }}
            disabled={currentIndex === 0}
            className="p-2 rounded-xl glass-interactive disabled:opacity-20 text-white/40"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {flipped && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setRating(rating)}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    cardConfidence === rating
                      ? "bg-[#F59E0B]/20 border border-[#F59E0B]/30"
                      : "glass-interactive border border-transparent"
                  )}
                >
                  <Star
                    className={cn(
                      "w-4 h-4",
                      cardConfidence && rating <= cardConfidence
                        ? "text-[#F59E0B] fill-[#F59E0B]"
                        : "text-white/15"
                    )}
                  />
                </button>
              ))}
            </motion.div>
          )}

          <button
            onClick={() => {
              setCurrentIndex(Math.min(cards.length - 1, currentIndex + 1));
              setFlipped(false);
            }}
            disabled={currentIndex === cards.length - 1}
            className="p-2 rounded-xl glass-interactive disabled:opacity-20 text-white/40"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-[11px] text-white/20">
            {flipped ? "Rate your confidence (1-5)" : "Tap card to reveal answer"}
          </p>
        </div>
      </div>
    </div>
  );
}

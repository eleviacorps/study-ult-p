"use client";

import { loadStudyState, updateStudyState, addPoints } from "@/lib/study-state";

interface CardSchedule {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: string;
  lastReview: string;
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function daysBetween(d1: string, d2: string): number {
  return Math.floor((new Date(d2).getTime() - new Date(d1).getTime()) / (1000 * 60 * 60 * 24));
}

export function getFlashcardSchedule(cardId: string): CardSchedule {
  const state = loadStudyState();
  const key = `sm2-${cardId}`;
  try {
    const raw = localStorage.getItem("studyult-sm2");
    if (raw) {
      const data = JSON.parse(raw);
      if (data[key]) return data[key];
    }
  } catch {}
  return { easeFactor: 2.5, interval: 0, repetitions: 0, nextReview: getToday(), lastReview: "" };
}

function saveFlashcardSchedule(cardId: string, schedule: CardSchedule) {
  try {
    const raw = localStorage.getItem("studyult-sm2") || "{}";
    const data = JSON.parse(raw);
    data[`sm2-${cardId}`] = schedule;
    localStorage.setItem("studyult-sm2", JSON.stringify(data));
  } catch {}
}

export function recordFlashcardReview(cardId: string, quality: number) {
  const schedule = getFlashcardSchedule(cardId);
  const today = getToday();

  schedule.lastReview = today;

  if (quality >= 3) {
    if (schedule.repetitions === 0) {
      schedule.interval = 1;
    } else if (schedule.repetitions === 1) {
      schedule.interval = 6;
    } else {
      schedule.interval = Math.round(schedule.interval * schedule.easeFactor);
    }
    schedule.repetitions += 1;
  } else {
    schedule.repetitions = 0;
    schedule.interval = 1;
  }

  schedule.easeFactor = Math.max(
    1.3,
    schedule.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  const nextDate = new Date(today);
  nextDate.setDate(nextDate.getDate() + schedule.interval);
  schedule.nextReview = nextDate.toISOString().split("T")[0];

  saveFlashcardSchedule(cardId, schedule);

  updateStudyState((state) => {
    state.reviewedFlashcards[cardId] = (state.reviewedFlashcards[cardId] || 0) + 1;
    if (quality >= 4) {
      state.masteredFlashcards[cardId] = (state.masteredFlashcards[cardId] || 0) + 1;
    }
    const today = getToday();
    state.lastStudyDate = today;
    state.studyMinutes[today] = (state.studyMinutes[today] || 0) + 2;
  });
  addPoints(quality >= 4 ? 8 : quality >= 3 ? 5 : 2,
    quality >= 4 ? "Card Mastered" : "Card Reviewed",
    `Quality: ${quality}/5`
  );
}

export function getDueFlashcards(allCardIds: string[]): string[] {
  const today = getToday();
  return allCardIds.filter((id) => {
    const schedule = getFlashcardSchedule(id);
    return !schedule.lastReview || schedule.nextReview <= today;
  });
}

export function getFlashcardStats(allCardIds: string[]): {
  due: number;
  new: number;
  learning: number;
  mastered: number;
} {
  const stats = { due: 0, new: 0, learning: 0, mastered: 0 };
  const today = getToday();
  for (const id of allCardIds) {
    const s = getFlashcardSchedule(id);
    if (!s.lastReview) {
      stats.new++;
    } else if (s.repetitions >= 3 && s.interval >= 21) {
      stats.mastered++;
    } else if (s.nextReview <= today) {
      stats.due++;
    } else {
      stats.learning++;
    }
  }
  return stats;
}

export function qualityFromRating(rating: number): number {
  const map: Record<number, number> = { 1: 0, 2: 1, 3: 3, 4: 4, 5: 5 };
  return map[rating] || 3;
}

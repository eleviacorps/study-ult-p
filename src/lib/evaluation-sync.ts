"use client";

type EvaluationAttempt = {
  surface: "practice" | "quiz" | "test" | "ai_judge";
  questionId?: string;
  topic?: string;
  chapter?: string;
  subject?: string;
  correct: boolean;
  score?: number;
  maxScore?: number;
  feedback?: string;
  misconception?: string;
  metadata?: Record<string, unknown>;
};

export function recordEvaluationAttempt(attempt: EvaluationAttempt) {
  fetch("/api/evaluation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(attempt),
  }).catch(() => {});
}

"use client";

export interface CachedAiResponse {
  questionId: string;
  insight: string;
  approach: string;
  hint: string;
  stepByStep: string;
  answer: string;
  timestamp: string;
  rawContent: string;
}

const CACHE_KEY = "studyult-ai-cache";

function loadCache(): Record<string, CachedAiResponse> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, CachedAiResponse>) {
  if (typeof window !== "undefined") {
    const entries = Object.entries(cache);
    if (entries.length > 50) {
      const sorted = entries.sort((a, b) => new Date(b[1].timestamp).getTime() - new Date(a[1].timestamp).getTime());
      const trimmed: Record<string, CachedAiResponse> = {};
      for (const [k, v] of sorted.slice(0, 50)) {
        trimmed[k] = v;
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
    } else {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }
  }
}

export function getAiCache(questionId: string): CachedAiResponse | null {
  const cache = loadCache();
  return cache[questionId] || null;
}

export function setAiCache(questionId: string, data: {
  insight: string;
  approach: string;
  hint: string;
  stepByStep: string;
  answer: string;
  rawContent: string;
}) {
  const cache = loadCache();
  cache[questionId] = {
    questionId,
    insight: data.insight,
    approach: data.approach,
    hint: data.hint,
    stepByStep: data.stepByStep,
    answer: data.answer,
    rawContent: data.rawContent,
    timestamp: new Date().toISOString(),
  };
  saveCache(cache);
}

export function clearAiCache(questionId?: string) {
  if (questionId) {
    const cache = loadCache();
    delete cache[questionId];
    saveCache(cache);
  } else {
    localStorage.removeItem(CACHE_KEY);
  }
}

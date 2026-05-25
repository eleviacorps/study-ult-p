"use client";

export interface StudyState {
  streak: number;
  lastStudyDate: string;
  studyMinutes: Record<string, number>;
  reviewedFlashcards: Record<string, number>;
  masteredFlashcards: Record<string, number>;
  questionAttempts: Record<string, { correct: number; total: number }>;
  testScores: { date: string; score: number; total: number; chapter: string }[];
  points: number;
  achievements: string[];
  weakAreas: { topic: string; accuracy: number; chapter: string; lastSeen: string }[];
  strongAreas: { topic: string; accuracy: number; chapter: string }[];
  aiTodos: { id: string; task: string; priority: "high" | "medium" | "low"; createdAt: string; completed: boolean; source: string }[];
  userTodos: { id: string; task: string; priority: "high" | "medium" | "low"; createdAt: string; completed: boolean }[];
  activityLog: { timestamp: string; action: string; details: string; points: number }[];
  topicAccuracy: Record<string, { correct: number; total: number }>;
  predictedWeakness: { topic: string; prediction: string; confidence: string }[];
  lastAiAnalysis: string;
  aiConversations: { id: string; role: "user" | "assistant"; content: string; context: string; timestamp: string }[];
  quizScores: { date: string; score: number; total: number; netScore: number }[];
  subjectAccuracy: Record<string, { correct: number; total: number }>;
}

const STORAGE_KEY = "studyult-state";

export function loadStudyState(): StudyState {
  if (typeof window === "undefined") {
    return getDefaultState();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...getDefaultState(), ...parsed };
    }
  } catch {}
  return getDefaultState();
}

function getDefaultState(): StudyState {
  return {
    streak: 0,
    lastStudyDate: "",
    studyMinutes: {},
    reviewedFlashcards: {},
    masteredFlashcards: {},
    questionAttempts: {},
    testScores: [],
    points: 0,
    achievements: [],
    weakAreas: [],
    strongAreas: [],
    aiTodos: [],
    userTodos: [],
    activityLog: [],
    topicAccuracy: {},
    predictedWeakness: [],
    lastAiAnalysis: "",
    aiConversations: [],
    quizScores: [],
    subjectAccuracy: {},
  };
}

function saveStudyState(state: StudyState) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

export function updateStudyState(updater: (state: StudyState) => void) {
  const state = loadStudyState();
  updater(state);

  const today = new Date().toISOString().split("T")[0];
  if (state.lastStudyDate) {
    const last = new Date(state.lastStudyDate);
    const curr = new Date(today);
    const diff = Math.floor((curr.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      state.streak += 1;
    } else if (diff > 1) {
      state.streak = 1;
    }
  } else {
    state.streak = 1;
  }
  state.lastStudyDate = today;

  syncWeakAreas(state);

  saveStudyState(state);
}

export function recordAiConversation(role: "user" | "assistant", content: string, context: string) {
  updateStudyState((state) => {
    state.aiConversations.unshift({
      id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role,
      content,
      context: context.substring(0, 100),
      timestamp: new Date().toISOString(),
    });
    if (state.aiConversations.length > 100) state.aiConversations = state.aiConversations.slice(0, 100);
  });
}

export function addPoints(amount: number, action: string, details: string) {
  updateStudyState((state) => {
    state.points += amount;
    state.activityLog.unshift({
      timestamp: new Date().toISOString(),
      action,
      details,
      points: amount,
    });
    if (state.activityLog.length > 200) state.activityLog = state.activityLog.slice(0, 200);
  });
}

export function syncWeakAreas(state: StudyState) {
  const topicAcc = state.topicAccuracy || {};
  const entries = Object.entries(topicAcc)
    .filter(([, v]) => v.total > 0)
    .map(([topic, v]) => ({
      topic,
      accuracy: Math.round((v.correct / v.total) * 100),
      chapter: topic.split(" > ")[0] || "General",
      lastSeen: new Date().toISOString(),
    }))
    .sort((a, b) => a.accuracy - b.accuracy);

  state.weakAreas = entries.filter((e) => e.accuracy < 60).slice(0, 10);
  state.strongAreas = entries.filter((e) => e.accuracy >= 80).slice(0, 10);
}

export function addAiTodo(task: string, priority: "high" | "medium" | "low", source: string) {
  updateStudyState((state) => {
    const exists = state.aiTodos.find((t) => t.task === task && !t.completed);
    if (!exists) {
      state.aiTodos.unshift({
        id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        task,
        priority,
        createdAt: new Date().toISOString(),
        completed: false,
        source,
      });
    }
  });
}

export function computeAnalytics(state: StudyState) {
  const totalAttempts = Object.values(state.questionAttempts || {}).reduce((s: number, a: any) => s + (a.total || 0), 0);
  const totalCorrect = Object.values(state.questionAttempts || {}).reduce((s: number, a: any) => s + (a.correct || 0), 0);
  const reviewedCards = Object.keys(state.reviewedFlashcards || {}).length;
  const masteredCards = Object.keys(state.masteredFlashcards || {}).length;
  const today = new Date().toISOString().split("T")[0];
  const todayMinutes = state.studyMinutes?.[today] || 0;
  const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  const pendingAiTodos = (state.aiTodos || []).filter((t) => !t.completed).length;
  const pendingUserTodos = (state.userTodos || []).filter((t) => !t.completed).length;

  const recentTests = (state.testScores || []).slice(-5);
  const testTrend = recentTests.length >= 2
    ? recentTests[recentTests.length - 1]!.score / Math.max(1, recentTests[recentTests.length - 1]!.total) -
      recentTests[recentTests.length - 2]!.score / Math.max(1, recentTests[recentTests.length - 2]!.total)
    : 0;

  return {
    totalAttempts,
    totalCorrect,
    accuracy,
    reviewedCards,
    masteredCards,
    todayMinutes,
    streak: state.streak || 1,
    points: state.points || 0,
    achievements: state.achievements || [],
    weakAreas: state.weakAreas || [],
    strongAreas: state.strongAreas || [],
    aiTodos: state.aiTodos || [],
    userTodos: state.userTodos || [],
    pendingAiTodos,
    pendingUserTodos,
    activityLog: state.activityLog || [],
    testTrend,
    recentTests: (state.testScores || []).slice(-10).reverse(),
    topicAccuracy: state.topicAccuracy || {},
  };
}

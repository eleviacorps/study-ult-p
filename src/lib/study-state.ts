"use client";

let _syncTimer: ReturnType<typeof setTimeout> | null = null;
let _syncVersion = 0;

export interface ChapterProgressItem {
  chapter: string;
  subject: string;
  completedTopics: number;
  totalTopics: number;
  questionsAttempted: number;
  questionsCorrect: number;
  flashcardsReviewed: number;
  flashcardsMastered: number;
  lastStudiedAt: string;
}

export interface StudyState {
  streak: number;
  longestStreak: number;
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
  activitySnapshots: { type: string; timestamp: string; score: number; total: number; chapter: string; topics: string[] }[];
  chapterProgress: ChapterProgressItem[];
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
    longestStreak: 0,
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
    activitySnapshots: [],
    chapterProgress: [],
  };
}

function saveStudyState(state: StudyState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("StudyUlt: failed to save study state, clearing corrupted data", err);
    try {
      // Try clearing and re-saving once — handles QuotaExceededError
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage permanently unavailable — degrade gracefully
    }
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
  syncTodos(state);

  saveStudyState(state);

  if (typeof window !== "undefined") {
    import("./sync").then(({ scheduleSync }) => {
      scheduleSync(state);
    });
  }
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

export function syncTodos(state: StudyState) {
  const existingTasks = new Set(state.aiTodos.filter((t) => !t.completed).map((t) => t.task));
  const weak = (state.weakAreas || []).slice(0, 5);
  for (const w of weak) {
    const task = `Review ${w.topic} (${w.accuracy}%)`;
    if (!existingTasks.has(task)) {
      state.aiTodos.unshift({
        id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        task,
        priority: w.accuracy < 40 ? "high" : "medium",
        createdAt: new Date().toISOString(),
        completed: false,
        source: "Auto",
      });
      existingTasks.add(task);
    }
  }
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

export function saveActivitySnapshot(type: string, score: number, total: number, chapter: string, topics: string[]) {
  updateStudyState((state) => {
    state.activitySnapshots.unshift({
      type,
      timestamp: new Date().toISOString(),
      score,
      total,
      chapter,
      topics,
    });
    if (state.activitySnapshots.length > 200) state.activitySnapshots = state.activitySnapshots.slice(0, 200);
  });
}

export function computeAnalytics(state: StudyState) {
  const attemptsArr = Object.values(state.questionAttempts || {});
  const totalAttempts = attemptsArr.reduce((s: number, a) => s + (a.total || 0), 0);
  const totalCorrect = attemptsArr.reduce((s: number, a) => s + (a.correct || 0), 0);
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

let _initialSnapshotSync = false;

/**
 * Pull remote state from DB and overwrite localStorage cache.
 * DB is the primary store; localStorage is only a performance cache.
 * After pull, the local cache is replaced with DB state plus any
 * pending local changes that haven't been flushed yet.
 */
async function pullRemoteState() {
  try {
    const { loadRemoteState, syncState } = await import("./sync");
    const raw = localStorage.getItem("studyult-state");
    const local = raw ? JSON.parse(raw) : getDefaultState();

    // Flush any pending local changes to DB first
    if (localStorage.getItem("studyult-sync-pending") === "1") {
      await syncState(local);
    }

    const remote = await loadRemoteState();
    if (remote) {
      // DB is authoritative — overwrite localStorage with remote state,
      // keeping only fields local has written since last sync attempt.
      // This ensures cross-device consistency: DB state always wins.
      const merged = {
        ...getDefaultState(),
        ...remote,
        // Preserve local-only fields not stored in DB tables
        aiConversations: local.aiConversations || remote.aiConversations || [],
        activityLog: local.activityLog || remote.activityLog || [],
        userTodos: local.userTodos || remote.userTodos || [],
        lastAiAnalysis: remote.lastAiAnalysis || local.lastAiAnalysis || "",
      };
      saveStudyState(merged);

      // Push local-only data to DB so it propagates across devices
      const hasLocalOnlyData = (local.aiConversations?.length ?? 0) > 0
        || (local.activityLog?.length ?? 0) > 0
        || (local.userTodos?.length ?? 0) > 0;
      if (!_initialSnapshotSync && hasLocalOnlyData) {
        _initialSnapshotSync = true;
        await syncState(merged);
      }
    } else if (raw) {
      // No remote data yet, but local exists — push it to seed the DB
      _initialSnapshotSync = true;
      await syncState(local);
    }
  } catch {}
  window.dispatchEvent(new CustomEvent("study-state-refreshed"));
}

if (typeof window !== "undefined") {
  // Pull on page load (after auth restores) with short delay for auth init
  setTimeout(pullRemoteState, 1500);
  // Poll every 30s for cross-device sync
  setInterval(pullRemoteState, 30_000);
}

// Flush latest state to server on tab close (fire-and-forget via sendBeacon)
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    try {
      const raw = localStorage.getItem("studyult-state");
      if (!raw) return;
      const s = JSON.parse(raw);
      const body = JSON.stringify({
        points: s.points,
        streak: s.streak,
        longestStreak: s.longestStreak,
        lastStudyDate: s.lastStudyDate,
        studyMinutes: s.studyMinutes,
        quizScores: s.quizScores,
        testScores: s.testScores,
        activitySnapshots: s.activitySnapshots,
        topicAccuracy: s.topicAccuracy,
        weakAreas: s.weakAreas,
        chapterProgress: s.chapterProgress,
      });
      navigator.sendBeacon("/api/sync", new Blob([body], { type: "application/json" }));
    } catch {}
  });
}

import { createClient } from "@/lib/supabase/client";
import type { StudyState } from "@/lib/study-state";

let _pendingState: StudyState | null = null;
let _syncTimer: ReturnType<typeof setTimeout> | null = null;
const SYNC_DEBOUNCE_MS = 2000;
const SYNC_MAX_DELAY_MS = 10000;
let _firstCall = 0;

const PENDING_SYNC_KEY = "studyult-sync-pending";
const LAST_SYNC_KEY = "studyult-last-synced";

function log(...args: unknown[]) {
  console.log("[DEBUG SYNC]", ...args);
}

export function scheduleSync(state: StudyState) {
  const nonEmpty = Object.entries({
    studyMinutes: state.studyMinutes && Object.keys(state.studyMinutes).length,
    quizScores: state.quizScores?.length,
    testScores: state.testScores?.length,
    activitySnapshots: state.activitySnapshots?.length,
    topicAccuracy: state.topicAccuracy && Object.keys(state.topicAccuracy).length,
    weakAreas: state.weakAreas?.length,
    points: state.points,
    streak: state.streak,
    chapterProgress: state.chapterProgress?.length,
  }).filter(([, v]) => v);
  log("scheduleSync called, non-empty fields:", nonEmpty, "total:", state.points);
  _pendingState = state;
  if (!_firstCall) _firstCall = Date.now();

  if (_syncTimer) clearTimeout(_syncTimer);

  const elapsed = Date.now() - _firstCall;
  const delay = Math.min(SYNC_DEBOUNCE_MS, Math.max(0, SYNC_MAX_DELAY_MS - elapsed));

  _syncTimer = setTimeout(async () => {
    if (_pendingState) {
      log("firing syncState after debounce");
      await syncState(_pendingState);
      _pendingState = null;
      _firstCall = 0;
    }
  }, delay);
}

export function cancelPendingSync() {
  log("cancelPendingSync");
  if (_syncTimer) clearTimeout(_syncTimer);
  _pendingState = null;
  _firstCall = 0;
}

export async function syncState(state: StudyState): Promise<boolean> {
  log("syncState START");
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { log("syncState: no user, abort"); return false; }
    log("syncState: user", user.id);

    const studentLearningState = await (async () => {
      try {
        const mod = await import("./ai-retrieval");
        return mod.buildStudentStateSnapshot(state);
      } catch (e) {
        log("syncState: buildStudentStateSnapshot failed", e);
        return undefined;
      }
    })();

    log("syncState: studentLearningState keys:", studentLearningState ? Object.keys(studentLearningState) : "undefined");
    log("syncState: studyMinutes entries:", Object.keys(state.studyMinutes).length);
    log("syncState: quizScores:", state.quizScores?.length);
    log("syncState: testScores:", state.testScores?.length);
    log("syncState: activitySnapshots:", state.activitySnapshots?.length);
    log("syncState: topicAccuracy keys:", Object.keys(state.topicAccuracy || {}).length);
    log("syncState: weakAreas:", state.weakAreas?.length);
    log("syncState: points:", state.points);
    log("syncState: streak:", state.streak);
    log("syncState: chapterProgress:", state.chapterProgress?.length);

    const payload = {
      studyMinutes: state.studyMinutes,
      quizScores: state.quizScores,
      testScores: state.testScores,
      activitySnapshots: state.activitySnapshots,
      topicAccuracy: state.topicAccuracy,
      weakAreas: state.weakAreas,
      points: state.points,
      streak: state.streak,
      longestStreak: state.longestStreak,
      lastStudyDate: state.lastStudyDate,
      chapterProgress: state.chapterProgress,
      studentLearningState,
      stateSnapshot: state,
    };

    log("syncState: POST /api/sync, body keys:", Object.keys(payload).filter(k => (payload as any)[k] && ((typeof (payload as any)[k] === 'object' && Object.keys((payload as any)[k]).length) || typeof (payload as any)[k] === 'number')));
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    log("syncState: response status:", res.status, res.statusText);
    const body = await res.json().catch(() => null);
    log("syncState: response body:", JSON.stringify(body).slice(0, 500));

    if (!res.ok) {
      console.warn("[DEBUG SYNC] server rejected:", body);
      markPendingSync();
      return false;
    }
    log("syncState: SUCCESS");
    localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
    clearPendingSync();
    return true;
  } catch (e) {
    console.error("[DEBUG SYNC] syncState exception:", e);
    markPendingSync();
    return false;
  }
}

function markPendingSync() {
  log("markPendingSync");
  try { localStorage.setItem(PENDING_SYNC_KEY, "1"); } catch {}
}

function clearPendingSync() {
  log("clearPendingSync");
  try { localStorage.removeItem(PENDING_SYNC_KEY); } catch {}
}

export function hasPendingSync(): boolean {
  const val = localStorage.getItem(PENDING_SYNC_KEY) === "1";
  log("hasPendingSync:", val);
  return val;
}

export function syncOnUnload(state: StudyState) {
  log("syncOnUnload called, points:", state.points, "streak:", state.streak);
  const body = JSON.stringify({
    points: state.points,
    streak: state.streak,
    longestStreak: state.longestStreak,
    lastStudyDate: state.lastStudyDate,
    studyMinutes: state.studyMinutes,
    quizScores: state.quizScores,
    testScores: state.testScores,
    activitySnapshots: state.activitySnapshots,
    topicAccuracy: state.topicAccuracy,
    weakAreas: state.weakAreas,
    chapterProgress: state.chapterProgress,
  });
  try {
    navigator.sendBeacon("/api/sync", new Blob([body], { type: "application/json" }));
    log("syncOnUnload: beacon sent");
  } catch {
    log("syncOnUnload: beacon failed");
    markPendingSync();
  }
}

export async function loadRemoteState(): Promise<Partial<StudyState> | null> {
  log("loadRemoteState: fetching GET /api/sync");
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { log("loadRemoteState: no user"); return null; }

    const res = await fetch("/api/sync");
    log("loadRemoteState: status:", res.status);
    if (!res.ok) { log("loadRemoteState: not ok"); return null; }

    const data = await res.json();
    log("loadRemoteState: got data keys:", Object.keys(data));
    log("loadRemoteState: has stateSnapshot:", !!data.stateSnapshot);

    const snapshot = data.stateSnapshot || {};

    return {
      studyMinutes: data.studyMinutes || snapshot.studyMinutes || {},
      quizScores: data.quizScores || snapshot.quizScores || [],
      testScores: data.testScores || snapshot.testScores || [],
      activitySnapshots: data.activitySnapshots || snapshot.activitySnapshots || [],
      topicAccuracy: data.topicAccuracy || snapshot.topicAccuracy || {},
      weakAreas: data.weakAreas || snapshot.weakAreas || [],
      chapterProgress: data.chapterProgress || snapshot.chapterProgress || [],
      points: data.points ?? snapshot.points ?? 0,
      streak: data.streak ?? snapshot.streak ?? 0,
      longestStreak: data.longestStreak ?? snapshot.longestStreak ?? 0,
      lastStudyDate: data.lastStudyDate ?? snapshot.lastStudyDate ?? "",

      reviewedFlashcards: snapshot.reviewedFlashcards || {},
      masteredFlashcards: snapshot.masteredFlashcards || {},
      questionAttempts: snapshot.questionAttempts || {},
      achievements: snapshot.achievements || [],
      strongAreas: snapshot.strongAreas || [],
      aiTodos: snapshot.aiTodos || [],
      userTodos: snapshot.userTodos || [],
      activityLog: snapshot.activityLog || [],
      predictedWeakness: snapshot.predictedWeakness || [],
      lastAiAnalysis: snapshot.lastAiAnalysis || "",
      aiConversations: snapshot.aiConversations || [],
      subjectAccuracy: snapshot.subjectAccuracy || {},
    };
  } catch (e) {
    console.error("[DEBUG SYNC] loadRemoteState exception:", e);
    return null;
  }
}

function mergeRecordMax(
  local: Record<string, number> | undefined,
  remote: Record<string, number> | undefined
): Record<string, number> {
  const result = { ...(remote || {}) };
  for (const [key, val] of Object.entries(local || {})) {
    result[key] = Math.max(result[key] ?? 0, val);
  }
  return result;
}

function mergeRecordSum(
  local: Record<string, { correct: number; total: number }> | undefined,
  remote: Record<string, { correct: number; total: number }> | undefined
): Record<string, { correct: number; total: number }> {
  const result: Record<string, { correct: number; total: number }> = {};
  const allKeys = new Set([...Object.keys(local || {}), ...Object.keys(remote || {})]);
  for (const key of allKeys) {
    const l = local?.[key];
    const r = remote?.[key];
    result[key] = {
      correct: Math.max(l?.correct ?? 0, r?.correct ?? 0),
      total: Math.max(l?.total ?? 0, r?.total ?? 0),
    };
  }
  return result;
}

function mergeArrayDedup<T>(
  local: T[] | undefined,
  remote: T[] | undefined,
  keyFn: (item: T) => string
): T[] {
  const seen = new Set((local || []).map(keyFn));
  const merged = [...(local || [])];
  for (const item of remote || []) {
    const k = keyFn(item);
    if (!seen.has(k)) {
      seen.add(k);
      merged.push(item);
    }
  }
  return merged;
}

export function mergeStates(local: StudyState, remote: Partial<StudyState>): StudyState {
  log("mergeStates: local points:", local.points, "remote points:", remote.points,
    "local weakAreas:", local.weakAreas?.length, "remote weakAreas:", remote.weakAreas?.length);

  const mergedMinutes = { ...remote.studyMinutes, ...local.studyMinutes };

  const quizDates = new Set(local.quizScores.map((q) => q.date));
  const mergedQuizzes = [
    ...local.quizScores,
    ...(remote.quizScores || []).filter((q: any) => !quizDates.has(q.date)),
  ];

  const testKeys = new Set(local.testScores.map((t) => `${t.date}-${t.chapter}`));
  const mergedTests = [
    ...local.testScores,
    ...(remote.testScores || []).filter((t: any) => !testKeys.has(`${t.date}-${t.chapter}`)),
  ];

  const activityKeys = new Set(local.activitySnapshots.map((a: any) => a.timestamp));
  const mergedActivities = [
    ...local.activitySnapshots,
    ...(remote.activitySnapshots || []).filter((a: any) => !activityKeys.has(a.timestamp)),
  ];

  const mergedTopics = { ...remote.topicAccuracy, ...local.topicAccuracy };

  const cpKeys = new Set(local.chapterProgress.map((c) => `${c.chapter}-${c.subject}`));
  const mergedCP = [
    ...local.chapterProgress,
    ...(remote.chapterProgress || []).filter((c: any) => !cpKeys.has(`${c.chapter}-${c.subject}`)),
  ];

  const weakAreaTopics = new Map<string, { topic: string; accuracy: number; chapter: string; lastSeen: string }>();
  for (const w of [...(local.weakAreas || []), ...(remote.weakAreas || [])]) {
    const existing = weakAreaTopics.get(w.topic);
    if (!existing || new Date(w.lastSeen || 0).getTime() > new Date(existing.lastSeen || 0).getTime()) {
      weakAreaTopics.set(w.topic, w);
    }
  }
  const mergedWeakAreas = [...weakAreaTopics.values()].slice(0, 10);

  const mergedReviewedFC = mergeRecordMax(local.reviewedFlashcards, remote.reviewedFlashcards);
  const mergedMasteredFC = mergeRecordMax(local.masteredFlashcards, remote.masteredFlashcards);
  const mergedQuestionAttempts = mergeRecordSum(local.questionAttempts, remote.questionAttempts);
  const mergedSubjectAcc = mergeRecordSum(local.subjectAccuracy, remote.subjectAccuracy);

  const activityTimestamps = new Set((local.activityLog || []).map((a) => a.timestamp));
  const mergedActivityLog = [
    ...(local.activityLog || []),
    ...(remote.activityLog || []).filter((a) => !activityTimestamps.has(a.timestamp)),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const mergedAiTodos = mergeArrayDedup(local.aiTodos, remote.aiTodos, (t) => t.id);
  const mergedUserTodos = mergeArrayDedup(local.userTodos, remote.userTodos, (t) => t.id);
  const mergedAchievements = [...new Set([...(local.achievements || []), ...(remote.achievements || [])])];

  const strongTopics = new Map<string, { topic: string; accuracy: number; chapter: string }>();
  for (const s of [...(local.strongAreas || []), ...(remote.strongAreas || [])]) {
    const existing = strongTopics.get(s.topic);
    if (!existing || s.accuracy > existing.accuracy) strongTopics.set(s.topic, s);
  }
  const mergedStrongAreas = [...strongTopics.values()].slice(0, 10);

  const mergedPredictedWeakness = mergeArrayDedup(
    local.predictedWeakness,
    remote.predictedWeakness,
    (p) => p.topic
  );

  const mergedConversations = mergeArrayDedup(
    local.aiConversations,
    remote.aiConversations,
    (c) => c.id
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    ...local,
    studyMinutes: mergedMinutes,
    quizScores: mergedQuizzes,
    testScores: mergedTests,
    activitySnapshots: mergedActivities,
    topicAccuracy: mergedTopics,
    weakAreas: mergedWeakAreas,
    chapterProgress: mergedCP,
    points: Math.max(local.points, remote.points ?? 0),
    streak: Math.max(local.streak, remote.streak ?? 0),
    longestStreak: Math.max(local.longestStreak, remote.longestStreak ?? 0),
    lastStudyDate: remote.lastStudyDate ?? local.lastStudyDate,

    questionAttempts: mergedQuestionAttempts,
    reviewedFlashcards: mergedReviewedFC,
    masteredFlashcards: mergedMasteredFC,
    activityLog: mergedActivityLog,
    aiTodos: mergedAiTodos,
    userTodos: mergedUserTodos,
    achievements: mergedAchievements,
    strongAreas: mergedStrongAreas,
    predictedWeakness: mergedPredictedWeakness,
    aiConversations: mergedConversations,
    subjectAccuracy: mergedSubjectAcc,
    lastAiAnalysis: remote.lastAiAnalysis || local.lastAiAnalysis || "",
  };
}

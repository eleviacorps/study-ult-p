import { createClient } from "@/lib/supabase/client";
import type { StudyState } from "@/lib/study-state";

let _pendingState: StudyState | null = null;
let _syncTimer: ReturnType<typeof setTimeout> | null = null;
const SYNC_DEBOUNCE_MS = 2000;
const SYNC_MAX_DELAY_MS = 10000;
let _firstCall = 0;

const PENDING_SYNC_KEY = "studyult-sync-pending";
const LAST_SYNC_KEY = "studyult-last-synced";

export function scheduleSync(state: StudyState) {
  _pendingState = state;
  if (!_firstCall) _firstCall = Date.now();

  if (_syncTimer) clearTimeout(_syncTimer);

  const elapsed = Date.now() - _firstCall;
  const delay = Math.min(SYNC_DEBOUNCE_MS, Math.max(0, SYNC_MAX_DELAY_MS - elapsed));

  _syncTimer = setTimeout(async () => {
    if (_pendingState) {
      await syncState(_pendingState);
      _pendingState = null;
      _firstCall = 0;
    }
  }, delay);
}

export function cancelPendingSync() {
  if (_syncTimer) clearTimeout(_syncTimer);
  _pendingState = null;
  _firstCall = 0;
}

export async function syncState(state: StudyState): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
        studentLearningState: (await import("./ai-retrieval")).buildStudentStateSnapshot(state),
      }),
    });

    if (!res.ok) {
      markPendingSync();
      return false;
    }
    localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
    clearPendingSync();
    return true;
  } catch {
    markPendingSync();
    return false;
  }
}

function markPendingSync() {
  try { localStorage.setItem(PENDING_SYNC_KEY, "1"); } catch {}
}

function clearPendingSync() {
  try { localStorage.removeItem(PENDING_SYNC_KEY); } catch {}
}

export function hasPendingSync(): boolean {
  try { return localStorage.getItem(PENDING_SYNC_KEY) === "1"; } catch { return false; }
}

export function syncOnUnload(state: StudyState) {
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
  } catch {
    markPendingSync();
  }
}

export async function loadRemoteState(): Promise<Partial<StudyState> | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const res = await fetch("/api/sync");
    if (!res.ok) return null;

    const data = await res.json();
    return {
      studyMinutes: data.studyMinutes || {},
      quizScores: data.quizScores || [],
      testScores: data.testScores || [],
      activitySnapshots: data.activitySnapshots || [],
      topicAccuracy: data.topicAccuracy || {},
      weakAreas: data.weakAreas || [],
      points: data.points ?? 0,
      streak: data.streak ?? 0,
      longestStreak: data.longestStreak ?? 0,
      lastStudyDate: data.lastStudyDate ?? "",
      chapterProgress: data.chapterProgress || [],
    };
  } catch {
    return null;
  }
}

export function mergeStates(local: StudyState, remote: Partial<StudyState>): StudyState {
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

  return {
    ...local,
    studyMinutes: mergedMinutes,
    quizScores: mergedQuizzes,
    testScores: mergedTests,
    activitySnapshots: mergedActivities,
    topicAccuracy: mergedTopics,
    weakAreas: local.weakAreas.length > 0 ? local.weakAreas : remote.weakAreas || [],
    chapterProgress: mergedCP,
    points: Math.max(local.points, remote.points ?? 0),
    streak: Math.max(local.streak, remote.streak ?? 0),
    longestStreak: Math.max(local.longestStreak, remote.longestStreak ?? 0),
    lastStudyDate: remote.lastStudyDate ?? local.lastStudyDate,
  };
}
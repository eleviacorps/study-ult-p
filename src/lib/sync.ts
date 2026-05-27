import { createClient } from "@/lib/supabase/client";
import type { StudyState } from "@/lib/study-state";
import { buildStudentStateSnapshot } from "@/lib/ai-retrieval";

let _pendingState: StudyState | null = null;
let _syncTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleSync(state: StudyState) {
  _pendingState = state;
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(async () => {
    if (_pendingState) {
      await syncState(_pendingState);
      _pendingState = null;
    }
  }, 2000);
}

export function cancelPendingSync() {
  if (_syncTimer) clearTimeout(_syncTimer);
  _pendingState = null;
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
        studentLearningState: buildStudentStateSnapshot(state),
      }),
    });

    if (!res.ok) return false;
    localStorage.setItem("studyult-last-synced", String(Date.now()));
    return true;
  } catch {
    return false;
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
    points: remote.points ?? local.points,
    streak: remote.streak ?? local.streak,
    longestStreak: remote.longestStreak ?? local.longestStreak,
    lastStudyDate: remote.lastStudyDate ?? local.lastStudyDate,
  };
}

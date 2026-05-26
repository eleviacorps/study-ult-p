import { createClient } from "@/lib/supabase/client";
import type { StudyState } from "@/lib/study-state";

const SYNC_KEY = "studyult-last-synced";
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function shouldSync(): boolean {
  const last = localStorage.getItem(SYNC_KEY);
  if (!last) return true;
  return Date.now() - parseInt(last, 10) > SYNC_INTERVAL;
}

export function markSynced() {
  localStorage.setItem(SYNC_KEY, String(Date.now()));
}

export async function syncState(state: StudyState): Promise<boolean> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
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
      }),
    });

    if (!res.ok) return false;
    markSynced();
    return true;
  } catch {
    return false;
  }
}

export async function loadRemoteState(): Promise<Partial<StudyState> | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
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
    };
  } catch {
    return null;
  }
}

export function mergeStates(
  local: StudyState,
  remote: Partial<StudyState>
): StudyState {
  // Merge study minutes (local wins for same day - it's more recent)
  const mergedMinutes = { ...remote.studyMinutes, ...local.studyMinutes };

  // Merge arrays (deduplicate by timestamp/date)
  const quizDates = new Set(local.quizScores.map((q) => q.date));
  const mergedQuizzes = [
    ...local.quizScores,
    ...(remote.quizScores || []).filter((q: any) => !quizDates.has(q.date)),
  ];

  const testKeys = new Set(local.testScores.map((t) => `${t.date}-${t.chapter}`));
  const mergedTests = [
    ...local.testScores,
    ...(remote.testScores || []).filter(
      (t: any) => !testKeys.has(`${t.date}-${t.chapter}`)
    ),
  ];

  const activityKeys = new Set(
    local.activitySnapshots.map((a: any) => a.timestamp)
  );
  const mergedActivities = [
    ...local.activitySnapshots,
    ...(remote.activitySnapshots || []).filter(
      (a: any) => !activityKeys.has(a.timestamp)
    ),
  ];

  // Merge topic accuracy (local wins - more recent practice)
  const mergedTopics = { ...remote.topicAccuracy, ...local.topicAccuracy };

  return {
    ...local,
    studyMinutes: mergedMinutes,
    quizScores: mergedQuizzes,
    testScores: mergedTests,
    activitySnapshots: mergedActivities,
    topicAccuracy: mergedTopics,
    weakAreas: local.weakAreas.length > 0 ? local.weakAreas : remote.weakAreas || [],
  };
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ── Types ──

interface StudyMinutesEntry {
  date: string;
  minutes: number;
}

interface QuizScoreEntry {
  date: string;
  score: number;
  total: number;
  netScore: number;
}

interface TestScoreEntry {
  date: string;
  score: number;
  total: number;
  chapter: string;
}

interface ActivitySnapshotEntry {
  timestamp: string;
  type: string;
  score?: number | null;
  total?: number | null;
  label?: string;
  items?: unknown[];
}

interface TopicAccuracyEntry {
  topic: string;
  correct: number;
  total: number;
}

interface WeakAreaEntry {
  topic: string;
  accuracy: number;
  chapter?: string;
  type?: string;
}

interface ChapterProgressEntry {
  chapter: string;
  subject: string;
  completedTopics: number;
  totalTopics: number;
  questionsAttempted: number;
  questionsCorrect: number;
  flashcardsReviewed: number;
  flashcardsMastered: number;
  lastStudiedAt?: string;
}

interface SyncRequestBody {
  studyMinutes?: Record<string, number>;
  quizScores?: QuizScoreEntry[];
  testScores?: TestScoreEntry[];
  activitySnapshots?: ActivitySnapshotEntry[];
  topicAccuracy?: Record<string, TopicAccuracyEntry>;
  weakAreas?: WeakAreaEntry[];
  points?: number;
  streak?: number;
  longestStreak?: number;
  lastStudyDate?: string;
  chapterProgress?: ChapterProgressEntry[];
  studentLearningState?: Record<string, unknown>;
  stateSnapshot?: Record<string, unknown>;
}

interface StudySessionRow {
  date: string;
  minutes: number;
}

interface QuizScoreRow {
  id: number;
  user_id: string;
  date: string;
  score: number;
  total: number;
  net_score: number;
}

interface TestScoreRow {
  id: number;
  user_id: string;
  date: string;
  score: number;
  total: number;
  chapter: string;
}

interface ActivitySnapshotRow {
  id: number;
  user_id: string;
  timestamp: string;
  type: string;
  score: number | null;
  total: number | null;
  label: string;
  items: unknown[];
}

interface TopicAccuracyRow {
  topic: string;
  correct: number;
  total: number;
}

interface WeakAreaRow {
  topic: string;
  accuracy: number;
  chapter: string | null;
  type: string;
}

interface UserPointsRow {
  points: number;
}

interface StudyStreakRow {
  current_streak: number;
  longest_streak: number;
  last_study_date: string | null;
}

interface ChapterProgressRow {
  chapter: string;
  subject: string;
  completed_topics: number;
  total_topics: number;
  questions_attempted: number;
  questions_correct: number;
  flashcards_reviewed: number;
  flashcards_mastered: number;
  last_studied_at: string | null;
}

interface SnapshotData {
  data: Record<string, unknown>;
}

// ── POST — upsert sync data as batched writes ──

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 501 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body: SyncRequestBody = await request.json();
  const userId = user.id;
  const errors: string[] = [];

  // Batch study sessions
  if (body.studyMinutes && Object.keys(body.studyMinutes).length > 0) {
    const rows = Object.entries(body.studyMinutes).map(([date, minutes]) => ({
      user_id: userId, date, minutes,
    }));
    const { error } = await supabase.from("study_sessions").upsert(rows, { onConflict: "user_id,date" });
    if (error) errors.push(`study_sessions: ${error.message}`);
  }

  // Batch quiz scores
  if (body.quizScores && body.quizScores.length > 0) {
    const rows = body.quizScores.map((q) => ({
      user_id: userId, date: q.date, score: q.score, total: q.total, net_score: q.netScore,
    }));
    const { error } = await supabase.from("quiz_scores").upsert(rows, { onConflict: "user_id,date" });
    if (error) errors.push(`quiz_scores: ${error.message}`);
  }

  // Batch test scores
  if (body.testScores && body.testScores.length > 0) {
    const rows = body.testScores.map((t) => ({
      user_id: userId, date: t.date, score: t.score, total: t.total, chapter: t.chapter,
    }));
    const { error } = await supabase.from("test_scores").upsert(rows, { onConflict: "user_id,date,chapter" });
    if (error) errors.push(`test_scores: ${error.message}`);
  }

  // Batch activity snapshots
  if (body.activitySnapshots && body.activitySnapshots.length > 0) {
    const rows = body.activitySnapshots.map((a) => ({
      user_id: userId, timestamp: a.timestamp, type: a.type,
      score: a.score ?? null, total: a.total ?? null,
      label: a.label || "", items: a.items || [],
    }));
    const { error } = await supabase.from("activity_snapshots").upsert(rows, { onConflict: "user_id,timestamp,type" });
    if (error) errors.push(`activity_snapshots: ${error.message}`);
  }

  // Batch topic accuracy
  if (body.topicAccuracy && Object.keys(body.topicAccuracy).length > 0) {
    const rows = Object.entries(body.topicAccuracy).map(([topic, d]) => ({
      user_id: userId, topic, correct: d.correct, total: d.total, updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("topic_accuracy").upsert(rows, { onConflict: "user_id,topic" });
    if (error) errors.push(`topic_accuracy: ${error.message}`);
  }

  // Weak areas: delete-all + batch insert
  if (body.weakAreas && body.weakAreas.length > 0) {
    const { error: delErr } = await supabase.from("weak_areas").delete().eq("user_id", userId);
    if (delErr) {
      errors.push(`weak_areas (delete): ${delErr.message}`);
    } else {
      const rows = body.weakAreas.map((w) => ({
        user_id: userId, topic: w.topic, accuracy: w.accuracy,
        chapter: w.chapter || null, type: w.type || "topic",
      }));
      const { error: insErr } = await supabase.from("weak_areas").insert(rows);
      if (insErr) errors.push(`weak_areas: ${insErr.message}`);
    }
  }

  // User points
  if (typeof body.points === "number" && body.points > 0) {
    const { error } = await supabase.from("user_points").upsert(
      { user_id: userId, points: body.points, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    if (error) errors.push(`user_points: ${error.message}`);
  }

  // Study streaks
  if (body.streak !== undefined && body.streak > 0) {
    const { error } = await supabase.from("study_streaks").upsert(
      {
        user_id: userId, current_streak: body.streak,
        longest_streak: body.longestStreak || body.streak,
        last_study_date: body.lastStudyDate || new Date().toISOString().split("T")[0],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) errors.push(`study_streaks: ${error.message}`);
  }

  // Student learning state
  if (body.studentLearningState) {
    const s = { ...body.studentLearningState };
    if (body.stateSnapshot) {
      s.study_patterns = { ...((s.study_patterns as Record<string, unknown>) || {}), _snapshot: body.stateSnapshot };
    }
    const { error } = await supabase.from("student_learning_state").upsert(
      { user_id: userId, updated_at: new Date().toISOString(), ...s },
      { onConflict: "user_id" }
    );
    if (error) errors.push(`student_learning_state: ${error.message}`);
  }

  // State snapshot
  if (body.stateSnapshot) {
    try {
      const { error } = await supabase.from("study_state_snapshots").upsert(
        { user_id: userId, data: body.stateSnapshot, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
      if (error) errors.push(`study_state_snapshots: ${error.message}`);
    } catch {
      // table may not exist yet
    }
  }

  // Batch chapter progress
  if (body.chapterProgress && body.chapterProgress.length > 0) {
    const rows = body.chapterProgress.map((cp) => ({
      user_id: userId, chapter: cp.chapter, subject: cp.subject,
      completed_topics: cp.completedTopics, total_topics: cp.totalTopics,
      questions_attempted: cp.questionsAttempted, questions_correct: cp.questionsCorrect,
      flashcards_reviewed: cp.flashcardsReviewed, flashcards_mastered: cp.flashcardsMastered,
      last_studied_at: cp.lastStudiedAt || new Date().toISOString(),
    }));
    const { error } = await supabase.from("chapter_progress").upsert(rows, { onConflict: "user_id,chapter,subject" });
    if (error) errors.push(`chapter_progress: ${error.message}`);
  }

  if (errors.length > 0) {
    return NextResponse.json({ synced: false, errors }, { status: 500 });
  }

  return NextResponse.json({ synced: true });
}

// ── GET — fetch sync data with explicit columns ──

export async function GET(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 501 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId = user.id;

  let snapshotData: SnapshotData | null = null;
  try {
    const snapRes = await supabase
      .from("study_state_snapshots")
      .select("data")
      .eq("user_id", userId)
      .maybeSingle();
    snapshotData = snapRes.data as SnapshotData | null;
  } catch { /* table may not exist yet */ }

  const [
    { data: sessions },
    { data: quizzes },
    { data: tests },
    { data: activities },
    { data: topics },
    { data: weak },
    { data: points },
    { data: streak },
    { data: chapters },
    { data: cognitiveState },
  ] = await Promise.all([
    supabase.from("study_sessions").select("date,minutes").eq("user_id", userId),
    supabase.from("quiz_scores").select("date,score,total,net_score").eq("user_id", userId).order("date", { ascending: false }),
    supabase.from("test_scores").select("date,score,total,chapter").eq("user_id", userId).order("date", { ascending: false }),
    supabase.from("activity_snapshots").select("timestamp,type,score,total,label,items").eq("user_id", userId).order("timestamp", { ascending: false }).limit(500),
    supabase.from("topic_accuracy").select("topic,correct,total").eq("user_id", userId),
    supabase.from("weak_areas").select("topic,accuracy,chapter,type").eq("user_id", userId),
    supabase.from("user_points").select("points").eq("user_id", userId).single(),
    supabase.from("study_streaks").select("current_streak,longest_streak,last_study_date").eq("user_id", userId).single(),
    supabase.from("chapter_progress").select("chapter,subject,completed_topics,total_topics,questions_attempted,questions_correct,flashcards_reviewed,flashcards_mastered,last_studied_at").eq("user_id", userId),
    supabase.from("student_learning_state").select("updated_at").eq("user_id", userId).single(),
  ]);

  const studyMinutes: Record<string, number> = {};
  if (sessions) for (const s of sessions as StudySessionRow[]) studyMinutes[s.date] = s.minutes;

  const pointsRow = points as UserPointsRow | null;
  const streakRow = streak as StudyStreakRow | null;
  const snap = snapshotData?.data || ((cognitiveState?.data as Record<string, unknown>)?.study_patterns as Record<string, unknown>)?._snapshot || null;

  return NextResponse.json({
    studyMinutes,
    quizScores: (quizzes || []) as QuizScoreRow[],
    testScores: (tests || []) as TestScoreRow[],
    activitySnapshots: (activities || []) as ActivitySnapshotRow[],
    topicAccuracy: ((topics || []) as TopicAccuracyRow[]).reduce<Record<string, TopicAccuracyEntry>>((acc, t) => {
      acc[t.topic] = { correct: t.correct, total: t.total }; return acc;
    }, {}),
    weakAreas: (weak || []) as WeakAreaRow[],
    points: pointsRow?.points ?? 0,
    streak: streakRow?.current_streak ?? 0,
    longestStreak: streakRow?.longest_streak ?? 0,
    lastStudyDate: streakRow?.last_study_date ?? null,
    chapterProgress: (chapters || []) as ChapterProgressRow[],
    studentLearningState: cognitiveState?.data ?? null,
    stateSnapshot: snap,
  });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 501 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json();
  const userId = user.id;
  const errors: string[] = [];

  // Study minutes — upsert by (user_id, date)
  if (body.studyMinutes) {
    for (const [date, minutes] of Object.entries(body.studyMinutes)) {
      const { error } = await supabase.from("study_sessions").upsert(
        { user_id: userId, date, minutes: minutes as number },
        { onConflict: "user_id,date" }
      );
      if (error) errors.push(`study_sessions: ${error.message}`);
    }
  }

  // Quiz scores — upsert by (user_id, date)
  if (body.quizScores) {
    for (const q of body.quizScores) {
      const { error } = await supabase.from("quiz_scores").upsert(
        { user_id: userId, date: q.date, score: q.score, total: q.total, net_score: q.netScore },
        { onConflict: "user_id,date" }
      );
      if (error) errors.push(`quiz_scores: ${error.message}`);
    }
  }

  // Test scores — upsert by (user_id, date, chapter)
  if (body.testScores) {
    for (const t of body.testScores) {
      const { error } = await supabase.from("test_scores").upsert(
        { user_id: userId, date: t.date, score: t.score, total: t.total, chapter: t.chapter },
        { onConflict: "user_id,date,chapter" }
      );
      if (error) errors.push(`test_scores: ${error.message}`);
    }
  }

  // Activity snapshots — upsert by (user_id, timestamp, type, label)
  if (body.activitySnapshots) {
    for (const a of body.activitySnapshots) {
      const { error } = await supabase.from("activity_snapshots").upsert(
        {
          user_id: userId,
          timestamp: a.timestamp,
          type: a.type,
          score: a.score ?? null,
          total: a.total ?? null,
          label: a.label || "",
          items: a.items || [],
        },
        { onConflict: "user_id,timestamp,type,label" }
      );
      if (error && !error.message.includes("null value in column"))
        errors.push(`activity: ${error.message}`);
    }
  }

  // Topic accuracy — upsert by (user_id, topic)
  if (body.topicAccuracy) {
    for (const [topic, data] of Object.entries(body.topicAccuracy)) {
      const d = data as { correct: number; total: number };
      const { error } = await supabase.from("topic_accuracy").upsert(
        { user_id: userId, topic, correct: d.correct, total: d.total, updated_at: new Date().toISOString() },
        { onConflict: "user_id,topic" }
      );
      if (error) errors.push(`topic_accuracy: ${error.message}`);
    }
  }

  // Weak areas — replace (computed from accuracy, not append-only)
  if (body.weakAreas) {
    await supabase.from("weak_areas").delete().eq("user_id", userId);
    if (body.weakAreas.length > 0) {
      const rows = body.weakAreas.map((w: any) => ({
        user_id: userId, topic: w.topic, accuracy: w.accuracy, chapter: w.chapter, type: w.type || "topic",
      }));
      const { error } = await supabase.from("weak_areas").insert(rows);
      if (error) errors.push(`weak_areas: ${error.message}`);
    }
  }

  // Points — upsert
  if (typeof body.points === "number") {
    const { error } = await supabase.from("user_points").upsert(
      { user_id: userId, points: body.points, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    if (error) errors.push(`user_points: ${error.message}`);
  }

  // Streak — upsert
  if (body.streak !== undefined) {
    const { error } = await supabase.from("study_streaks").upsert(
      {
        user_id: userId,
        current_streak: body.streak,
        longest_streak: body.longestStreak || body.streak,
        last_study_date: body.lastStudyDate || new Date().toISOString().split("T")[0],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) errors.push(`study_streaks: ${error.message}`);
  }

  // Chapter progress — upsert per chapter
  if (body.chapterProgress) {
    for (const cp of body.chapterProgress) {
      const { error } = await supabase.from("chapter_progress").upsert(
        {
          user_id: userId,
          chapter: cp.chapter,
          subject: cp.subject,
          completed_topics: cp.completedTopics,
          total_topics: cp.totalTopics,
          questions_attempted: cp.questionsAttempted,
          questions_correct: cp.questionsCorrect,
          flashcards_reviewed: cp.flashcardsReviewed,
          flashcards_mastered: cp.flashcardsMastered,
          last_studied_at: cp.lastStudiedAt || new Date().toISOString(),
        },
        { onConflict: "user_id,chapter,subject" }
      );
      if (error) errors.push(`chapter_progress: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ synced: false, errors });
  }

  return NextResponse.json({ synced: true });
}

export async function GET(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 501 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId = user.id;

  const [sessions, quizzes, tests, activities, topics, weak, points, streak, chapters] = await Promise.all([
    supabase.from("study_sessions").select("date,minutes").eq("user_id", userId),
    supabase.from("quiz_scores").select("*").eq("user_id", userId).order("date", { ascending: false }),
    supabase.from("test_scores").select("*").eq("user_id", userId).order("date", { ascending: false }),
    supabase.from("activity_snapshots").select("*").eq("user_id", userId).order("timestamp", { ascending: false }).limit(500),
    supabase.from("topic_accuracy").select("topic,correct,total").eq("user_id", userId),
    supabase.from("weak_areas").select("topic,accuracy,chapter,type").eq("user_id", userId),
    supabase.from("user_points").select("points").eq("user_id", userId).single(),
    supabase.from("study_streaks").select("*").eq("user_id", userId).single(),
    supabase.from("chapter_progress").select("*").eq("user_id", userId),
  ]);

  const studyMinutes: Record<string, number> = {};
  if (sessions.data) for (const s of sessions.data) studyMinutes[s.date] = s.minutes;

  return NextResponse.json({
    studyMinutes,
    quizScores: quizzes.data || [],
    testScores: tests.data || [],
    activitySnapshots: activities.data || [],
    topicAccuracy: (topics.data || []).reduce((acc: Record<string, { correct: number; total: number }>, t: any) => {
      acc[t.topic] = { correct: t.correct, total: t.total }; return acc;
    }, {}),
    weakAreas: weak.data || [],
    points: (points.data as any)?.points ?? 0,
    streak: (streak.data as any)?.current_streak ?? 0,
    longestStreak: (streak.data as any)?.longest_streak ?? 0,
    lastStudyDate: (streak.data as any)?.last_study_date ?? null,
    chapterProgress: chapters.data || [],
  });
}

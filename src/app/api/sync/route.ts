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

  // Upsert study minutes
  if (body.studyMinutes) {
    for (const [date, minutes] of Object.entries(body.studyMinutes)) {
      const { error } = await supabase.from("study_sessions").upsert(
        { user_id: userId, date, minutes: minutes as number },
        { onConflict: "user_id,date" }
      );
      if (error) errors.push(`study_sessions: ${error.message}`);
    }
  }

  // Upsert quiz scores
  if (body.quizScores) {
    for (const q of body.quizScores) {
      const { error } = await supabase.from("quiz_scores").insert({
        user_id: userId,
        date: q.date,
        score: q.score,
        total: q.total,
        net_score: q.netScore,
      });
      if (error && !error.message.includes("duplicate key"))
        errors.push(`quiz_scores: ${error.message}`);
    }
  }

  // Upsert test scores
  if (body.testScores) {
    for (const t of body.testScores) {
      const { error } = await supabase.from("test_scores").insert({
        user_id: userId,
        date: t.date,
        score: t.score,
        total: t.total,
        chapter: t.chapter,
      });
      if (error && !error.message.includes("duplicate key"))
        errors.push(`test_scores: ${error.message}`);
    }
  }

  // Upsert activity snapshots
  if (body.activitySnapshots) {
    for (const a of body.activitySnapshots) {
      const { error } = await supabase.from("activity_snapshots").insert({
        user_id: userId,
        timestamp: a.timestamp,
        type: a.type,
        score: a.score,
        total: a.total,
        label: a.label,
        items: a.items,
      });
      if (error && !error.message.includes("duplicate key"))
        errors.push(`activity: ${error.message}`);
    }
  }

  // Upsert topic accuracy
  if (body.topicAccuracy) {
    for (const [topic, data] of Object.entries(body.topicAccuracy)) {
      const d = data as { correct: number; total: number };
      const { error } = await supabase.from("topic_accuracy").upsert(
        { user_id: userId, topic, correct: d.correct, total: d.total },
        { onConflict: "user_id,topic" }
      );
      if (error) errors.push(`topic_accuracy: ${error.message}`);
    }
  }

  // Sync weak areas
  if (body.weakAreas) {
    // Delete old weak areas and insert fresh ones
    await supabase.from("weak_areas").delete().eq("user_id", userId);
    for (const w of body.weakAreas) {
      const { error } = await supabase.from("weak_areas").insert({
        user_id: userId,
        topic: w.topic,
        accuracy: w.accuracy,
        chapter: w.chapter,
        type: w.type || "topic",
      });
      if (error) errors.push(`weak_areas: ${error.message}`);
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

  const [sessions, quizzes, tests, activities, topics, weak] = await Promise.all([
    supabase.from("study_sessions").select("date,minutes").eq("user_id", userId),
    supabase.from("quiz_scores").select("*").eq("user_id", userId).order("date", { ascending: false }),
    supabase.from("test_scores").select("*").eq("user_id", userId).order("date", { ascending: false }),
    supabase.from("activity_snapshots").select("*").eq("user_id", userId).order("timestamp", { ascending: false }),
    supabase.from("topic_accuracy").select("topic,correct,total").eq("user_id", userId),
    supabase.from("weak_areas").select("topic,accuracy,chapter,type").eq("user_id", userId),
  ]);

  const studyMinutes: Record<string, number> = {};
  if (sessions.data) {
    for (const s of sessions.data) studyMinutes[s.date] = s.minutes;
  }

  return NextResponse.json({
    studyMinutes,
    quizScores: quizzes.data || [],
    testScores: tests.data || [],
    activitySnapshots: activities.data || [],
    topicAccuracy: (topics.data || []).reduce(
      (acc: Record<string, { correct: number; total: number }>, t: any) => {
        acc[t.topic] = { correct: t.correct, total: t.total };
        return acc;
      },
      {}
    ),
    weakAreas: weak.data || [],
  });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  console.log("[DEBUG SYNC] POST /api/sync START");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.log("[DEBUG SYNC] supabase not configured");
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 501 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.log("[DEBUG SYNC] unauthorized");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  console.log("[DEBUG SYNC] user:", user.id);

  const body = await request.json();
  console.log("[DEBUG SYNC] body keys present:", Object.keys(body));
  console.log("[DEBUG SYNC] studyMinutes keys:", body.studyMinutes ? Object.keys(body.studyMinutes).length : "absent/falsy");
  console.log("[DEBUG SYNC] quizScores:", body.quizScores?.length ?? "absent/falsy");
  console.log("[DEBUG SYNC] testScores:", body.testScores?.length ?? "absent/falsy");
  console.log("[DEBUG SYNC] activitySnapshots:", body.activitySnapshots?.length ?? "absent/falsy");
  console.log("[DEBUG SYNC] topicAccuracy keys:", body.topicAccuracy ? Object.keys(body.topicAccuracy).length : "absent/falsy");
  console.log("[DEBUG SYNC] weakAreas:", body.weakAreas?.length ?? "absent/falsy");
  console.log("[DEBUG SYNC] points:", body.points, "type:", typeof body.points);
  console.log("[DEBUG SYNC] streak:", body.streak);
  console.log("[DEBUG SYNC] studentLearningState keys:", body.studentLearningState ? Object.keys(body.studentLearningState) : "absent/falsy");
  console.log("[DEBUG SYNC] chapterProgress:", body.chapterProgress?.length ?? "absent/falsy");

  const userId = user.id;
  const errors: string[] = [];
  const tasks: Promise<void>[] = [];

  if (body.studyMinutes && Object.keys(body.studyMinutes).length > 0) {
    console.log("[DEBUG SYNC] processing study_sections upserts:", Object.keys(body.studyMinutes).length);
    for (const [date, minutes] of Object.entries(body.studyMinutes)) {
      tasks.push(
        (async () => {
          const { error } = await supabase.from("study_sessions").upsert(
            { user_id: userId, date, minutes: minutes as number },
            { onConflict: "user_id,date" }
          );
          if (error) { console.error("[DEBUG SYNC] study_sessions error:", error.message); errors.push(`study_sessions: ${error.message}`); }
          else console.log("[DEBUG SYNC] study_sessions OK:", date, minutes);
        })()
      );
    }
  } else {
    console.log("[DEBUG SYNC] study_sessions: skipped (no data)");
  }

  if (body.quizScores && body.quizScores.length > 0) {
    console.log("[DEBUG SYNC] processing quiz_scores upserts:", body.quizScores.length);
    for (const q of body.quizScores) {
      tasks.push(
        (async () => {
          const { error } = await supabase.from("quiz_scores").upsert(
            { user_id: userId, date: q.date, score: q.score, total: q.total, net_score: q.netScore },
            { onConflict: "user_id,date" }
          );
          if (error) { console.error("[DEBUG SYNC] quiz_scores error:", error.message); errors.push(`quiz_scores: ${error.message}`); }
          else console.log("[DEBUG SYNC] quiz_scores OK:", q.date, q.score);
        })()
      );
    }
  } else {
    console.log("[DEBUG SYNC] quiz_scores: skipped (no data)");
  }

  if (body.testScores && body.testScores.length > 0) {
    console.log("[DEBUG SYNC] processing test_scores upserts:", body.testScores.length);
    for (const t of body.testScores) {
      tasks.push(
        (async () => {
          const { error } = await supabase.from("test_scores").upsert(
            { user_id: userId, date: t.date, score: t.score, total: t.total, chapter: t.chapter },
            { onConflict: "user_id,date,chapter" }
          );
          if (error) { console.error("[DEBUG SYNC] test_scores error:", error.message); errors.push(`test_scores: ${error.message}`); }
          else console.log("[DEBUG SYNC] test_scores OK:", t.date, t.chapter);
        })()
      );
    }
  } else {
    console.log("[DEBUG SYNC] test_scores: skipped (no data)");
  }

  if (body.activitySnapshots && body.activitySnapshots.length > 0) {
    console.log("[DEBUG SYNC] processing activity_snapshots upserts:", body.activitySnapshots.length);
    for (const a of body.activitySnapshots) {
      tasks.push(
        (async () => {
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
            { onConflict: "user_id,timestamp,type" }
          );
          if (error) { console.error("[DEBUG SYNC] activity_snapshots error:", error.message); errors.push(`activity_snapshots: ${error.message}`); }
          else console.log("[DEBUG SYNC] activity_snapshots OK:", a.type, a.timestamp);
        })()
      );
    }
  } else {
    console.log("[DEBUG SYNC] activity_snapshots: skipped (no data)");
  }

  if (body.topicAccuracy && Object.keys(body.topicAccuracy).length > 0) {
    console.log("[DEBUG SYNC] processing topic_accuracy upserts:", Object.keys(body.topicAccuracy).length);
    for (const [topic, data] of Object.entries(body.topicAccuracy)) {
      const d = data as { correct: number; total: number };
      tasks.push(
        (async () => {
          const { error } = await supabase.from("topic_accuracy").upsert(
            { user_id: userId, topic, correct: d.correct, total: d.total, updated_at: new Date().toISOString() },
            { onConflict: "user_id,topic" }
          );
          if (error) { console.error("[DEBUG SYNC] topic_accuracy error:", error.message); errors.push(`topic_accuracy: ${error.message}`); }
          else console.log("[DEBUG SYNC] topic_accuracy OK:", topic);
        })()
      );
    }
  } else {
    console.log("[DEBUG SYNC] topic_accuracy: skipped (no data)");
  }

  if (body.weakAreas && body.weakAreas.length > 0) {
    console.log("[DEBUG SYNC] processing weak_areas delete+insert:", body.weakAreas.length);
    tasks.push(
      (async () => {
        const { error: delErr } = await supabase.from("weak_areas").delete().eq("user_id", userId);
        if (delErr) { console.error("[DEBUG SYNC] weak_areas delete error:", delErr.message); errors.push(`weak_areas (delete): ${delErr.message}`); return; }
        console.log("[DEBUG SYNC] weak_areas: delete OK");
        if (body.weakAreas.length > 0) {
          const rows = body.weakAreas.map((w: any) => ({
            user_id: userId, topic: w.topic, accuracy: w.accuracy, chapter: w.chapter, type: w.type || "topic",
          }));
          const { error: insErr } = await supabase.from("weak_areas").insert(rows);
          if (insErr) { console.error("[DEBUG SYNC] weak_areas insert error:", insErr.message); errors.push(`weak_areas (insert): ${insErr.message}`); }
          else console.log("[DEBUG SYNC] weak_areas insert OK:", rows.length, "rows");
        }
      })()
    );
  } else {
    console.log("[DEBUG SYNC] weak_areas: skipped (no data)");
  }

  if (typeof body.points === "number" && body.points > 0) {
    console.log("[DEBUG SYNC] processing user_points upsert:", body.points);
    tasks.push(
      (async () => {
        const { error } = await supabase.from("user_points").upsert(
          { user_id: userId, points: body.points, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
        if (error) { console.error("[DEBUG SYNC] user_points error:", error.message); errors.push(`user_points: ${error.message}`); }
        else console.log("[DEBUG SYNC] user_points OK:", body.points);
      })()
    );
  } else {
    console.log("[DEBUG SYNC] user_points: skipped (points:", body.points, ")");
  }

  if (body.streak !== undefined && body.streak > 0) {
    console.log("[DEBUG SYNC] processing study_streaks upsert, streak:", body.streak);
    tasks.push(
      (async () => {
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
        if (error) { console.error("[DEBUG SYNC] study_streaks error:", error.message); errors.push(`study_streaks: ${error.message}`); }
        else console.log("[DEBUG SYNC] study_streaks OK");
      })()
    );
  } else {
    console.log("[DEBUG SYNC] study_streaks: skipped (streak:", body.streak, ")");
  }

  if (body.studentLearningState) {
    console.log("[DEBUG SYNC] processing student_learning_state upsert, keys:", Object.keys(body.studentLearningState));
    const s = body.studentLearningState;
    if (body.stateSnapshot) {
      s.study_patterns = { ...(s.study_patterns || {}), _snapshot: body.stateSnapshot };
    }
    tasks.push(
      (async () => {
        const { error } = await supabase.from("student_learning_state").upsert(
          { user_id: userId, updated_at: new Date().toISOString(), ...s },
          { onConflict: "user_id" }
        );
        if (error) { console.error("[DEBUG SYNC] student_learning_state error:", error.message); errors.push(`student_learning_state: ${error.message}`); }
        else console.log("[DEBUG SYNC] student_learning_state OK");
      })()
    );
  } else {
    console.log("[DEBUG SYNC] student_learning_state: skipped (no data)");
  }

  if (body.stateSnapshot) {
    console.log("[DEBUG SYNC] processing study_state_snapshots upsert (keys:", Object.keys(body.stateSnapshot).length, ")");
    const snapshotData = {
      user_id: userId,
      data: body.stateSnapshot,
      updated_at: new Date().toISOString(),
    };
    tasks.push(
      (async () => {
        try {
          const { error } = await supabase.from("study_state_snapshots").upsert(
            snapshotData,
            { onConflict: "user_id" }
          );
          if (error) { console.error("[DEBUG SYNC] study_state_snapshots error:", error.message); errors.push(`study_state_snapshots: ${error.message}`); }
          else console.log("[DEBUG SYNC] study_state_snapshots OK");
        } catch (e) {
          console.error("[DEBUG SYNC] study_state_snapshots exception (table may not exist):", e);
        }
      })()
    );
  } else {
    console.log("[DEBUG SYNC] study_state_snapshots: skipped (no data)");
  }

  if (body.chapterProgress && body.chapterProgress.length > 0) {
    console.log("[DEBUG SYNC] processing chapter_progress upserts:", body.chapterProgress.length);
    for (const cp of body.chapterProgress) {
      tasks.push(
        (async () => {
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
          if (error) { console.error("[DEBUG SYNC] chapter_progress error:", error.message); errors.push(`chapter_progress: ${error.message}`); }
          else console.log("[DEBUG SYNC] chapter_progress OK:", cp.chapter);
        })()
      );
    }
  } else {
    console.log("[DEBUG SYNC] chapter_progress: skipped (no data)");
  }

  console.log("[DEBUG SYNC] awaiting", tasks.length, "parallel tasks");
  await Promise.all(tasks);
  console.log("[DEBUG SYNC] all tasks done, errors:", errors.length);

  if (errors.length > 0) {
    console.error("[DEBUG SYNC] ERRORS:", errors.join(" | "));
    return NextResponse.json({ synced: false, errors }, { status: 500 });
  }

  console.log("[DEBUG SYNC] POST /api/sync SUCCESS");
  return NextResponse.json({ synced: true });
}

export async function GET(request: Request) {
  console.log("[DEBUG SYNC] GET /api/sync START");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 501 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId = user.id;
  console.log("[DEBUG SYNC] GET user:", userId);

  let snapshotData: any = null;
  try {
    const snapRes = await supabase.from("study_state_snapshots").select("data").eq("user_id", userId).maybeSingle();
    snapshotData = snapRes.data;
  } catch { /* table may not exist yet */ }

  const [sessions, quizzes, tests, activities, topics, weak, points, streak, chapters, cognitiveState] = await Promise.all([
    supabase.from("study_sessions").select("date,minutes").eq("user_id", userId),
    supabase.from("quiz_scores").select("*").eq("user_id", userId).order("date", { ascending: false }),
    supabase.from("test_scores").select("*").eq("user_id", userId).order("date", { ascending: false }),
    supabase.from("activity_snapshots").select("*").eq("user_id", userId).order("timestamp", { ascending: false }).limit(500),
    supabase.from("topic_accuracy").select("topic,correct,total").eq("user_id", userId),
    supabase.from("weak_areas").select("topic,accuracy,chapter,type").eq("user_id", userId),
    supabase.from("user_points").select("points").eq("user_id", userId).single(),
    supabase.from("study_streaks").select("*").eq("user_id", userId).single(),
    supabase.from("chapter_progress").select("*").eq("user_id", userId),
    supabase.from("student_learning_state").select("*").eq("user_id", userId).single(),
  ]);

  const results = {
    study_sessions: sessions.data?.length ?? 0,
    quiz_scores: quizzes.data?.length ?? 0,
    test_scores: tests.data?.length ?? 0,
    activity_snapshots: activities.data?.length ?? 0,
    topic_accuracy: topics.data?.length ?? 0,
    weak_areas: weak.data?.length ?? 0,
    user_points: (points.data as any)?.points ?? 0,
    study_streaks: (streak.data as any)?.current_streak ?? 0,
    chapter_progress: chapters.data?.length ?? 0,
    student_learning_state: cognitiveState.data ? "present" : "absent",
    study_state_snapshot: snapshotData ? "present" : "absent",
  };
  console.log("[DEBUG SYNC] GET results:", results);

  const studyMinutes: Record<string, number> = {};
  if (sessions.data) for (const s of sessions.data) studyMinutes[s.date] = s.minutes;

  const snapshot = (snapshotData as any)?.data || (cognitiveState.data as any)?.study_patterns?._snapshot || null;

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
    studentLearningState: cognitiveState.data || null,
    stateSnapshot: snapshot,
  });
}

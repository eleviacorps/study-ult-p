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
  const tasks: Promise<void>[] = [];

  if (body.studyMinutes) {
    for (const [date, minutes] of Object.entries(body.studyMinutes)) {
      tasks.push(
        (async () => {
          const { error } = await supabase.from("study_sessions").upsert(
            { user_id: userId, date, minutes: minutes as number },
            { onConflict: "user_id,date" }
          );
          if (error) errors.push(`study_sessions: ${error.message}`);
        })()
      );
    }
  }

  if (body.quizScores) {
    for (const q of body.quizScores) {
      tasks.push(
        (async () => {
          const { error } = await supabase.from("quiz_scores").upsert(
            { user_id: userId, date: q.date, score: q.score, total: q.total, net_score: q.netScore },
            { onConflict: "user_id,date" }
          );
          if (error) errors.push(`quiz_scores: ${error.message}`);
        })()
      );
    }
  }

  if (body.testScores) {
    for (const t of body.testScores) {
      tasks.push(
        (async () => {
          const { error } = await supabase.from("test_scores").upsert(
            { user_id: userId, date: t.date, score: t.score, total: t.total, chapter: t.chapter },
            { onConflict: "user_id,date,chapter" }
          );
          if (error) errors.push(`test_scores: ${error.message}`);
        })()
      );
    }
  }

  if (body.activitySnapshots) {
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
          if (error) errors.push(`activity: ${error.message}`);
        })()
      );
    }
  }

  if (body.topicAccuracy) {
    for (const [topic, data] of Object.entries(body.topicAccuracy)) {
      const d = data as { correct: number; total: number };
      tasks.push(
        (async () => {
          const { error } = await supabase.from("topic_accuracy").upsert(
            { user_id: userId, topic, correct: d.correct, total: d.total, updated_at: new Date().toISOString() },
            { onConflict: "user_id,topic" }
          );
          if (error) errors.push(`topic_accuracy: ${error.message}`);
        })()
      );
    }
  }

  if (body.weakAreas) {
    tasks.push(
      (async () => {
        const { error: delErr } = await supabase.from("weak_areas").delete().eq("user_id", userId);
        if (delErr) { errors.push(`weak_areas: ${delErr.message}`); return; }
        if (body.weakAreas.length > 0) {
          const rows = body.weakAreas.map((w: any) => ({
            user_id: userId, topic: w.topic, accuracy: w.accuracy, chapter: w.chapter, type: w.type || "topic",
          }));
          const { error: insErr } = await supabase.from("weak_areas").insert(rows);
          if (insErr) errors.push(`weak_areas: ${insErr.message}`);
        }
      })()
    );
  }

  if (typeof body.points === "number") {
    tasks.push(
      (async () => {
        const { error } = await supabase.from("user_points").upsert(
          { user_id: userId, points: body.points, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
        if (error) errors.push(`user_points: ${error.message}`);
      })()
    );
  }

  if (body.streak !== undefined) {
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
        if (error) errors.push(`study_streaks: ${error.message}`);
      })()
    );
  }

  if (body.studentLearningState) {
    const cognitiveState = body.studentLearningState;
    tasks.push(
      (async () => {
        const { error } = await supabase.from("student_learning_state").upsert(
          {
            user_id: userId,
            mastery_map: cognitiveState.mastery_map || {},
            weak_topics: cognitiveState.weak_topics || [],
            confidence_levels: cognitiveState.confidence_levels || {},
            misconception_patterns: cognitiveState.misconception_patterns || [],
            recent_failures: cognitiveState.recent_failures || [],
            learning_velocity: cognitiveState.learning_velocity || {},
            focus_topics: cognitiveState.focus_topics || [],
            recovery_queue: cognitiveState.recovery_queue || [],
            forgetting_curve_state: cognitiveState.forgetting_curve_state || {},
            solved_question_embeddings: cognitiveState.solved_question_embeddings || [],
            concept_relationships: cognitiveState.concept_relationships || [],
            exam_goals: cognitiveState.exam_goals || [],
            preferred_difficulty: cognitiveState.preferred_difficulty || "adaptive",
            tutor_personality_prompt: cognitiveState.tutor_personality_prompt || "",
            generated_learning_profile: cognitiveState.generated_learning_profile || "",
            adaptive_recommendations: cognitiveState.adaptive_recommendations || [],
            streak_data: cognitiveState.streak_data || {},
            study_patterns: cognitiveState.study_patterns || {},
            performance_trends: cognitiveState.performance_trends || {},
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
        if (error) errors.push(`student_learning_state: ${error.message}`);
      })()
    );
  }

  if (body.chapterProgress) {
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
          if (error) errors.push(`chapter_progress: ${error.message}`);
        })()
      );
    }
  }

  await Promise.all(tasks);

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
    studentLearningState: cognitiveState.data || null,
  });
}

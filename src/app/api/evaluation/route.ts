import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canonicalSlug } from "@/lib/content-identity";

type EvaluationPayload = {
  surface?: string;
  questionId?: string;
  topic?: string;
  chapter?: string;
  subject?: string;
  correct?: boolean;
  score?: number;
  maxScore?: number;
  feedback?: string;
  misconception?: string;
  metadata?: Record<string, unknown>;
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 501 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as EvaluationPayload;
  const topic = String(body.topic || body.chapter || "general").slice(0, 200);
  const chapter = String(body.chapter || "General").slice(0, 200);
  const conceptSlug = canonicalSlug(topic || chapter);
  const correct = Boolean(body.correct);
  const maxScore = Math.max(1, toNumber(body.maxScore, 1));
  const score = clamp(toNumber(body.score, correct ? maxScore : 0), 0, maxScore);
  const accuracy = clamp((score / maxScore) * 100);
  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();

  const errors: string[] = [];

  const { error: attemptError } = await supabase.from("attempt_analytics").insert({
    user_id: user.id,
    surface: String(body.surface || "practice").slice(0, 80),
    question_id: body.questionId ? String(body.questionId).slice(0, 200) : null,
    concept_slug: conceptSlug,
    topic,
    chapter,
    subject: body.subject ? String(body.subject).slice(0, 120) : null,
    correct,
    score,
    max_score: maxScore,
    feedback: String(body.feedback || "").slice(0, 2000),
    misconception: String(body.misconception || "").slice(0, 500),
    metadata: body.metadata || {},
  });
  if (attemptError) errors.push(`attempt_analytics: ${attemptError.message}`);

  const { data: existingMastery } = await supabase
    .from("student_mastery")
    .select("mastery,confidence,evidence")
    .eq("user_id", user.id)
    .eq("concept_slug", conceptSlug)
    .single();

  const previousMastery = toNumber((existingMastery as any)?.mastery, 0);
  const previousConfidence = toNumber((existingMastery as any)?.confidence, 0);
  const nextMastery = clamp(previousMastery * 0.72 + accuracy * 0.28);
  const nextConfidence = clamp(previousConfidence + (correct ? 6 : 3));
  const evidence = Array.isArray((existingMastery as any)?.evidence) ? (existingMastery as any).evidence.slice(-9) : [];
  evidence.push({ at: now, surface: body.surface || "practice", correct, score, maxScore, questionId: body.questionId || null });

  const { error: masteryError } = await supabase.from("student_mastery").upsert(
    {
      user_id: user.id,
      concept_slug: conceptSlug,
      mastery: nextMastery,
      confidence: nextConfidence,
      evidence,
      updated_at: now,
    },
    { onConflict: "user_id,concept_slug" }
  );
  if (masteryError) errors.push(`student_mastery: ${masteryError.message}`);

  if (!correct) {
    const misconception = String(body.misconception || body.feedback || `Needs recovery on ${topic}`).slice(0, 500);
    const { error: misconceptionError } = await supabase.from("student_misconceptions").insert({
      user_id: user.id,
      concept_slug: conceptSlug,
      pattern: misconception,
      severity: accuracy < 40 ? "high" : "medium",
      evidence: [{ at: now, questionId: body.questionId || null, score, maxScore }],
    });
    if (misconceptionError) errors.push(`student_misconceptions: ${misconceptionError.message}`);

    const { error: taskError } = await supabase.from("student_recovery_tasks").insert({
      user_id: user.id,
      concept_slug: conceptSlug,
      task: `Review ${topic} and retry one targeted question`,
      source: "evaluation",
      status: "pending",
      metadata: { chapter, surface: body.surface || "practice", accuracy },
    });
    if (taskError) errors.push(`student_recovery_tasks: ${taskError.message}`);
  }

  const { data: daily } = await supabase
    .from("daily_learning_metrics")
    .select("attempts,correct")
    .eq("user_id", user.id)
    .eq("date", today)
    .single();
  const dailyAttempts = toNumber((daily as any)?.attempts, 0) + 1;
  const dailyCorrect = toNumber((daily as any)?.correct, 0) + (correct ? 1 : 0);
  const { error: dailyError } = await supabase.from("daily_learning_metrics").upsert(
    {
      user_id: user.id,
      date: today,
      attempts: dailyAttempts,
      correct: dailyCorrect,
      metadata: { accuracy: Math.round((dailyCorrect / Math.max(1, dailyAttempts)) * 100) },
      updated_at: now,
    },
    { onConflict: "user_id,date" }
  );
  if (dailyError) errors.push(`daily_learning_metrics: ${dailyError.message}`);

  const { data: velocity } = await supabase
    .from("topic_velocity")
    .select("attempts,correct,last_accuracy")
    .eq("user_id", user.id)
    .eq("topic", topic)
    .single();
  const topicAttempts = toNumber((velocity as any)?.attempts, 0) + 1;
  const topicCorrect = toNumber((velocity as any)?.correct, 0) + (correct ? 1 : 0);
  const previousAccuracy = toNumber((velocity as any)?.last_accuracy, 0);
  const lastAccuracy = clamp((topicCorrect / Math.max(1, topicAttempts)) * 100);
  const { error: velocityError } = await supabase.from("topic_velocity").upsert(
    {
      user_id: user.id,
      topic,
      chapter,
      attempts: topicAttempts,
      correct: topicCorrect,
      last_accuracy: lastAccuracy,
      velocity: lastAccuracy - previousAccuracy,
      updated_at: now,
    },
    { onConflict: "user_id,topic" }
  );
  if (velocityError) errors.push(`topic_velocity: ${velocityError.message}`);

  const { error: trendError } = await supabase.from("performance_trends").insert({
    user_id: user.id,
    metric: "attempt_accuracy",
    scope: topic,
    value: accuracy,
    metadata: { chapter, surface: body.surface || "practice", correct },
  });
  if (trendError) errors.push(`performance_trends: ${trendError.message}`);

  if (errors.length > 0) return NextResponse.json({ recorded: false, errors }, { status: 207 });
  return NextResponse.json({ recorded: true, conceptSlug, mastery: nextMastery, confidence: nextConfidence });
}

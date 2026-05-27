import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_AI_BASE_URL = "https://opencode.ai/zen";
const DEFAULT_AI_MODEL = "deepseek-v4-flash-free";

type OnboardingBody = {
  name?: string;
  username?: string;
  survey?: Record<string, unknown>;
};

function cleanText(value: unknown, max = 160): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function fallbackProfile(survey: Record<string, unknown>) {
  const subjects = Array.isArray(survey.subjects) ? survey.subjects.join(", ") : "selected subjects";
  const goals = cleanText(survey.goals, 300) || "build consistent mastery";
  const weaknesses = cleanText(survey.weaknesses, 300) || "currently unclear weak areas";
  const pace = cleanText(survey.learning_pace) || "steady";

  return {
    generated_learning_profile: `Student is preparing across ${subjects}. Primary goal: ${goals}. Current weak areas: ${weaknesses}. Preferred pace: ${pace}.`,
    adaptive_strategy: `Prioritize vault-derived concepts, short daily retrieval practice, targeted recovery tasks for weak topics, and spaced repetition reviews before new material.`,
    tutor_personality_prompt: `Be concise, rigorous, encouraging, and adaptive. Ask one diagnostic question when confidence is low. Prefer hints before full solutions.`,
  };
}

async function generateAiProfile(survey: Record<string, unknown>) {
  const baseUrl = (process.env.AI_BASE_URL || DEFAULT_AI_BASE_URL).replace(/\/+$/, "");
  const model = process.env.AI_MODEL || DEFAULT_AI_MODEL;
  const apiKey = process.env.AI_API_KEY || process.env.OPENCODE_API_KEY || "";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "Create a compact StudyUlt learning profile from onboarding data. Return ONLY valid JSON with keys generated_learning_profile, adaptive_strategy, tutor_personality_prompt.",
        },
        { role: "user", content: JSON.stringify({ survey }) },
      ],
      temperature: 0.2,
      max_tokens: 1200,
    }),
  });

  if (!response.ok) throw new Error("ai_profile_failed");
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("invalid_ai_profile");
  return JSON.parse(jsonMatch[0]);
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

  const body = (await request.json().catch(() => ({}))) as OnboardingBody;
  const name = cleanText(body.name, 80);
  const username = cleanText(body.username, 40).replace(/[^a-zA-Z0-9_]/g, "");
  const survey = body.survey && typeof body.survey === "object" ? body.survey : {};

  if (!name || !username) {
    return NextResponse.json({ error: "name_and_username_required" }, { status: 400 });
  }

  let aiProfile = fallbackProfile(survey);
  try {
    const generated = await generateAiProfile(survey);
    aiProfile = {
      generated_learning_profile: cleanText(generated.generated_learning_profile, 4000) || aiProfile.generated_learning_profile,
      adaptive_strategy: cleanText(generated.adaptive_strategy, 4000) || aiProfile.adaptive_strategy,
      tutor_personality_prompt: cleanText(generated.tutor_personality_prompt, 4000) || aiProfile.tutor_personality_prompt,
    };
  } catch {
    // Keep deterministic profile so onboarding is not blocked by AI service availability.
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      name,
      username,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (profileError) {
    if (profileError.message.includes("idx_profiles_username")) {
      return NextResponse.json({ error: "username_taken" }, { status: 409 });
    }
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const { error: goalError } = await supabase.from("student_goal_profiles").upsert(
    {
      user_id: user.id,
      exam_goals: Array.isArray(survey.target_exams) ? survey.target_exams : [],
      preferred_difficulty: cleanText(survey.preferred_difficulty) || "Moderate",
      survey,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (goalError) return NextResponse.json({ error: goalError.message }, { status: 500 });

  const { error: aiProfileError } = await supabase.from("student_ai_profiles").upsert(
    {
      user_id: user.id,
      tutor_personality_prompt: aiProfile.tutor_personality_prompt,
      generated_learning_profile: aiProfile.generated_learning_profile,
      adaptive_strategy: aiProfile.adaptive_strategy,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (aiProfileError) return NextResponse.json({ error: aiProfileError.message }, { status: 500 });

  const { error: stateError } = await supabase.from("student_learning_state").upsert(
    {
      user_id: user.id,
      exam_goals: Array.isArray(survey.target_exams) ? survey.target_exams : [],
      preferred_difficulty: cleanText(survey.preferred_difficulty) || "Moderate",
      tutor_personality_prompt: aiProfile.tutor_personality_prompt,
      generated_learning_profile: aiProfile.generated_learning_profile,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (stateError) return NextResponse.json({ error: stateError.message }, { status: 500 });

  return NextResponse.json({ completed: true, aiProfile });
}

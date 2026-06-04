import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logRequest } from "@/lib/server-log";

export const runtime = "edge";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * GET /api/neet-bank
 *
 * Retrieve NEET questions by subject + chapter.
 *
 * Params:
 *   subject    — filter by subject (Physics | Chemistry | Biology)
 *   chapter    — chapter name or slug (fuzzy matched if exact fails)
 *   q          — text search on chapter name
 *   year       — filter by year
 *   limit      — max results (default 50, max 200)
 *   random     — if "true", randomize order
 *
 * Examples:
 *   GET /api/neet-bank?subject=Physics&chapter=Electrostatics
 *   GET /api/neet-bank?subject=Biology&q=biomolecules&random=true&limit=10
 */
export async function GET(request: Request) {
  const log = logRequest("GET /api/neet-bank", null);
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ questions: [], total: 0 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ questions: [], total: 0 }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Special mode: list available chapters
    if (searchParams.get("mode") === "chapters") {
      const subject = searchParams.get("subject");
      let q = supabase
        .from("neet_bank")
        .select("subject, chapter", { count: "exact", head: false });
      if (subject) q = q.eq("subject", subject);
      const { data } = await q;
      const seen = new Set<string>();
      const chapters: { subject: string; chapter: string }[] = [];
      for (const r of (data || []) as { subject: string; chapter: string }[]) {
        const key = `${r.subject}/${r.chapter}`;
        if (!seen.has(key)) { seen.add(key); chapters.push(r); }
      }
      return NextResponse.json({ chapters });
    }

    const subject = searchParams.get("subject");
    let chapter = searchParams.get("chapter");
    const q = searchParams.get("q");
    const year = searchParams.get("year");
    const limit = Math.min(Number(searchParams.get("limit") || 50), 200);
    const random = searchParams.get("random") === "true";

    // Use q param as chapter name if chapter not specified
    if (!chapter && q) chapter = q;

    let query = supabase
      .from("neet_bank")
      .select("id,question_id,subject,chapter,year,type,difficulty,question_text,options,correct_answer,solution_text,has_diagram,metadata")
      .limit(limit);

    if (subject) query = query.eq("subject", subject);
    if (year) query = query.eq("year", year);

    // Chapter matching: try exact slug first, then fuzzy
    if (chapter) {
      // Try exact match first
      query = query.eq("chapter", chapter);

      // We need to check if exact match returns results — but we can't
      // modify the query after seeing results. Instead, try the exact
      // match and if 0 results, we detect that in the response.
    }

    let { data, error } = await query;

    // If exact chapter match returned 0 results, try ILIKE fuzzy match
    if (chapter && (!data || data.length === 0)) {
      let fuzzy = supabase
        .from("neet_bank")
        .select("id,question_id,subject,chapter,year,type,difficulty,question_text,options,correct_answer,solution_text,has_diagram,metadata")
        .limit(limit);

      if (subject) fuzzy = fuzzy.eq("subject", subject);
      if (year) fuzzy = fuzzy.eq("year", year);

      // Try ILIKE on the chapter name
      const slug = slugify(chapter);
      fuzzy = fuzzy.or(`chapter.ilike.%${chapter.replace(/-/g, " ")}%,chapter.ilike.%${slug}%`);
      const result = await fuzzy;
      data = result.data;
      if (!error) error = result.error;
    }

    if (error) {
      return NextResponse.json({ questions: [], total: 0, error: error.message }, { status: 500 });
    }

    let questions = (data || []).map((r: Record<string, unknown>) => ({
      id: r.id,
      question_id: r.question_id,
      subject: r.subject,
      chapter: r.chapter,
      year: r.year,
      type: r.type,
      difficulty: r.difficulty,
      question_text: r.question_text,
      options: r.options,
      correct_answer: r.correct_answer,
      solution_text: r.solution_text,
      has_diagram: r.has_diagram,
    }));

    // Fisher-Yates shuffle for random mode (postgREST doesn't support order("random()"))
    if (random) {
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }
    }

    await log.success(200, `neet_bank: ${subject}/${chapter} → ${questions.length}q`);
    return NextResponse.json({ questions, total: questions.length });
  } catch (err: unknown) {
    await log.error("neet_bank_error", err);
    return NextResponse.json({ questions: [], total: 0, error: "internal_error" }, { status: 500 });
  }
}

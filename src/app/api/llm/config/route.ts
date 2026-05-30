import { NextResponse } from "next/server";

const DEFAULT_AI_BASE_URL = "https://opencode.ai/zen";
const DEFAULT_AI_MODEL = "deepseek-v4-flash-free";

export async function GET() {
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const baseUrl = (process.env.AI_BASE_URL || DEFAULT_AI_BASE_URL).replace(/\/+$/, "");
    const model = process.env.AI_MODEL || DEFAULT_AI_MODEL;
    const apiKey = process.env.AI_API_KEY || process.env.OPENCODE_API_KEY || "";

    return NextResponse.json({ baseUrl, model, apiKey });
  } catch {
    return NextResponse.json({ error: "config_error" }, { status: 500 });
  }
}

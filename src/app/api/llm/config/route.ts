import { NextResponse } from "next/server";
import { logRequest } from "@/lib/server-log";

const DEFAULT_AI_BASE_URL = "https://opencode.ai/zen";
const DEFAULT_AI_MODEL = "deepseek-v4-flash-free";

export async function GET() {
  const log = logRequest("GET /api/llm/config", null);
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        await log.warn(401, "unauthorized");
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      log.setMeta("userId", user.id);
    }

    const baseUrl = (process.env.AI_BASE_URL || DEFAULT_AI_BASE_URL).replace(/\/+$/, "");
    const model = process.env.AI_MODEL || DEFAULT_AI_MODEL;

    await log.success(200, "llm config fetched");
    return NextResponse.json({ baseUrl, model, apiKey: "***" });
  } catch {
    await log.error("config_error");
    return NextResponse.json({ error: "config_error" }, { status: 500 });
  }
}

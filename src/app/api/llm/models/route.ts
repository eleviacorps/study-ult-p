import { NextResponse } from "next/server";
import { logRequest } from "@/lib/server-log";

export async function GET() {
  const log = logRequest("GET /api/llm/models", null);
  await log.success(200, "models check");
  return NextResponse.json({ enabled: true });
}

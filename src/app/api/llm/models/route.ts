import { NextResponse } from "next/server";

const DEFAULT_AI_MODEL = "deepseek-v4-flash-free";

export async function GET() {
  return NextResponse.json({ models: [process.env.AI_MODEL || DEFAULT_AI_MODEL] });
}

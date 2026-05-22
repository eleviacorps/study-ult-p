import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, model, messages } = body;

    const baseUrl = (provider || "http://localhost:1234").replace(/\/+$/, "");
    const modelName = model?.trim() || "local-model";

    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelName,
        messages,
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const choice = data.choices?.[0]?.message;
      const content = choice?.content || choice?.reasoning_content || "";
      return NextResponse.json({ content });
    }

    return NextResponse.json(
      { error: `LM Studio returned ${res.status}` },
      { status: 502 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to reach LM Studio" },
      { status: 502 }
    );
  }
}

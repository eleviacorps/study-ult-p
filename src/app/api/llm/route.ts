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
        max_tokens: -1,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const choice = data.choices?.[0]?.message;
      const content = choice?.content || "";
      const reasoning = choice?.reasoning_content || "";

      return NextResponse.json({
        content: content || reasoning,
        reasoning: content ? reasoning : "",
      });
    }

    const errorText = await res.text();
    return NextResponse.json(
      { error: `LM Studio returned ${res.status}: ${errorText.substring(0, 200)}` },
      { status: 502 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to reach LM Studio" },
      { status: 502 }
    );
  }
}

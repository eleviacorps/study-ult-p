import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, baseUrl, apiKey, model, messages } = body;

    if (!provider || !baseUrl) {
      return NextResponse.json({ error: "Missing provider or baseUrl" }, { status: 400 });
    }

    const cleanUrl = baseUrl.replace(/\/+$/, "");
    const modelName = model?.trim() || "default";

    if (provider === "openai" || provider === "lmstudio" || provider === "custom") {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

      const res = await fetch(`${cleanUrl}/v1/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: modelName,
          messages,
          temperature: 0.3,
          max_tokens: provider === "openai" ? 4096 : -1,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const choice = data.choices?.[0]?.message;
        return NextResponse.json({
          content: choice?.content || "",
          reasoning: choice?.reasoning_content || "",
        });
      }

      const errText = await res.text().catch(() => "");
      return NextResponse.json({ error: `API error ${res.status}: ${errText.substring(0, 300)}` }, { status: 502 });
    }

    if (provider === "anthropic") {
      const systemMsg = messages.find((m: any) => m.role === "system");
      const userMessages = messages.filter((m: any) => m.role !== "system");

      const res = await fetch(`${cleanUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: modelName || "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: systemMsg ? [{ type: "text", text: systemMsg.content }] : undefined,
          messages: userMessages.map((m: any) => ({ role: m.role, content: m.content })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.content?.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n") || "";
        return NextResponse.json({ content: text, reasoning: "" });
      }

      const errText = await res.text().catch(() => "");
      return NextResponse.json({ error: `Anthropic error ${res.status}: ${errText.substring(0, 300)}` }, { status: 502 });
    }

    if (provider === "ollama") {
      const ollamaMessages = messages.map((m: any) => ({ role: m.role, content: m.content }));

      const res = await fetch(`${cleanUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelName,
          messages: ollamaMessages,
          stream: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          content: data.message?.content || "",
          reasoning: "",
        });
      }

      const errText = await res.text().catch(() => "");
      return NextResponse.json({ error: `Ollama error ${res.status}: ${errText.substring(0, 300)}` }, { status: 502 });
    }

    return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to reach AI provider" }, { status: 502 });
  }
}

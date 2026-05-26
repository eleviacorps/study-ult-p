import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { provider, baseUrl, apiKey, model, messages, max_tokens } = body;
    if (!provider || !baseUrl) {
      return NextResponse.json({ error: "Missing provider or baseUrl" }, { status: 400 });
    }

    const bUrl = baseUrl.replace(/\/+$/, "");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const requestBody: Record<string, unknown> = {
      model: model || "gpt-4o-mini",
      messages: messages && messages.length > 0 ? messages : [{ role: "user", content: "Hello" }],
      max_tokens: max_tokens || 65536,
    };
    if (body.tools) requestBody.tools = body.tools;
    if (body.tool_choice) requestBody.tool_choice = body.tool_choice;

    let url: string;
    switch (provider) {
      case "openai":
      case "lmstudio":
      case "custom": {
        url = `${bUrl}/v1/chat/completions`;
        if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
        break;
      }
      case "anthropic": {
        url = `${bUrl}/v1/messages`;
        headers["x-api-key"] = apiKey;
        headers["anthropic-version"] = "2023-06-01";
        const systemMsg = (messages || []).find((m: any) => m.role === "system");
        const userMsgs = (messages || []).filter((m: any) => m.role !== "system");
        requestBody.system = systemMsg?.content || "";
        requestBody.messages = userMsgs.length > 0 ? userMsgs : [{ role: "user", content: "Hello" }];
        break;
      }
      case "ollama": {
        url = `${bUrl}/api/chat`;
        const ollamaMsgs = (messages || []).map((m: any) => ({
          role: m.role === "system" ? "user" : m.role,
          content: m.content,
        }));
        requestBody.messages = ollamaMsgs;
        requestBody.stream = false;
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }

    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(requestBody) });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}

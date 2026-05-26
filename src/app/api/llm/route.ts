import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { provider, baseUrl, apiKey, model, messages, max_tokens } = body;

  try {
    let url: string;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const requestBody: Record<string, unknown> = { model, messages, max_tokens: max_tokens || 32768 };

    switch (provider) {
      case "openai":
      case "lmstudio":
      case "custom": {
        url = `${baseUrl.replace(/\/+$/, "")}/v1/chat/completions`;
        if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
        break;
      }
      case "anthropic": {
        url = `${baseUrl.replace(/\/+$/, "")}/v1/messages`;
        headers["x-api-key"] = apiKey;
        headers["anthropic-version"] = "2023-06-01";
        const systemMsg = messages.find((m: any) => m.role === "system");
        const userMsgs = messages.filter((m: any) => m.role !== "system");
        requestBody.system = systemMsg?.content || "";
        requestBody.messages = userMsgs.length > 0 ? userMsgs : [{ role: "user", content: "Hello" }];
        break;
      }
      case "ollama": {
        url = `${baseUrl.replace(/\/+$/, "")}/api/chat`;
        const ollamaMsgs = messages.map((m: any) => ({ role: m.role === "system" ? "user" : m.role, content: m.content }));
        requestBody.messages = ollamaMsgs;
        requestBody.stream = false;
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }

    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(requestBody) });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

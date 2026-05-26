import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");
  const baseUrl = searchParams.get("baseUrl");
  const apiKey = searchParams.get("apiKey");

  if (!provider || !baseUrl) {
    return NextResponse.json({ error: "Missing provider or baseUrl" }, { status: 400 });
  }

  const bUrl = baseUrl.replace(/\/+$/, "");

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    let url: string;
    if (provider === "ollama") {
      url = `${bUrl}/api/tags`;
    } else {
      url = `${bUrl}/v1/models`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) return NextResponse.json({ models: [] });

    const data = await res.json();
    const models =
      provider === "ollama"
        ? (data.models || data.tags || []).map((m: any) => m.name)
        : (data.data || []).map((m: any) => m.id || m.name);

    return NextResponse.json({ models });
  } catch {
    return NextResponse.json({ models: [] });
  }
}

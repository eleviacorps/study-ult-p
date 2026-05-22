import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { provider } = await request.json();
    const baseUrl = (provider || "http://localhost:1234").replace(/\/+$/, "");

    const res = await fetch(`${baseUrl}/v1/models`);

    if (res.ok) {
      const data = await res.json();
      const models = data.data?.map((m: any) => m.id) || [];
      return NextResponse.json({ models });
    }

    return NextResponse.json({ models: [] }, { status: 502 });
  } catch {
    return NextResponse.json({ models: [] }, { status: 502 });
  }
}

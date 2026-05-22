import { NextResponse } from "next/server";
import { scanContent, getContentFile, initializeContentDirs } from "@/lib/content-db";

export async function GET() {
  try {
    initializeContentDirs();
    const index = scanContent();
    return NextResponse.json(index);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { filePath } = await request.json();
    if (!filePath) {
      return NextResponse.json({ error: "filePath required" }, { status: 400 });
    }
    const content = getContentFile(filePath);
    if (content === null) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    return NextResponse.json({ content, filePath });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

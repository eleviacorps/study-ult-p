import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 501 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const { data, error } = await supabase
      .from("md_bank")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json(data);
  }

  const subject = searchParams.get("subject");
  const chapter = searchParams.get("chapter");
  const q = searchParams.get("q");

  let query = supabase
    .from("md_bank")
    .select("id, title, subject, chapter, tags, filename, description, created_at, created_by")
    .order("created_at", { ascending: false });

  if (subject) query = query.eq("subject", subject);
  if (chapter) query = query.eq("chapter", chapter);
  if (q) query = query.or(`title.ilike.%${q}%,subject.ilike.%${q}%,chapter.ilike.%${q}%,description.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 501 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "forbidden_admin_only" }, { status: 403 });
  }

  const body = await request.json();
  const { title, subject, chapter, tags, content, filename, description } = body;

  if (!title || !content || !filename) {
    return NextResponse.json(
      { error: "title, content, and filename are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("md_bank")
    .upsert({
      title,
      subject: subject || "",
      chapter: chapter || "",
      tags: tags || [],
      content,
      filename,
      description: description || "",
      created_by: user.id,
    }, { onConflict: "filename", ignoreDuplicates: false })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 501 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "forbidden_admin_only" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "id parameter required" }, { status: 400 });

  const { error } = await supabase.from("md_bank").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

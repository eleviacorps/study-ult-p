import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logRequest } from "@/lib/server-log";

/**
 * ROC2 Backup Status Endpoint
 *
 * POST /api/roc2/backup — record a backup event
 * GET  /api/roc2/backup — fetch latest backup status
 *
 * Used by cron jobs, Vercel Cron Jobs, or manual backup scripts to
 * report backup completion. The ROC2 dashboard reads this for the
 * "Last Backup" stat card.
 */

export async function POST(request: Request) {
  const log = logRequest("POST /api/roc2/backup", null);

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: "supabase_not_configured" }, { status: 501 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    log.setMeta("userId", user.id);

    const body = await request.json().catch(() => ({}));
    const backupType = String(body.type || "manual").slice(0, 50);
    const status = String(body.status || "completed").slice(0, 50);
    const sizeBytes = typeof body.sizeBytes === "number" ? body.sizeBytes : 0;
    const durationMs = typeof body.durationMs === "number" ? body.durationMs : 0;
    const message = String(body.message || "").slice(0, 500);
    const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : {};

    const { data, error } = await supabase
      .from("backup_logs")
      .insert({
        user_id: user.id,
        type: backupType,
        status,
        size_bytes: sizeBytes,
        duration_ms: durationMs,
        message,
        metadata,
      })
      .select("id,created_at")
      .single();

    if (error) {
      // fallback: table may not exist yet — log to server_logs instead
      log.setMeta("fallbackTable", true);
      await supabase.from("server_logs").insert({
        route: "BACKUP",
        user_id: user.id,
        method: "POST",
        level: "info",
        status_code: 201,
        duration_ms: durationMs,
        message: `Backup recorded (fallback): ${backupType}/${status} — ${message}`,
        metadata: { backupType, status, sizeBytes, ...metadata },
      });
    }

    log.setMeta("backupType", backupType);
    log.setMeta("backupStatus", status);
    await log.success(201, `backup recorded: ${backupType}/${status}`);

    return NextResponse.json({
      recorded: true,
      id: data?.id,
      createdAt: data?.created_at,
    });
  } catch (err) {
    await log.error("backup_record_failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown_error" },
      { status: 500 }
    );
  }
}

/** GET /api/roc2/backup — returns latest backup info */
export async function GET(request: Request) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ latestBackup: null });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ latestBackup: null });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // optional filter: database, file, manual

    // Fetch the most recent backup log
    let query = supabase
      .from("backup_logs")
      .select("id,type,status,size_bytes,duration_ms,message,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (type) query = query.eq("type", type);

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      return NextResponse.json({ latestBackup: null });
    }

    return NextResponse.json({
      latestBackup: {
        id: data.id,
        type: data.type,
        status: data.status,
        sizeBytes: data.size_bytes,
        durationMs: data.duration_ms,
        message: data.message,
        createdAt: data.created_at,
      },
    });
  } catch {
    return NextResponse.json({ latestBackup: null });
  }
}

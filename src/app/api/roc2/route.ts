import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRoc2Dashboard, logRequest } from "@/lib/server-log";

/**
 * ROC2 — Record of Operations & Compliance
 *
 * Returns a production observability dashboard showing:
 * - Recent server logs with timing
 * - Error/warning counts (24h)
 * - Average response duration
 * - Route hit counts
 * - Active alerts
 * - Backup status
 *
 * GET /api/roc2 — returns the full dashboard
 * GET /api/roc2?user=me — scoped to current user
 * GET /api/roc2?level=error — filter by severity
 */

export async function GET(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 501 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const log = logRequest("GET /api/roc2", user.id);

  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("user") === "me" ? user.id : undefined;
    const levelFilter = searchParams.get("level");
    const since = searchParams.get("since"); // ISO date for custom range

    const dashboard = await getRoc2Dashboard(scope);

    // Apply level filter if specified
    if (levelFilter && dashboard.recentLogs.length > 0) {
      dashboard.recentLogs = dashboard.recentLogs.filter((e) => e.level === levelFilter);
    }

    // Fetch backup status from study_state_snapshots freshness
    const { data: latestSnapshot } = await supabase
      .from("study_state_snapshots")
      .select("updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    dashboard.lastBackupAt = latestSnapshot?.updated_at || null;

    await log.success(200, "ROC2 dashboard generated");
    return NextResponse.json(dashboard);
  } catch (err) {
    await log.error("roc2_failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "unknown_error" }, { status: 500 });
  }
}

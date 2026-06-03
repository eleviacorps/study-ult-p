/**
 * Server-side logging utility for ROC2 (Record of Operations & Compliance).
 *
 * Logs every API request lifecycle to the `server_logs` Supabase table for:
 * - Production monitoring & debugging
 * - Backup status tracking
 * - Alert generation
 * - Performance auditing
 *
 * Usage:
 *   import { logRequest } from "@/lib/server-log";
 *
 *   const log = logRequest("POST /api/sync", user.id);
 *   try {
 *     // ... handle request ...
 *     log.success({ synced: true });
 *   } catch (err) {
 *     log.error("sync_failed", err);
 *   }
 */

import { createClient } from "@/lib/supabase/server";

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  id?: string;
  route: string;
  user_id: string | null;
  method: string;
  level: LogLevel;
  status_code: number;
  duration_ms: number;
  message: string;
  error_message?: string | null;
  error_stack?: string | null;
  metadata: Record<string, unknown>;
  created_at?: string;
}

// ─── Lifecycle tracker ─────────────────────────────────────────────

export class RequestLogger {
  private start: number;
  private route: string;
  private userId: string | null;
  private method: string;
  private metadata: Record<string, unknown> = {};
  private hasFlushed = false;

  constructor(route: string, userId: string | null, method: string = "") {
    this.start = Date.now();
    this.route = route;
    this.userId = userId;
    this.method = method || route.split(" ")[0] || "GET";
  }

  /** Add arbitrary metadata to the log entry */
  setMeta(key: string, value: unknown): this {
    this.metadata[key] = value;
    return this;
  }

  /** Log and flush on success */
  async success(statusCode = 200, message?: string): Promise<void> {
    if (this.hasFlushed) return;
    this.hasFlushed = true;
    await this.flush("info", statusCode, message || `${this.route} OK`);
  }

  /** Log and flush on warning */
  async warn(statusCode: number, message: string): Promise<void> {
    if (this.hasFlushed) return;
    this.hasFlushed = true;
    await this.flush("warn", statusCode, message);
  }

  /** Log and flush on error */
  async error(message: string, err?: unknown): Promise<void> {
    if (this.hasFlushed) return;
    this.hasFlushed = true;
    this.metadata.error = err instanceof Error
      ? { message: err.message, stack: err.stack?.split("\n").slice(0, 5).join("\n") }
      : { message: String(err) };
    await this.flush("error", 500, message);
  }

  /** Log a debug event mid-request (e.g. "auth check passed", "batch insert complete") */
  async debug(event: string, extra?: Record<string, unknown>): Promise<void> {
    const entry: LogEntry = {
      route: this.route,
      user_id: this.userId,
      method: this.method,
      level: "debug",
      status_code: 0,
      duration_ms: Date.now() - this.start,
      message: event,
      metadata: { ...this.metadata, ...extra },
    };
    await insertLogEntry(entry);
  }

  private async flush(level: LogLevel, statusCode: number, message: string): Promise<void> {
    const entry: LogEntry = {
      route: this.route,
      user_id: this.userId,
      method: this.method,
      level,
      status_code: statusCode,
      duration_ms: Date.now() - this.start,
      message,
      error_message: level === "error" ? message : null,
      metadata: this.metadata,
    };
    await insertLogEntry(entry);
  }
}

/** Create a RequestLogger for a route handler */
export function logRequest(route: string, userId: string | null, method?: string): RequestLogger {
  return new RequestLogger(route, userId, method);
}

// ─── Database writer (fire-and-forget, never throws) ────────────────

async function insertLogEntry(entry: LogEntry): Promise<void> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const supabase = createClient();
    await supabase.from("server_logs").insert({
      route: entry.route,
      user_id: entry.user_id,
      method: entry.method,
      level: entry.level,
      status_code: entry.status_code,
      duration_ms: entry.duration_ms,
      message: entry.message?.slice(0, 500),
      error_message: entry.error_message?.slice(0, 1000),
      metadata: entry.metadata,
    });
  } catch {
    // Logging must never crash the request — silently ignore write failures
  }
}

// ─── Batch log query for ROC2 dashboard ────────────────────────────

export interface Roc2Dashboard {
  recentLogs: LogEntry[];
  errorCount24h: number;
  warnCount24h: number;
  avgDurationMs24h: number;
  routesHit24h: number;
  lastBackupAt: string | null;
  activeAlerts: string[];
  totalRequests24h: number;
}

export async function getRoc2Dashboard(userId?: string): Promise<Roc2Dashboard> {
  const empty: Roc2Dashboard = {
    recentLogs: [],
    errorCount24h: 0,
    warnCount24h: 0,
    avgDurationMs24h: 0,
    routesHit24h: 0,
    lastBackupAt: null,
    activeAlerts: [],
    totalRequests24h: 0,
  };

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return empty;
    const supabase = createClient();
    const since = new Date(Date.now() - 86_400_000).toISOString();

    // Fetch recent logs
    let logQuery = supabase
      .from("server_logs")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(100);

    if (userId) logQuery = logQuery.eq("user_id", userId);

    const { data: logs } = await logQuery;
    if (!logs || !Array.isArray(logs)) return empty;

    const entries = logs as LogEntry[];
    const errors = entries.filter((e) => e.level === "error");
    const warnings = entries.filter((e) => e.level === "warn");
    const routes = new Set(entries.map((e) => e.route));
    const avgDuration = entries.length > 0
      ? Math.round(entries.reduce((s, e) => s + (e.duration_ms || 0), 0) / entries.length)
      : 0;

    // Detect active alerts (e.g., sustained errors)
    const activeAlerts: string[] = [];
    const errorRoutes = new Map<string, number>();
    for (const e of errors) {
      errorRoutes.set(e.route, (errorRoutes.get(e.route) || 0) + 1);
    }
    for (const [route, count] of errorRoutes) {
      if (count >= 5) {
        activeAlerts.push(`${count} errors on ${route} in last 24h`);
      }
    }
    if (entries.length === 0) {
      activeAlerts.push("No requests logged in last 24h — service may be down");
    }

    return {
      recentLogs: entries.slice(0, 50),
      errorCount24h: errors.length,
      warnCount24h: warnings.length,
      avgDurationMs24h: avgDuration,
      routesHit24h: routes.size,
      lastBackupAt: null, // Set externally via backup checker cron
      activeAlerts,
      totalRequests24h: entries.length,
    };
  } catch {
    return empty;
  }
}

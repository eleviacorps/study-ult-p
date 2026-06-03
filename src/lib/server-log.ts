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
    const duration = Date.now() - this.start;
    const entry: LogEntry = {
      route: this.route,
      user_id: this.userId,
      method: this.method,
      level,
      status_code: statusCode,
      duration_ms: duration,
      message,
      error_message: level === "error" ? message : null,
      metadata: this.metadata,
    };
    await insertLogEntry(entry);

    // ── Auto-alert on critical conditions ──────────────────────
    if (level === "error" || level === "warn") {
      const isCritical = level === "error" && (
        statusCode >= 500 ||
        message.includes("rate_limited") ||
        message.includes("auth_failed") ||
        message.includes("db_connection") ||
        message.includes("timeout") ||
        duration > 30_000 // 30s+ = likely a timeout
      );
      if (isCritical) {
        // Fire-and-forget: never let alerting slow down the response
        triggerAlert({
          level: "critical",
          title: `${this.route} — ${message}`,
          message: `Critical error on ${this.method} ${this.route}: ${message} (${duration}ms, status ${statusCode})`,
          route: this.route,
          errorMessage: message,
          durationMs: duration,
          metadata: this.metadata,
        }).catch(() => {});
      } else if (level === "error" || (level === "warn" && statusCode >= 429)) {
        // Non-critical errors / rate limits — alert with warning level
        triggerAlert({
          level: "warning",
          title: `${this.route} — ${message}`,
          message: `Warning on ${this.method} ${this.route}: ${message} (${duration}ms, status ${statusCode})`,
          route: this.route,
          errorMessage: message,
          durationMs: duration,
          metadata: this.metadata,
        }).catch(() => {});
      }
    }
  }
}

/** Create a RequestLogger for a route handler */
export function logRequest(route: string, userId: string | null, method?: string): RequestLogger {
  return new RequestLogger(route, userId, method);
}

// ─── Alert throttle (prevent alert storms) ──────────────────────────

const _alertThrottle = new Map<string, number>();
const ALERT_COOLDOWN_MS = 60_000; // 1 min between same-route alerts
const MAX_ALERTS_PER_MINUTE = 5;   // global cap
let _alertCountThisMinute = 0;
let _alertMinuteStart = Date.now();

async function triggerAlert(payload: {
  level: "critical" | "warning" | "info";
  title: string;
  message: string;
  route?: string;
  errorMessage?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    // Reset counter if minute has passed
    const now = Date.now();
    if (now - _alertMinuteStart > 60_000) {
      _alertCountThisMinute = 0;
      _alertMinuteStart = now;
    }

    // Global cap: max 5 alerts per minute
    if (_alertCountThisMinute >= MAX_ALERTS_PER_MINUTE) return;

    // Per-route throttle: don't alert same route more than once per minute
    if (payload.route) {
      const lastAlert = _alertThrottle.get(payload.route);
      if (lastAlert && now - lastAlert < ALERT_COOLDOWN_MS) return;
      _alertThrottle.set(payload.route, now);
    }

    _alertCountThisMinute++;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return; // No alert channel configured

    const alertEmail = process.env.ROC2_ALERT_EMAIL || "dev@studyult.app";
    const alertFrom = process.env.ROC2_ALERT_FROM || "ROC2 <roc2@studyult.app>";

    // Determine severity badge for subject
    const prefix = payload.level === "critical" ? "\u{1F6A8} CRITICAL"
      : payload.level === "warning" ? "\u26A0\uFE0F WARNING"
      : "\u2139\uFE0F INFO";

    const subject = `${prefix}: ${payload.title}`;

    // Build HTML email
    const color = payload.level === "critical" ? "#EF4444"
      : payload.level === "warning" ? "#F59E0B"
      : "#3B82F6";
    const badgeColor = payload.level === "critical" ? "#DC2626"
      : payload.level === "warning" ? "#D97706"
      : "#2563EB";

    const rows: string[] = [];
    if (payload.route) {
      rows.push(`<tr><td style="padding:8px 16px;color:#94A3B8;font-size:13px;border-bottom:1px solid #1E293B;">Route</td><td style="padding:8px 16px;color:#F8FAFC;font-size:13px;border-bottom:1px solid #1E293B;font-family:monospace;">${escHtml(payload.route)}</td></tr>`);
    }
    if (payload.errorMessage) {
      rows.push(`<tr><td style="padding:8px 16px;color:#94A3B8;font-size:13px;border-bottom:1px solid #1E293B;">Error</td><td style="padding:8px 16px;color:#FCA5A5;font-size:13px;border-bottom:1px solid #1E293B;font-family:monospace;">${escHtml(payload.errorMessage)}</td></tr>`);
    }
    if (payload.durationMs !== undefined) {
      rows.push(`<tr><td style="padding:8px 16px;color:#94A3B8;font-size:13px;border-bottom:1px solid #1E293B;">Duration</td><td style="padding:8px 16px;color:#F8FAFC;font-size:13px;border-bottom:1px solid #1E293B;">${payload.durationMs}ms</td></tr>`);
    }
    if (payload.metadata) {
      for (const [key, value] of Object.entries(payload.metadata)) {
        if (key === "userId" && value) {
          rows.push(`<tr><td style="padding:8px 16px;color:#94A3B8;font-size:13px;border-bottom:1px solid #1E293B;">User ID</td><td style="padding:8px 16px;color:#F8FAFC;font-size:13px;border-bottom:1px solid #1E293B;font-family:monospace;">${escHtml(String(value))}</td></tr>`);
        }
      }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0F1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F1117;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#1A1D29;border-radius:16px;border:1px solid #1E293B;">
          <tr>
            <td style="padding:32px 32px 0 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display:inline-block;padding:4px 12px;border-radius:6px;background:${badgeColor}20;color:${badgeColor};font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">${payload.level}</span>
                  </td>
                  <td align="right" style="color:#475569;font-size:12px;">ROC2 Auto-Alert</td>
                </tr>
              </table>
              <h1 style="color:#F8FAFC;font-size:20px;font-weight:600;margin:16px 0 8px 0;">${escHtml(payload.title)}</h1>
              <p style="color:#94A3B8;font-size:14px;line-height:1.6;margin:0 0 24px 0;">${escHtml(payload.message)}</p>
            </td>
          </tr>
          ${rows.length > 0 ? `
          <tr>
            <td style="padding:0 32px 24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F1117;border-radius:12px;border:1px solid #1E293B;">
                ${rows.join("\n                ")}
              </table>
            </td>
          </tr>` : ""}
          <tr>
            <td align="center" style="padding:0 32px 32px 32px;">
              <a href="${siteUrl}/roc2"
                 style="display:inline-block;padding:10px 24px;background:#1856FF;color:#FFFFFF;text-decoration:none;border-radius:8px;font-size:13px;font-weight:500;">
                Open ROC2 Dashboard \u2192
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 32px 24px 32px;">
              <span style="color:#475569;font-size:11px;">This is an automated alert from StudyUlt ROC2 observability system.</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Call Resend API directly (server-to-server, no auth cookie issue)
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: alertFrom,
        to: [alertEmail],
        subject,
        html,
      }),
    });
  } catch {
    // Alerting must never crash the request
  }
}

function escHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

    // Fetch recent logs — specify exact columns (avoid JSONB metadata bloat)
    let logQuery = supabase
      .from("server_logs")
      .select("id, route, user_id, method, level, status_code, duration_ms, message, error_message, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(100);

    if (userId) logQuery = logQuery.eq("user_id", userId);

    const { data: logs } = await logQuery;
    if (!logs || !Array.isArray(logs)) return empty;

    // Validate shape of returned rows to catch schema drift early
    const entries: LogEntry[] = [];
    for (const row of logs) {
      if (row && typeof row === "object" && typeof (row as Record<string, unknown>).route === "string") {
        entries.push(row as LogEntry);
      }
    }
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

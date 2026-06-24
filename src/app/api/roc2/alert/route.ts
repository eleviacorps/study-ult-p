import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logRequest } from "@/lib/server-log";

/**
 * ROC2 Alert Endpoint
 *
 * POST /api/roc2/alert — manually trigger a test alert
 * GET  /api/roc2/alert — check if alert channel is configured
 *
 * Alerts are sent via Resend to the configured developer email.
 * Environment variables:
 *   RESEND_API_KEY       — Resend API key for sending emails
 *   ROC2_ALERT_EMAIL     — Developer email to receive alerts (default: dev@studyult.app)
 *   ROC2_ALERT_FROM      — From address (default: ROC2 <roc2@studyult.app>)
 */

const ALERT_EMAIL = process.env.ROC2_ALERT_EMAIL || "dev@studyult.app";
const ALERT_FROM = process.env.ROC2_ALERT_FROM || "ROC2 <roc2@studyult.app>";
const RESEND_API_KEY = process.env.RESEND_API_KEY;

interface AlertPayload {
  level: "critical" | "warning" | "info";
  title: string;
  message: string;
  route?: string;
  errorMessage?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export async function POST(request: Request) {
  const log = logRequest("POST /api/roc2/alert", null);

  try {
    // In production, auth is always required regardless of Supabase URL presence.
    // In development, skip auth check if Supabase URL is not configured.
    if (process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }

      // Check admin role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }

      log.setMeta("userId", user.id);
    }

    const payload: AlertPayload = await request.json();

    // Validate required fields
    if (!payload.title || !payload.message) {
      return NextResponse.json({ error: "title and message required" }, { status: 400 });
    }

    if (!RESEND_API_KEY) {
      log.setMeta("alertSkipped", "RESEND_API_KEY not configured");
      return NextResponse.json({
        status: "skipped",
        reason: "RESEND_API_KEY not configured — set this env var to enable email alerts",
      });
    }

    // Determine severity colour / urgency
    const subjectPrefix = payload.level === "critical" ? "🚨 CRITICAL" 
      : payload.level === "warning" ? "⚠️ WARNING" 
      : "ℹ️ INFO";

    const subject = `${subjectPrefix}: ${payload.title}`;

    // Build HTML email
    const html = buildAlertEmail(payload);

    // Send via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: ALERT_FROM,
        to: [ALERT_EMAIL],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "unknown");
      log.setMeta("resendStatus", res.status);
      log.setMeta("resendError", errBody.slice(0, 500));
      return NextResponse.json({
        status: "failed",
        error: `Resend API returned ${res.status}`,
        detail: errBody.slice(0, 500),
      }, { status: 502 });
    }

    const result = await res.json();
    await log.success(200, `Alert sent: ${payload.title}`);

    return NextResponse.json({
      status: "sent",
      id: result.id,
      to: ALERT_EMAIL,
      level: payload.level,
    });
  } catch (err) {
    await log.error("alert_request_failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown_error" },
      { status: 500 }
    );
  }
}

/** Health-check: returns whether alerting is configured (no sensitive data) */
export async function GET(request: Request) {
  // Only return boolean flags — no email addresses to avoid info disclosure
  return NextResponse.json({
    configured: !!RESEND_API_KEY,
    channels: RESEND_API_KEY ? ["email"] : [],
  });
}

// ─── HTML email builder ──────────────────────────────────────────

function buildAlertEmail(payload: AlertPayload): string {
  const color = payload.level === "critical" ? "#EF4444"
    : payload.level === "warning" ? "#F59E0B"
    : "#3B82F6";

  const badgeColor = payload.level === "critical" ? "#DC2626"
    : payload.level === "warning" ? "#D97706"
    : "#2563EB";

  const rows: string[] = [];

  if (payload.route) {
    rows.push(`<tr><td style="padding:8px 16px;color:#94A3B8;font-size:13px;border-bottom:1px solid #1E293B;">Route</td><td style="padding:8px 16px;color:#F8FAFC;font-size:13px;border-bottom:1px solid #1E293B;font-family:monospace;">${escapeHtml(payload.route)}</td></tr>`);
  }
  if (payload.errorMessage) {
    rows.push(`<tr><td style="padding:8px 16px;color:#94A3B8;font-size:13px;border-bottom:1px solid #1E293B;">Error</td><td style="padding:8px 16px;color:#FCA5A5;font-size:13px;border-bottom:1px solid #1E293B;font-family:monospace;">${escapeHtml(payload.errorMessage)}</td></tr>`);
  }
  if (payload.durationMs !== undefined) {
    rows.push(`<tr><td style="padding:8px 16px;color:#94A3B8;font-size:13px;border-bottom:1px solid #1E293B;">Duration</td><td style="padding:8px 16px;color:#F8FAFC;font-size:13px;border-bottom:1px solid #1E293B;">${payload.durationMs}ms</td></tr>`);
  }
  if (payload.metadata) {
    for (const [key, value] of Object.entries(payload.metadata)) {
      rows.push(`<tr><td style="padding:8px 16px;color:#94A3B8;font-size:13px;border-bottom:1px solid #1E293B;">${escapeHtml(key)}</td><td style="padding:8px 16px;color:#F8FAFC;font-size:13px;border-bottom:1px solid #1E293B;font-family:monospace;">${escapeHtml(String(value))}</td></tr>`);
    }
  }

  return `<!DOCTYPE html>
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
                  <td align="right" style="color:#475569;font-size:12px;">ROC2 Alert</td>
                </tr>
              </table>
              <h1 style="color:#F8FAFC;font-size:20px;font-weight:600;margin:16px 0 8px 0;">${escapeHtml(payload.title)}</h1>
              <p style="color:#94A3B8;font-size:14px;line-height:1.6;margin:0 0 24px 0;">${escapeHtml(payload.message)}</p>
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
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/roc2" 
                 style="display:inline-block;padding:10px 24px;background:#1856FF;color:#FFFFFF;text-decoration:none;border-radius:8px;font-size:13px;font-weight:500;">
                Open ROC2 Dashboard →
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
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, AlertTriangle, CheckCircle2, Clock, Route, Server, 
  ShieldAlert, BarChart3, Filter, RefreshCw, ChevronDown, Download,
  Mail, Bell, BellRing, ArrowUpRight, XCircle, Info, Database,
  Loader2, Eye, EyeOff, Trash2, Search,
} from "lucide-react";
import { cn } from "@/lib/cn";

// ─── Types ──────────────────────────────────────────────────────

interface LogEntry {
  id: number;
  route: string;
  user_id: string | null;
  method: string;
  level: "info" | "warn" | "error" | "debug";
  status_code: number;
  duration_ms: number;
  message: string;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface Roc2Dashboard {
  recentLogs: LogEntry[];
  errorCount24h: number;
  warnCount24h: number;
  avgDurationMs24h: number;
  routesHit24h: number;
  lastBackupAt: string | null;
  activeAlerts: string[];
  totalRequests24h: number;
}

type LevelFilter = "all" | "error" | "warn" | "info" | "debug";
type SortField = "created_at" | "duration_ms" | "status_code";

// ─── Component ─────────────────────────────────────────────────

export default function Roc2Page() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<Roc2Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [alertConfig, setAlertConfig] = useState<{ configured: boolean; alertEmail: string } | null>(null);

  // ── Fetch dashboard data ────────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/roc2");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.status === 403) {
        setError("Access denied. Admin role required.");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError(`API error: ${res.status}`);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setDashboard(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchAlertConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/roc2/alert");
      if (res.ok) {
        const data = await res.json();
        setAlertConfig(data);
      }
    } catch {
      // Silently fail — alert config is non-critical
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchAlertConfig();
  }, [fetchDashboard, fetchAlertConfig]);

  // Auto-refresh every 15s
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchDashboard, 15_000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchDashboard]);

  // ── Derived data ─────────────────────────────────────────────

  const filteredLogs = (dashboard?.recentLogs || []).filter((log) => {
    if (levelFilter !== "all" && log.level !== levelFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.route.toLowerCase().includes(q) ||
        log.message?.toLowerCase().includes(q) ||
        log.error_message?.toLowerCase().includes(q)
      );
    }
    return true;
  }).sort((a, b) => {
    const dir = sortAsc ? 1 : -1;
    if (sortField === "created_at") {
      return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    return dir * ((a[sortField] as number) - (b[sortField] as number));
  });

  // ── Loading / Error states ───────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#1856FF] animate-spin" />
          <p className="text-sm text-[var(--text-primary)]/40">Loading ROC2 dashboard...</p>
        </div>
      </div>
    );
  }

  if (error === "Access denied. Admin role required.") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass max-w-md w-full p-8 text-center">
          <ShieldAlert className="w-12 h-12 text-[#EF4444] mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Access Denied</h2>
          <p className="text-sm text-[var(--text-primary)]/40 mb-6">
            You need an admin account to access the ROC2 observability dashboard.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-[#1856FF] text-white rounded-xl text-sm font-medium hover:bg-[#1856FF]/80 transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass max-w-md w-full p-8 text-center">
          <XCircle className="w-12 h-12 text-[#EF4444] mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Failed to Load</h2>
          <p className="text-sm text-[var(--text-primary)]/40 mb-6">{error}</p>
          <button
            onClick={fetchDashboard}
            className="px-4 py-2 bg-[#1856FF] text-white rounded-xl text-sm font-medium hover:bg-[#1856FF]/80 transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Main dashboard ───────────────────────────────────────────

  const levelBadge = (level: string) => {
    switch (level) {
      case "error":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EF4444]/15 text-[#EF4444]">ERROR</span>;
      case "warn":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F59E0B]/15 text-[#F59E0B]">WARN</span>;
      case "info":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#1856FF]/15 text-[#1856FF]">INFO</span>;
      case "debug":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#6366F1]/15 text-[#6366F1]">DEBUG</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#475569]/15 text-[#475569]">{level}</span>;
    }
  };

  const statusDot = (code: number) => {
    if (code >= 500) return "bg-[#EF4444]";
    if (code >= 400) return "bg-[#F59E0B]";
    if (code >= 300) return "bg-[#6366F1]";
    return "bg-[#10B981]";
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 mx-2 sm:mx-4 mt-2 rounded-2xl bg-[var(--glass-panel)] backdrop-blur-xl border border-[var(--glass-border-strong)] shadow-[0_0_30px_rgba(24,86,255,0.04)]">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1856FF] to-[#6366F1] flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-[var(--text-primary)]">ROC2</h1>
              <p className="text-[10px] text-[var(--text-primary)]/30">Record of Operations & Compliance</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Alert channel status */}
            {alertConfig && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--glass-light)]">
                {alertConfig.configured ? (
                  <>
                    <BellRing className="w-3 h-3 text-[#10B981]" />
                    <span className="text-[10px] text-[#10B981] font-medium">Email alerts active</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-3 h-3 text-[#F59E0B]" />
                    <span className="text-[10px] text-[#F59E0B] font-medium">Alerts not configured</span>
                  </>
                )}
              </div>
            )}

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(
                "p-2 rounded-xl transition-all",
                autoRefresh
                  ? "bg-[#1856FF]/15 text-[#1856FF]"
                  : "text-[var(--text-primary)]/40 hover:bg-[var(--glass-light)]"
              )}
              title={autoRefresh ? "Auto-refresh on" : "Auto-refresh off"}
            >
              <RefreshCw className={cn("w-4 h-4", autoRefresh && "animate-spin [animation-duration:3s]")} />
            </button>
            <button
              onClick={fetchDashboard}
              className="p-2 rounded-xl text-[var(--text-primary)]/40 hover:bg-[var(--glass-light)] transition-all"
              title="Refresh now"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
        {/* ── Stats Cards ────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            icon={Server}
            label="Total Requests"
            value={dashboard?.totalRequests24h.toLocaleString() || "0"}
            sub="last 24h"
            color="from-[#1856FF] to-[#6366F1]"
          />
          <StatCard
            icon={XCircle}
            label="Errors"
            value={dashboard?.errorCount24h.toLocaleString() || "0"}
            sub="last 24h"
            color={dashboard?.errorCount24h && dashboard.errorCount24h > 0 ? "from-[#EF4444] to-[#DC2626]" : "from-[#475569] to-[#64748B]"}
            accent={dashboard?.errorCount24h && dashboard.errorCount24h > 0 ? "text-[#EF4444]" : undefined}
          />
          <StatCard
            icon={AlertTriangle}
            label="Warnings"
            value={dashboard?.warnCount24h.toLocaleString() || "0"}
            sub="last 24h"
            color={dashboard?.warnCount24h && dashboard.warnCount24h > 0 ? "from-[#F59E0B] to-[#D97706]" : "from-[#475569] to-[#64748B]"}
          />
          <StatCard
            icon={Clock}
            label="Avg Duration"
            value={formatDuration(dashboard?.avgDurationMs24h || 0)}
            sub="last 24h"
            color="from-[#10B981] to-[#059669]"
          />
          <StatCard
            icon={Route}
            label="Routes Hit"
            value={dashboard?.routesHit24h.toLocaleString() || "0"}
            sub="unique routes"
            color="from-[#8B5CF6] to-[#7C3AED]"
          />
          <StatCard
            icon={Database}
            label="Last Backup"
            value={dashboard?.lastBackupAt
              ? new Date(dashboard.lastBackupAt).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit" })
              : "Never"}
            sub={dashboard?.lastBackupAt
              ? new Date(dashboard.lastBackupAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
              : "no backup found"}
            color="from-[#06B6D4] to-[#0891B2]"
          />
        </div>

        {/* ── Active Alerts ──────────────────────────────────── */}
        {dashboard?.activeAlerts && dashboard.activeAlerts.length > 0 && (
          <div className="glass p-4 sm:p-5 border-[#EF4444]/20">
            <div className="flex items-center gap-2 mb-3">
              <BellRing className="w-4 h-4 text-[#EF4444]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Active Alerts ({dashboard.activeAlerts.length})
              </h2>
            </div>
            <div className="space-y-2">
              {dashboard.activeAlerts.map((alert, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "flex items-start gap-3 px-3 py-2.5 rounded-xl text-sm",
                    alert.includes("service may be down")
                      ? "bg-[#EF4444]/10 border border-[#EF4444]/20"
                      : "bg-[#F59E0B]/10 border border-[#F59E0B]/20"
                  )}
                >
                  {alert.includes("service may be down") ? (
                    <XCircle className="w-4 h-4 text-[#EF4444] mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-[#F59E0B] mt-0.5 shrink-0" />
                  )}
                  <span className="text-[var(--text-primary)]/80">{alert}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ── Logs Table ─────────────────────────────────────── */}
        <div className="glass p-4 sm:p-5">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#1856FF]" />
              Request Logs
              <span className="text-[10px] font-normal text-[var(--text-primary)]/30">
                ({filteredLogs.length} of {dashboard?.recentLogs.length || 0})
              </span>
            </h2>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-primary)]/20" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-36 sm:w-48 pl-8 pr-3 py-1.5 rounded-lg bg-[var(--glass-light)] border border-[var(--glass-border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/20 focus:outline-none focus:border-[#1856FF]/40 transition-all"
                />
              </div>

              {/* Level filter */}
              <div className="flex gap-1">
                {(["all", "error", "warn", "info", "debug"] as LevelFilter[]).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setLevelFilter(lvl)}
                    className={cn(
                      "px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all capitalize",
                      levelFilter === lvl
                        ? "bg-[#1856FF]/15 text-[#1856FF]"
                        : "text-[var(--text-primary)]/30 hover:text-[var(--text-primary)]/60 hover:bg-[var(--glass-light)]"
                    )}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              {/* Sort toggle */}
              <button
                onClick={() => setSortField(sortField === "created_at" ? "duration_ms" : "created_at")}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium text-[var(--text-primary)]/30 hover:text-[var(--text-primary)]/60 hover:bg-[var(--glass-light)] transition-all"
              >
                <Filter className="w-3 h-3" />
                {sortField === "created_at" ? "Time" : "Duration"}
                <button
                  onClick={(e) => { e.stopPropagation(); setSortAsc(!sortAsc); }}
                  className="ml-0.5"
                >
                  <ChevronDown className={cn("w-3 h-3 transition-transform", sortAsc && "rotate-180")} />
                </button>
              </button>
            </div>
          </div>

          {/* Table */}
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-8 h-8 text-[#10B981] mx-auto mb-3" />
              <p className="text-sm text-[var(--text-primary)]/40">No logs match your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:-mx-5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--glass-border)]">
                    <th className="text-left px-4 py-2.5 text-[10px] font-medium text-[var(--text-primary)]/30 uppercase tracking-wider">Level</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-medium text-[var(--text-primary)]/30 uppercase tracking-wider">Route</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-medium text-[var(--text-primary)]/30 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-medium text-[var(--text-primary)]/30 uppercase tracking-wider">Duration</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-medium text-[var(--text-primary)]/30 uppercase tracking-wider hidden sm:table-cell">Message</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-medium text-[var(--text-primary)]/30 uppercase tracking-wider hidden md:table-cell">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.slice(0, 100).map((log, i) => (
                    <motion.tr
                      key={log.id || i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.008 }}
                      className={cn(
                        "border-b border-[var(--glass-border)]/50 hover:bg-[var(--glass-light)] transition-all cursor-pointer",
                        log.level === "error" && "bg-[#EF4444]/[0.02]"
                      )}
                      onClick={() => {/* Could expand details */}}
                    >
                      <td className="px-4 py-3">{levelBadge(log.level)}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] text-[var(--text-primary)]/70 whitespace-nowrap">
                          {log.method} {log.route}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusDot(log.status_code))} />
                          <span className={cn(
                            "font-mono text-[11px]",
                            log.status_code >= 500 ? "text-[#EF4444]" :
                            log.status_code >= 400 ? "text-[#F59E0B]" :
                            "text-[var(--text-primary)]/50"
                          )}>
                            {log.status_code || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] text-[var(--text-primary)]/50">
                          {formatDuration(log.duration_ms)}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell max-w-[300px]">
                        <p className="text-[var(--text-primary)]/50 truncate">
                          {log.error_message || log.message || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className="text-[10px] text-[var(--text-primary)]/30 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Alert Configuration ────────────────────────────── */}
        <div className="glass p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-4">
            <Mail className="w-4 h-4 text-[#F59E0B]" />
            Alert Configuration
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[var(--glass-light)] rounded-xl p-4">
              <p className="text-[10px] font-medium text-[var(--text-primary)]/30 uppercase tracking-wider mb-2">Email Channel</p>
              <div className="flex items-center gap-2 mb-2">
                {alertConfig?.configured ? (
                  <span className="flex items-center gap-1.5 text-xs text-[#10B981]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Resend configured — alerts active
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-[#F59E0B]">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Resend not configured
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-primary)]/30">
                Alerts sent to: <span className="font-mono text-[var(--text-primary)]/50">{alertConfig?.alertEmail || "Not set"}</span>
              </p>
              {!alertConfig?.configured && (
                <p className="text-[11px] text-[var(--text-primary)]/30 mt-2">
                  Set <code className="text-[#1856FF]">RESEND_API_KEY</code> and{' '}
                  <code className="text-[#1856FF]">ROC2_ALERT_EMAIL</code> in your environment variables.
                </p>
              )}
            </div>

            <div className="bg-[var(--glass-light)] rounded-xl p-4">
              <p className="text-[10px] font-medium text-[var(--text-primary)]/30 uppercase tracking-wider mb-2">Test Alert</p>
              <p className="text-[11px] text-[var(--text-primary)]/40 mb-3">Send a test alert to verify the email channel is working.</p>
              <button
                onClick={async () => {
                  const res = await fetch("/api/roc2/alert", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      level: "info",
                      title: "ROC2 Test Alert",
                      message: "This is a test alert from the ROC2 dashboard. If you received this, the alert channel is working correctly.",
                      route: "GET /api/roc2/alert (test)",
                      metadata: { source: "roc2-dashboard", test: true },
                    }),
                  });
                  if (res.ok) {
                    const data = await res.json();
                    alert(`Test alert sent! Status: ${data.status}${data.id ? ` (ID: ${data.id})` : ""}`);
                  } else {
                    const err = await res.json();
                    alert(`Failed: ${err.error || "Unknown error"}`);
                  }
                }}
                disabled={!alertConfig?.configured}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-medium transition-all",
                  alertConfig?.configured
                    ? "bg-[#1856FF] text-white hover:bg-[#1856FF]/80"
                    : "bg-[var(--glass-light)] text-[var(--text-primary)]/20 cursor-not-allowed"
                )}
              >
                Send Test Alert
              </button>
            </div>
          </div>
        </div>

        {/* ── Quick Reference ────────────────────────────────── */}
        <div className="glass p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-[#6366F1]" />
            Environment Variables
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--glass-border)]">
                  <th className="text-left px-3 py-2 text-[10px] font-medium text-[var(--text-primary)]/30 uppercase tracking-wider">Variable</th>
                  <th className="text-left px-3 py-2 text-[10px] font-medium text-[var(--text-primary)]/30 uppercase tracking-wider">Required</th>
                  <th className="text-left px-3 py-2 text-[10px] font-medium text-[var(--text-primary)]/30 uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["RESEND_API_KEY", "For alerts", "Resend API key for email alerts"],
                  ["ROC2_ALERT_EMAIL", "For alerts", "Developer email to receive alerts"],
                  ["ROC2_ALERT_FROM", "Optional", "Sender email (default: roc2@studyult.app)"],
                ].map(([varName, required, desc], i) => (
                  <tr key={i} className="border-b border-[var(--glass-border)]/50">
                    <td className="px-3 py-2.5 font-mono text-[11px] text-[#1856FF]">{varName}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-medium",
                        required === "For alerts" ? "bg-[#F59E0B]/15 text-[#F59E0B]" : "bg-[#475569]/15 text-[#475569]"
                      )}>
                        {required}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[var(--text-primary)]/50">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card Sub-Component ────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  color: string;
  accent?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-4 hover:bg-[var(--glass-medium)] transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <div className={cn("w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center", color)}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className={cn("text-lg font-semibold text-[var(--text-primary)]", accent)}>{value}</p>
      <p className="text-[10px] text-[var(--text-primary)]/30 mt-0.5">
        {label}
        <span className="ml-1.5">· {sub}</span>
      </p>
    </motion.div>
  );
}

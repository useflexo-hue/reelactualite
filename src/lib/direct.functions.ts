import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validateDateRange } from "@/lib/direct-range";
import {
  DIRECT_STALE_CRITICAL_MINUTES,
  DIRECT_STALE_WARN_MINUTES,
  minutesSince,
  severityFor,
  type DirectSeverity,
} from "@/lib/direct-monitor";

export type DirectEventRow = {
  id: string;
  kind: string;
  severity: string;
  reason: string | null;
  age_minutes: number | null;
  breaking_count: number | null;
  ticker_items: number | null;
  duration_ms: number | null;
  db_error: string | null;
  path: string | null;
  created_at: string;
};

export type DirectDashboard = {
  checked_at: string;
  range_days: number;
  range_start: string;
  range_end: string;
  range_custom: boolean;
  status: DirectSeverity;
  newest_published_at: string | null;
  newest_title: string | null;
  age_minutes: number | null;
  breaking_count: number;
  ticker_items: number;
  db_error: string | null;
  query_ms: number;
  thresholds: { warn_minutes: number; critical_minutes: number };
  counters: {
    alerts_24h: number;
    alerts_7d: number;
    errors_24h: number;
    critical_24h: number;
    avg_duration_ms: number | null;
    last_health_at: string | null;
    last_alert_at: string | null;
  };
  events: DirectEventRow[];
};

const EVENT_SELECT =
  "id,kind,severity,reason,age_minutes,breaking_count,ticker_items,duration_ms,db_error,path,created_at";

export type DirectRange = 1 | 7 | 30 | 365;

export const getDirectDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days?: number; from?: string; to?: string } | undefined) => {
    const days = [1, 7, 30, 365].includes(Number(input?.days))
      ? (Number(input?.days) as DirectRange)
      : 7;
    const from = input?.from ?? null;
    const to = input?.to ?? null;
    if (!from && !to) return { days, from: null, to: null };
    const check = validateDateRange(from, to);
    if (!check.ok) throw new Error(check.error);
    return { days, from: from as string, to: to as string };
  })
  .handler(async ({ context, data }): Promise<DirectDashboard> => {
    const { supabase } = context;
    const custom = Boolean(data.from && data.to);
    const rangeDays = data.days;
    const rangeStart = custom
      ? new Date(`${data.from}T00:00:00.000Z`).toISOString()
      : new Date(Date.now() - rangeDays * 24 * 3600_000).toISOString();
    const rangeEnd = custom
      ? new Date(`${data.to}T23:59:59.999Z`).toISOString()
      : new Date().toISOString();
    const started = Date.now();
    const nowIso = new Date().toISOString();
    const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();

    const [breaking, latest, events, alerts24, alerts7d] = await Promise.all([
      supabase
        .from("articles")
        .select("slug,published_at", { count: "exact" })
        .eq("status", "publie")
        .eq("is_breaking", true)
        .lte("published_at", nowIso)
        .order("published_at", { ascending: false })
        .limit(1),
      supabase
        .from("articles")
        .select("title,published_at")
        .eq("status", "publie")
        .lte("published_at", nowIso)
        .order("published_at", { ascending: false })
        .limit(8),
      supabase
        .from("direct_events")
        .select(EVENT_SELECT)
        .gte("created_at", rangeStart)
        .lte("created_at", rangeEnd)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("direct_events")
        .select("severity,duration_ms,kind,created_at")
        .gte("created_at", dayAgo)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("direct_events")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekAgo)
        .in("severity", ["warn", "critical"]),
    ]);

    const latestRows = latest.data ?? [];
    const newestIso = (latestRows[0]?.published_at as string | null) ?? null;
    const ageMinutes = minutesSince(newestIso);
    const dbError = breaking.error?.message ?? latest.error?.message ?? events.error?.message ?? null;
    const status: DirectSeverity = dbError
      ? "critical"
      : severityFor(ageMinutes, latestRows.length);

    const recent = alerts24.data ?? [];
    const durations = recent
      .map((e) => e.duration_ms)
      .filter((d): d is number => typeof d === "number" && d > 0);
    const rows = (events.data ?? []) as DirectEventRow[];

    return {
      checked_at: nowIso,
      range_days: rangeDays,
      range_start: rangeStart,
      range_end: rangeEnd,
      range_custom: custom,
      status,
      newest_published_at: newestIso,
      newest_title: (latestRows[0]?.title as string | null) ?? null,
      age_minutes: ageMinutes,
      breaking_count: breaking.count ?? (breaking.data?.length ?? 0),
      ticker_items: latestRows.length,
      db_error: dbError,
      query_ms: Date.now() - started,
      thresholds: {
        warn_minutes: DIRECT_STALE_WARN_MINUTES,
        critical_minutes: DIRECT_STALE_CRITICAL_MINUTES,
      },
      counters: {
        alerts_24h: recent.filter((e) => e.severity === "warn" || e.severity === "critical").length,
        alerts_7d: alerts7d.count ?? 0,
        errors_24h: recent.filter((e) => e.kind === "error").length,
        critical_24h: recent.filter((e) => e.severity === "critical").length,
        avg_duration_ms: durations.length
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : null,
        last_health_at: recent.find((e) => e.kind === "health")?.created_at ?? null,
        last_alert_at:
          recent.find((e) => e.severity === "warn" || e.severity === "critical")?.created_at ?? null,
      },
      events: rows,
    };
  });

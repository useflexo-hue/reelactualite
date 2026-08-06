import { createFileRoute } from "@tanstack/react-router";
import {
  DIRECT_STALE_CRITICAL_MINUTES,
  DIRECT_STALE_WARN_MINUTES,
  logDirect,
  minutesSince,
  severityFor,
} from "@/lib/direct-monitor";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

export const Route = createFileRoute("/api/public/direct-health")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      /** Sonde de santé du fil direct — à brancher sur un moniteur externe. */
      GET: async ({ request }) => {
        const started = Date.now();
        const strict = new URL(request.url).searchParams.get("strict") === "1";
        try {
          const { publicDb } = await import("@/lib/public-db.server");
          const db = publicDb();
          const nowIso = new Date().toISOString();

          const [breaking, latest] = await Promise.all([
            db
              .from("articles")
              .select("slug,published_at", { count: "exact" })
              .eq("status", "publie")
              .eq("is_breaking", true)
              .lte("published_at", nowIso)
              .order("published_at", { ascending: false })
              .limit(1),
            db
              .from("articles")
              .select("slug,published_at")
              .eq("status", "publie")
              .lte("published_at", nowIso)
              .order("published_at", { ascending: false })
              .limit(8),
          ]);

          const dbError = breaking.error?.message ?? latest.error?.message ?? null;
          const latestRows = latest.data ?? [];
          const newestIso =
            (breaking.data?.[0]?.published_at as string | null) ??
            (latestRows[0]?.published_at as string | null) ??
            null;
          const ageMinutes = minutesSince(newestIso);
          const status = dbError ? "critical" : severityFor(ageMinutes, latestRows.length);

          const body = {
            status,
            checked_at: nowIso,
            db_error: dbError,
            breaking_count: breaking.count ?? (breaking.data?.length ?? 0),
            ticker_items: latestRows.length,
            newest_published_at: newestIso,
            age_minutes: ageMinutes,
            thresholds: {
              warn_minutes: DIRECT_STALE_WARN_MINUTES,
              critical_minutes: DIRECT_STALE_CRITICAL_MINUTES,
            },
            duration_ms: Date.now() - started,
          };

          logDirect(status === "ok" ? "info" : status === "warn" ? "warn" : "error", "health", body);

          const { recordDirectEvent } = await import("@/lib/direct-events.server");
          await recordDirectEvent({
            kind: "health",
            severity: status,
            age_minutes: ageMinutes,
            breaking_count: body.breaking_count,
            ticker_items: latestRows.length,
            duration_ms: body.duration_ms,
            db_error: dbError,
          });

          return new Response(JSON.stringify(body), {
            status: status === "critical" && strict ? 503 : 200,
            headers: CORS,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logDirect("error", "health_exception", { message });
          const { recordDirectEvent } = await import("@/lib/direct-events.server");
          await recordDirectEvent({
            kind: "error",
            severity: "critical",
            reason: "health_exception",
            db_error: message,
            duration_ms: Date.now() - started,
          });
          return new Response(JSON.stringify({ status: "critical", error: "health_check_failed" }), {
            status: 503,
            headers: CORS,
          });
        }
      },

      /** Alerte remontée par le navigateur quand le bandeau se fige côté client. */
      POST: async ({ request }) => {
        let payload: Record<string, unknown> = {};
        try {
          payload = (await request.json()) as Record<string, unknown>;
        } catch {
          payload = {};
        }
        const safe = {
          reason: String(payload["reason"] ?? "unknown").slice(0, 60),
          age_minutes: Number(payload["ageMinutes"] ?? -1),
          items: Number(payload["items"] ?? -1),
          animated: Boolean(payload["animated"]),
          path: String(payload["path"] ?? "").slice(0, 120),
        };
        logDirect("warn", "client_alert", safe);
        const { recordDirectEvent } = await import("@/lib/direct-events.server");
        await recordDirectEvent({
          kind: "client_alert",
          severity: safe.reason === "content_critical" ? "critical" : "warn",
          reason: safe.reason,
          age_minutes: safe.age_minutes >= 0 ? safe.age_minutes : null,
          ticker_items: safe.items >= 0 ? safe.items : null,
          path: safe.path || null,
          detail: { animated: safe.animated },
        });
        return new Response(JSON.stringify({ received: true }), { status: 202, headers: CORS });
      },
    },
  },
});

/**
 * Enregistrement serveur du journal de surveillance du direct.
 * Utilise le client admin : les écritures ne sont jamais faites depuis le navigateur.
 */
import { logDirect } from "@/lib/direct-monitor";

export type DirectEventInput = {
  kind: "health" | "client_alert" | "home_data" | "error";
  severity: "ok" | "info" | "warn" | "critical";
  reason?: string | null;
  age_minutes?: number | null;
  breaking_count?: number | null;
  ticker_items?: number | null;
  duration_ms?: number | null;
  db_error?: string | null;
  path?: string | null;
  detail?: Record<string, unknown> | null;
};

export async function recordDirectEvent(input: DirectEventInput): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("direct_events").insert({
      kind: input.kind,
      severity: input.severity,
      reason: input.reason ?? null,
      age_minutes: input.age_minutes ?? null,
      breaking_count: input.breaking_count ?? null,
      ticker_items: input.ticker_items ?? null,
      duration_ms: input.duration_ms ?? null,
      db_error: input.db_error ?? null,
      path: input.path ?? null,
      detail: (input.detail ?? null) as never,
    });
    if (error) logDirect("error", "event_insert_failed", { message: error.message });
  } catch (error) {
    logDirect("error", "event_insert_exception", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

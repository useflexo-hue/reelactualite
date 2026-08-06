/**
 * Surveillance du fil « direct » (bandeau Dernière minute).
 * Module client-safe : constantes + helpers partagés serveur/navigateur.
 */

/** Au-delà de ce délai sans nouvel article, le fil est considéré comme figé. */
export const DIRECT_STALE_WARN_MINUTES = 180; // 3 h
export const DIRECT_STALE_CRITICAL_MINUTES = 720; // 12 h

/** Fréquence de re-vérification du fil côté navigateur. */
export const DIRECT_REFRESH_MS = 60_000;

export type DirectSeverity = "ok" | "warn" | "critical";

export function minutesSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.round((Date.now() - t) / 60_000);
}

export function severityFor(ageMinutes: number | null, itemCount: number): DirectSeverity {
  if (itemCount === 0) return "critical";
  if (ageMinutes === null) return "warn";
  if (ageMinutes >= DIRECT_STALE_CRITICAL_MINUTES) return "critical";
  if (ageMinutes >= DIRECT_STALE_WARN_MINUTES) return "warn";
  return "ok";
}

/** Log structuré, repérable dans les journaux serveur avec le préfixe [direct]. */
export function logDirect(
  level: "info" | "warn" | "error",
  event: string,
  payload: Record<string, unknown> = {},
) {
  const line = `[direct] ${event} ${JSON.stringify(payload)}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

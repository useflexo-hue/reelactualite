/**
 * Validation partagée (client + serveur) de la plage de dates personnalisée
 * utilisée par la supervision du direct.
 */

export const DIRECT_RANGE_MAX_DAYS = 366;
/** Aucun événement avant la mise en service du journal. */
export const DIRECT_RANGE_MIN_DAY = "2024-01-01";

export const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDayString(value: unknown): value is string {
  if (typeof value !== "string" || !DAY_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function todayDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00.000Z`);
  const b = Date.parse(`${to}T00:00:00.000Z`);
  return Math.round((b - a) / 86_400_000) + 1;
}

export type RangeValidation = { ok: true } | { ok: false; error: string; field: "from" | "to" };

/** Valide une plage « du … au … ». Messages destinés à l'admin (français). */
export function validateDateRange(
  from: string | null | undefined,
  to: string | null | undefined,
  now: Date = new Date(),
): RangeValidation {
  if (!from) return { ok: false, error: "Indiquez une date de début.", field: "from" };
  if (!to) return { ok: false, error: "Indiquez une date de fin.", field: "to" };
  if (!isDayString(from))
    return { ok: false, error: "Date de début invalide (format attendu : JJ/MM/AAAA).", field: "from" };
  if (!isDayString(to))
    return { ok: false, error: "Date de fin invalide (format attendu : JJ/MM/AAAA).", field: "to" };

  const today = todayDay(now);
  if (from > today)
    return { ok: false, error: "La date de début ne peut pas être dans le futur.", field: "from" };
  if (to > today)
    return { ok: false, error: "La date de fin ne peut pas être dans le futur.", field: "to" };
  if (from < DIRECT_RANGE_MIN_DAY)
    return {
      ok: false,
      error: `Le journal ne remonte pas avant le 01/01/${DIRECT_RANGE_MIN_DAY.slice(0, 4)}.`,
      field: "from",
    };
  if (from > to)
    return {
      ok: false,
      error: "La date de début doit précéder la date de fin.",
      field: "from",
    };

  const span = daysBetween(from, to);
  if (span > DIRECT_RANGE_MAX_DAYS)
    return {
      ok: false,
      error: `Plage trop longue : ${span} jours demandés, maximum ${DIRECT_RANGE_MAX_DAYS} jours (12 mois).`,
      field: "to",
    };

  return { ok: true };
}

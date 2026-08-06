import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDirectDashboard, type DirectEventRow } from "@/lib/direct.functions";
import { describeRange, exportDirectCsv, exportDirectPdf, rangeLabel } from "@/lib/direct-export";
import {
  DIRECT_RANGE_MAX_DAYS,
  DIRECT_RANGE_MIN_DAY,
  todayDay,
  validateDateRange,
} from "@/lib/direct-range";
import { NewsroomHeader, NewsroomMain } from "@/components/newsroom/NewsroomHeader";
import { formatDateTime } from "@/lib/format";
import { DIRECT_REFRESH_MS } from "@/lib/direct-monitor";

const RANGES = [1, 7, 30, 365] as const;
const ONLY = ["all", "alerts", "errors"] as const;
type OnlyFilter = (typeof ONLY)[number];

const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export const Route = createFileRoute("/_authenticated/redaction/direct")({
  component: DirectDashboardPage,
  validateSearch: (search: Record<string, unknown>) => ({
    days: RANGES.includes(Number(search["days"]) as (typeof RANGES)[number])
      ? (Number(search["days"]) as (typeof RANGES)[number])
      : 7,
    only: ONLY.includes(search["only"] as OnlyFilter) ? (search["only"] as OnlyFilter) : "all",
    from: isDay(search["from"]) ? (search["from"] as string) : undefined,
    to: isDay(search["to"]) ? (search["to"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Supervision du direct — ReelActu" },
      {
        name: "description",
        content:
          "Suivi en temps réel du bandeau Dernière minute : fraîcheur des articles, alertes et erreurs.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Supervision du direct — ReelActu" },
      {
        property: "og:description",
        content: "Tableau de bord de santé du fil direct ReelActu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const STATUS_STYLE: Record<string, string> = {
  ok: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warn: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  critical: "bg-signal/10 text-signal",
  info: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  ok: "Opérationnel",
  warn: "À surveiller",
  critical: "Critique",
  info: "Info",
};

const KIND_LABEL: Record<string, string> = {
  health: "Sonde de santé",
  client_alert: "Alerte navigateur",
  home_data: "Rendu accueil",
  error: "Erreur",
};

const REASON_LABEL: Record<string, string> = {
  animation_stopped: "Animation du bandeau arrêtée",
  content_warn: "Contenu vieillissant",
  content_critical: "Contenu figé",
};

function formatAge(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  if (h < 48) return `${h} h ${minutes % 60} min`;
  return `${Math.floor(h / 24)} j ${h % 24} h`;
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-rule p-4">
      <p className="font-sans text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-serif text-2xl font-bold ${tone ?? ""}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function DirectDashboardPage() {
  const navigate = useNavigate();
  const fetchDashboard = useServerFn(getDirectDashboard);
  const { days, only, from, to } = Route.useSearch();
  const appliedCustom = Boolean(from && to);
  const todayIso = todayDay();
  const [customMode, setCustomMode] = useState(appliedCustom);
  const [draft, setDraft] = useState({ from: from ?? todayIso, to: to ?? todayIso });

  useEffect(() => {
    if (from && to) {
      setCustomMode(true);
      setDraft({ from, to });
    }
  }, [from, to]);

  const custom = customMode || appliedCustom;
  const validation = custom ? validateDateRange(draft.from, draft.to) : ({ ok: true } as const);
  const rangeError = validation.ok ? null : validation.error;
  const errorField = validation.ok ? null : validation.field;

  const dash = useQuery({
    queryKey: ["direct", "dashboard", days, from ?? null, to ?? null],
    queryFn: () =>
      fetchDashboard({
        data: { days, ...(from ? { from } : {}), ...(to ? { to } : {}) },
      }),
    refetchInterval: DIRECT_REFRESH_MS,
    refetchOnWindowFocus: true,
  });

  const d = dash.data;
  const allEvents: DirectEventRow[] = d?.events ?? [];
  const events = allEvents.filter((e) =>
    only === "alerts"
      ? e.severity === "warn" || e.severity === "critical"
      : only === "errors"
        ? e.kind === "error" || Boolean(e.db_error)
        : true,
  );

  function setSearch(patch: {
    days?: (typeof RANGES)[number];
    only?: OnlyFilter;
    from?: string | undefined;
    to?: string | undefined;
  }) {
    navigate({ to: "/redaction/direct", search: { days, only, from, to, ...patch } });
  }

  /** Applique la plage seulement si elle est valide, sinon affiche l'erreur. */
  function updateDraft(patch: { from?: string; to?: string }) {
    const next = { ...draft, ...patch };
    setDraft(next);
    const check = validateDateRange(next.from, next.to);
    if (check.ok) setSearch({ from: next.from, to: next.to });
    else toast.error(check.error);
  }

  function enableCustom() {
    setCustomMode(true);
    const next = { from: from ?? todayIso, to: to ?? todayIso };
    setDraft(next);
    const check = validateDateRange(next.from, next.to);
    if (check.ok) setSearch({ from: next.from, to: next.to });
  }

  function resetCustom() {
    setCustomMode(false);
    setDraft({ from: todayIso, to: todayIso });
    setSearch({ from: undefined, to: undefined });
  }


  return (
    <div className="min-h-screen bg-background">
      <NewsroomHeader section="Supervision du direct" />

      <NewsroomMain>
        <div className="mb-6 grid gap-3 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-xl font-bold sm:text-2xl">État du direct</h1>
            <p className="text-sm text-muted-foreground">
              Rafraîchissement automatique toutes les {Math.round(DIRECT_REFRESH_MS / 1000)} s
              {d ? ` — dernière vérification ${formatDateTime(d.checked_at)}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {d ? (
              <span
                className={`rounded-full px-3 py-1 font-sans text-xs font-semibold uppercase tracking-wide ${
                  STATUS_STYLE[d.status] ?? STATUS_STYLE["info"]
                }`}
              >
                {STATUS_LABEL[d.status] ?? d.status}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => dash.refetch()}
              className="inline-flex h-11 items-center rounded-md border border-rule px-3 text-sm hover:border-signal"
            >
              Rafraîchir
            </button>
          </div>
        </div>

        {dash.isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : null}
        {dash.error ? (
          <p className="rounded-md border border-signal/40 bg-signal/5 p-4 text-sm text-signal">
            Impossible de charger la supervision : {(dash.error as Error).message}
          </p>
        ) : null}

        {d ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Âge du dernier article"
                value={formatAge(d.age_minutes)}
                hint={
                  d.newest_published_at
                    ? formatDateTime(d.newest_published_at)
                    : "Aucune publication"
                }
                tone={
                  d.status === "ok"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : d.status === "warn"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-signal"
                }
              />
              <Stat
                label="Alertes (24 h)"
                value={String(d.counters.alerts_24h)}
                hint={`${d.counters.alerts_7d} sur 7 jours${
                  d.counters.last_alert_at
                    ? ` — dernière ${formatDateTime(d.counters.last_alert_at)}`
                    : ""
                }`}
                tone={d.counters.alerts_24h > 0 ? "text-amber-600 dark:text-amber-400" : ""}
              />
              <Stat
                label="Erreurs (24 h)"
                value={String(d.counters.errors_24h)}
                hint={
                  d.db_error
                    ? `Base : ${d.db_error}`
                    : `${d.counters.critical_24h} événement(s) critique(s)`
                }
                tone={
                  d.counters.errors_24h > 0 || d.db_error ? "text-signal" : ""
                }
              />
              <Stat
                label="Temps de rafraîchissement"
                value={`${d.query_ms} ms`}
                hint={
                  d.counters.avg_duration_ms !== null
                    ? `Moyenne sondes 24 h : ${d.counters.avg_duration_ms} ms`
                    : "Aucune mesure enregistrée"
                }
              />
            </section>

            <section className="mt-4 grid gap-3 sm:grid-cols-3">
              <Stat label="Alertes « breaking » actives" value={String(d.breaking_count)} />
              <Stat label="Titres dans le fil" value={String(d.ticker_items)} />
              <Stat
                label="Seuils"
                value={`${Math.round(d.thresholds.warn_minutes / 60)} h / ${Math.round(
                  d.thresholds.critical_minutes / 60,
                )} h`}
                hint="Alerte / critique sans nouvelle publication"
              />
            </section>

            <section className="mt-8">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-serif text-xl font-bold">
                    Historique des événements [direct]
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {describeRange(d)} — {events.length} événement(s)
                    {only !== "all" ? ` sur ${allEvents.length}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Période"
                    value={custom ? "custom" : days}
                    onChange={(e) =>
                      e.target.value === "custom"
                        ? enableCustom()
                        : (setCustomMode(false),
                          setSearch({
                            days: Number(e.target.value) as (typeof RANGES)[number],
                            from: undefined,
                            to: undefined,
                          }))
                    }
                    className="h-11 rounded-md border border-rule bg-background px-3 text-sm"
                  >
                    {RANGES.map((r) => (
                      <option key={r} value={r}>
                        {rangeLabel(r)}
                      </option>
                    ))}
                    <option value="custom">Dates personnalisées…</option>
                  </select>
                  {custom ? (
                    <span className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                      <label htmlFor="direct-from">Du</label>
                      <input
                        id="direct-from"
                        type="date"
                        value={draft.from}
                        min={DIRECT_RANGE_MIN_DAY}
                        max={todayIso}
                        aria-invalid={errorField === "from"}
                        aria-describedby={rangeError ? "direct-range-error" : undefined}
                        onChange={(e) => updateDraft({ from: e.target.value })}
                        className={`h-11 rounded-md border bg-background px-2 text-base text-foreground ${
                          errorField === "from" ? "border-signal" : "border-rule"
                        }`}
                      />
                      <label htmlFor="direct-to">au</label>
                      <input
                        id="direct-to"
                        type="date"
                        value={draft.to}
                        min={DIRECT_RANGE_MIN_DAY}
                        max={todayIso}
                        aria-invalid={errorField === "to"}
                        aria-describedby={rangeError ? "direct-range-error" : undefined}
                        onChange={(e) => updateDraft({ to: e.target.value })}
                        className={`h-11 rounded-md border bg-background px-2 text-base text-foreground ${
                          errorField === "to" ? "border-signal" : "border-rule"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={resetCustom}
                        className="ml-1 text-xs text-signal hover:underline"
                      >
                        Réinitialiser
                      </button>
                    </span>
                  ) : null}
                  <select
                    aria-label="Filtre"
                    value={only}
                    onChange={(e) => setSearch({ only: e.target.value as OnlyFilter })}
                    className="h-11 rounded-md border border-rule bg-background px-3 text-sm"
                  >
                    <option value="all">Tous les événements</option>
                    <option value="alerts">Alertes seulement</option>
                    <option value="errors">Erreurs seulement</option>
                  </select>
                  <button
                    type="button"
                    disabled={Boolean(rangeError)}
                    onClick={() => exportDirectCsv(d, events)}
                    className="inline-flex h-11 items-center rounded-md border border-rule px-3 text-sm hover:border-signal disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Export CSV
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(rangeError)}
                    onClick={() => exportDirectPdf(d, events)}
                    className="inline-flex h-11 items-center rounded-md bg-signal px-3 text-sm font-semibold text-signal-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Export PDF
                  </button>
                </div>
              </div>
              {rangeError ? (
                <p
                  id="direct-range-error"
                  role="alert"
                  className="mb-3 rounded-md border border-signal/40 bg-signal/5 p-3 text-sm text-signal"
                >
                  {rangeError} La période affichée reste la dernière plage valide (maximum{" "}
                  {DIRECT_RANGE_MAX_DAYS} jours, pas de date future).
                </p>
              ) : null}
              {events.length === 0 ? (
                <p className="rounded-md border border-rule p-4 text-sm text-muted-foreground">
                  Aucun événement sur la période sélectionnée. Le journal se remplit à chaque appel de
                  la sonde <code>/api/public/direct-health</code> et à chaque alerte remontée par le
                  bandeau.
                </p>
              ) : (
                <div className="-mx-3 overflow-x-auto rounded-lg border-y border-rule sm:mx-0 sm:rounded-lg sm:border">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="border-b border-rule bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Gravité</th>
                        <th className="px-3 py-2">Détail</th>
                        <th className="px-3 py-2">Âge</th>
                        <th className="px-3 py-2">Durée</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((e) => (
                        <tr key={e.id} className="border-b border-rule/60 last:border-0">
                          <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                            {formatDateTime(e.created_at)}
                          </td>
                          <td className="px-3 py-2">{KIND_LABEL[e.kind] ?? e.kind}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                STATUS_STYLE[e.severity] ?? STATUS_STYLE["info"]
                              }`}
                            >
                              {STATUS_LABEL[e.severity] ?? e.severity}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {e.db_error ??
                              (e.reason ? (REASON_LABEL[e.reason] ?? e.reason) : "—")}
                            {e.path ? ` · ${e.path}` : ""}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                            {formatAge(e.age_minutes)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                            {e.duration_ms !== null ? `${e.duration_ms} ms` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : null}
      </NewsroomMain>
    </div>
  );
}

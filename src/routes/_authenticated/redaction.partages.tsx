import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getShareDashboard, SHARE_NETWORKS } from "@/lib/share-dashboard.functions";
import { NewsroomHeader, NewsroomMain } from "@/components/newsroom/NewsroomHeader";

const RANGES = [7, 30, 90, 365] as const;
type Range = (typeof RANGES)[number];

const NETWORK_LABEL: Record<string, string> = {
  facebook: "Facebook",
  x: "X",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  copy_link: "Lien copié",
};

export const Route = createFileRoute("/_authenticated/redaction/partages")({
  component: SharesDashboardPage,
  validateSearch: (search: Record<string, unknown>) => ({
    days: RANGES.includes(Number(search["days"]) as Range) ? (Number(search["days"]) as Range) : 30,
    network: (SHARE_NETWORKS as readonly string[]).includes(String(search["network"]))
      ? String(search["network"])
      : "all",
  }),
  head: () => ({
    meta: [
      { title: "Partages sociaux — ReelActu" },
      {
        name: "description",
        content:
          "Suivi des clics de partage par article et par réseau social pour la rédaction ReelActu.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Partages sociaux — ReelActu" },
      {
        property: "og:description",
        content: "Statistiques de partage des articles ReelActu par réseau.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function SharesDashboardPage() {
  const { days, network } = Route.useSearch();
  const navigate = useNavigate();
  const fetchDashboard = useServerFn(getShareDashboard);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["share-dashboard", days, network],
    queryFn: () => fetchDashboard({ data: { days, network } }),
  });

  const setSearch = (patch: { days?: Range; network?: string }) =>
    navigate({ to: "/redaction/partages", search: { days, network, ...patch } });

  const dayLabel = (d: string) => d.slice(8, 10) + "/" + d.slice(5, 7);

  return (
    <div className="min-h-screen bg-background">
      <NewsroomHeader section="Partages sociaux" />

      <NewsroomMain>
        <div className="mb-6 grid gap-3 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-xl font-bold sm:text-2xl">Partages sociaux</h1>
            <p className="text-sm text-muted-foreground">
              Clics sur les boutons de partage, par article et par réseau.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex h-11 items-center justify-center rounded-md border border-rule px-4 text-sm font-semibold hover:border-signal"
          >
            Actualiser
          </button>
        </div>

        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Période</span>
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSearch({ days: r })}
                className={`inline-flex h-9 items-center rounded-md border px-3 text-sm font-semibold ${
                  days === r
                    ? "border-signal bg-signal text-signal-foreground"
                    : "border-rule hover:border-signal"
                }`}
              >
                {r} j
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Réseau</span>
            {["all", ...SHARE_NETWORKS].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSearch({ network: n })}
                className={`inline-flex h-9 items-center rounded-md border px-3 text-sm font-semibold ${
                  network === n
                    ? "border-signal bg-signal text-signal-foreground"
                    : "border-rule hover:border-signal"
                }`}
              >
                {n === "all" ? "Tous" : (NETWORK_LABEL[n] ?? n)}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <p className="rounded-md border border-signal/40 bg-signal/10 px-4 py-3 text-sm text-signal">
            Impossible de charger les statistiques : {(error as Error).message}
          </p>
        ) : isLoading || !data ? (
          <p className="text-sm text-muted-foreground">Chargement des statistiques…</p>
        ) : (
          <>
            <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <StatCard label="Partages totaux" value={data.total} />
              <StatCard label="Articles partagés" value={data.articles.length} />
              <StatCard
                label="Meilleur réseau"
                value={
                  NETWORK_LABEL[
                    [...data.by_network].sort((a, b) => b.count - a.count)[0]?.network ?? ""
                  ] ?? "—"
                }
              />
              <StatCard
                label="Moyenne / jour"
                value={Math.round((data.total / data.range_days) * 10) / 10}
              />
            </div>

            <div className="mb-8 grid gap-6 lg:grid-cols-2">
              <section className="rounded-lg border border-rule p-3 sm:p-4">
                <h2 className="mb-4 font-serif text-lg font-bold">Évolution quotidienne</h2>
                <div className="h-56 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.by_day}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-rule" />
                      <XAxis dataKey="day" tickFormatter={dayLabel} fontSize={11} />
                      <YAxis allowDecimals={false} fontSize={11} />
                      <Tooltip labelFormatter={(l) => dayLabel(String(l))} />
                      <Line
                        type="monotone"
                        dataKey="total"
                        name="Partages"
                        stroke="hsl(var(--signal, 0 84% 50%))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="rounded-lg border border-rule p-3 sm:p-4">
                <h2 className="mb-4 font-serif text-lg font-bold">Répartition par réseau</h2>
                <div className="h-56 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.by_network.map((n) => ({
                        ...n,
                        label: NETWORK_LABEL[n.network] ?? n.network,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-rule" />
                      <XAxis dataKey="label" fontSize={11} />
                      <YAxis allowDecimals={false} fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="count" name="Partages" radius={[4, 4, 0, 0]}>
                        {data.by_network.map((n) => (
                          <Cell key={n.network} fill="currentColor" className="text-signal" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>

            <section className="rounded-lg border border-rule">
              <h2 className="border-b border-rule px-4 py-3 font-serif text-lg font-bold">
                Top articles partagés
              </h2>
              {data.articles.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">
                  Aucun partage enregistré sur cette période.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr className="border-b border-rule">
                        <th className="px-4 py-2">Article</th>
                        {SHARE_NETWORKS.map((n) => (
                          <th key={n} className="px-3 py-2 text-right">
                            {NETWORK_LABEL[n]}
                          </th>
                        ))}
                        <th className="px-4 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.articles.map((a) => (
                        <tr key={a.slug} className="border-b border-rule/60 last:border-0">
                          <td className="max-w-md px-4 py-2">
                            <Link
                              to="/$slug"
                              params={{ slug: a.slug }}
                              className="line-clamp-2 font-semibold hover:text-signal"
                            >
                              {a.title ?? a.slug}
                            </Link>
                          </td>
                          {SHARE_NETWORKS.map((n) => (
                            <td key={n} className="px-3 py-2 text-right tabular-nums">
                              {a.by_network[n] ?? 0}
                            </td>
                          ))}
                          <td className="px-4 py-2 text-right font-bold tabular-nums">{a.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </NewsroomMain>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-rule p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl font-bold">{value}</p>
    </div>
  );
}

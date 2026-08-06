import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSocialPublications } from "@/lib/social-publish.functions";
import { NewsroomHeader, NewsroomMain } from "@/components/newsroom/NewsroomHeader";
import { SOCIALS } from "@/lib/social";

export const Route = createFileRoute("/_authenticated/redaction/reseaux")({
  head: () => ({
    meta: [
      { title: "Diffusion réseaux sociaux — Rédaction ReelActu" },
      {
        name: "description",
        content:
          "Suivi des publications automatiques des articles ReelActu sur X, Facebook, LinkedIn et Telegram.",
      },
      { property: "og:title", content: "Diffusion réseaux sociaux — Rédaction ReelActu" },
      {
        property: "og:description",
        content: "Journal des diffusions automatiques des articles ReelActu sur les réseaux sociaux.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SocialDashboard,
});

const STATUS_STYLES: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-800",
  failed: "bg-destructive/10 text-destructive",
  skipped: "bg-muted text-muted-foreground",
  pending: "bg-amber-100 text-amber-800",
};

const STATUS_LABELS: Record<string, string> = {
  sent: "Diffusé",
  failed: "Échec",
  skipped: "Non configuré",
  pending: "En attente",
};

function label(platform: string) {
  return SOCIALS.find((p) => p.id === platform)?.name ?? platform;
}

function SocialDashboard() {
  const fetchList = useServerFn(listSocialPublications);
  const { data, isLoading, error } = useQuery({
    queryKey: ["social", "publications"],
    queryFn: () => fetchList(),
    refetchInterval: 60_000,
  });

  const rows = data ?? [];
  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <NewsroomHeader section="Diffusion réseaux sociaux" />

      <NewsroomMain>
        <h1 className="font-serif text-xl font-bold tracking-tight sm:text-2xl">Diffusion sur les réseaux sociaux</h1>
        <Link
          to="/redaction/x"
          className="mt-3 inline-flex h-11 items-center rounded-md border border-border px-4 text-sm font-semibold hover:border-primary"
        >
          Connecter le compte X
        </Link>

        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Chaque article passé au statut « publié » est automatiquement diffusé sur les réseaux
          connectés. Les réseaux non encore connectés apparaissent comme « non configuré ».
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["sent", "failed", "skipped", "pending"] as const).map((s) => (
            <div key={s} className="rounded-lg border border-border p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {STATUS_LABELS[s]}
              </div>
              <div className="mt-1 text-2xl font-bold">{counts[s] ?? 0}</div>
            </div>
          ))}
        </div>

        {isLoading && <p className="mt-8 text-sm text-muted-foreground">Chargement…</p>}
        {error && (
          <p className="mt-8 text-sm text-destructive">
            {error instanceof Error ? error.message : "Chargement impossible."}
          </p>
        )}

        {!isLoading && rows.length === 0 && (
          <p className="mt-8 text-sm text-muted-foreground">
            Aucune diffusion enregistrée pour l'instant.
          </p>
        )}

        {rows.length > 0 && (
          <div className="-mx-3 mt-8 overflow-x-auto border-y border-border sm:mx-0 sm:rounded-lg sm:border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Article</th>
                  <th className="px-4 py-3">Réseau</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Détail</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border align-top">
                    <td className="px-4 py-3 font-medium">
                      {row.article_slug ? (
                        <Link
                          to="/$slug"
                          params={{ slug: row.article_slug }}
                          className="hover:underline"
                        >
                          {row.article_title ?? row.article_slug}
                        </Link>
                      ) : (
                        (row.article_title ?? "—")
                      )}
                    </td>
                    <td className="px-4 py-3">{label(row.platform)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                          STATUS_STYLES[row.status] ?? "bg-muted"
                        }`}
                      >
                        {STATUS_LABELS[row.status] ?? row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(row.sent_at ?? row.created_at).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {row.post_url ? (
                        <a
                          href={row.post_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          Voir la publication
                        </a>
                      ) : (
                        (row.error ?? "—")
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </NewsroomMain>
    </div>
  );
}

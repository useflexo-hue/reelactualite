import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getNewsroomContext,
  listNewsroomArticles,
  deleteNewsroomArticle,
} from "@/lib/newsroom.functions";
import { NewsroomHeader, NewsroomMain } from "@/components/newsroom/NewsroomHeader";
import { formatDateTime } from "@/lib/format";


export const Route = createFileRoute("/_authenticated/redaction/")({
  component: NewsroomHome,
  head: () => ({
    meta: [
      { title: "Tableau de bord rédaction — ReelActu" },
      {
        name: "description",
        content: "Gestion des articles, brouillons et publications de la rédaction ReelActu.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Tableau de bord rédaction — ReelActu" },
      { property: "og:description", content: "Rédiger, relire et publier les articles ReelActu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const STATUS_LABEL: Record<string, string> = {
  brouillon: "Brouillon",
  relecture: "En relecture",
  valide: "Validé",
  publie: "Publié",
};

function NewsroomHome() {
  const queryClient = useQueryClient();
  const fetchContext = useServerFn(getNewsroomContext);
  const fetchArticles = useServerFn(listNewsroomArticles);
  const removeArticle = useServerFn(deleteNewsroomArticle);

  const ctx = useQuery({ queryKey: ["newsroom", "context"], queryFn: () => fetchContext() });
  const articles = useQuery({
    queryKey: ["newsroom", "articles"],
    queryFn: () => fetchArticles(),
  });

  const noRole = ctx.data && ctx.data.roles.length === 0;

  async function onDelete(id: string, title: string) {
    if (!window.confirm(`Supprimer « ${title} » ?`)) return;
    await removeArticle({ data: { id } });
    queryClient.invalidateQueries({ queryKey: ["newsroom", "articles"] });
  }

  const rows = articles.data ?? [];

  return (
    <div className="min-h-screen bg-background">
      <NewsroomHeader section="Espace rédaction" />

      <NewsroomMain>
        <div className="mb-6 grid gap-3 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-serif text-xl font-bold sm:text-2xl">Articles</h1>
            <p className="truncate text-sm text-muted-foreground">
              {ctx.data?.email}
              {ctx.data?.roles.length ? ` — ${ctx.data.roles.join(", ")}` : ""}
            </p>
          </div>
          <Link
            to="/redaction/$id"
            params={{ id: "nouveau" }}
            className="inline-flex h-11 items-center justify-center rounded-md bg-signal px-4 text-sm font-semibold text-signal-foreground"
          >
            Nouvel article
          </Link>
        </div>

        {noRole ? (
          <p className="mb-6 rounded-md border border-rule p-4 text-sm">
            Votre compte n'a pas encore de rôle dans la rédaction. Contactez un administrateur pour
            obtenir les droits de rédaction ou de publication.
          </p>
        ) : null}

        {articles.isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : (
          <>
            {/* Mobile : liste en cartes */}
            <ul className="grid gap-3 md:hidden">
              {rows.map((a) => (
                <li key={a.id} className="rounded-lg border border-rule p-3">
                  <Link
                    to="/redaction/$id"
                    params={{ id: a.id }}
                    className="block font-medium leading-snug hover:text-signal"
                  >
                    {a.title}
                  </Link>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className={a.status === "publie" ? "text-signal" : ""}>
                      {STATUS_LABEL[a.status] ?? a.status}
                    </span>
                    <span>{formatDateTime(a.updated_at)}</span>
                    {ctx.data?.canPublish ? (
                      <button
                        type="button"
                        className="ml-auto h-8 px-1 text-signal"
                        onClick={() => onDelete(a.id, a.title)}
                      >
                        Supprimer
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop : tableau */}
            <div className="hidden overflow-x-auto rounded-lg border border-rule md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-rule bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Titre</th>
                    <th className="px-3 py-2">Statut</th>
                    <th className="px-3 py-2">Mise à jour</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.id} className="border-b border-rule/60 last:border-0">
                      <td className="px-3 py-2">
                        <Link
                          to="/redaction/$id"
                          params={{ id: a.id }}
                          className="font-medium hover:text-signal"
                        >
                          {a.title}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <span className={a.status === "publie" ? "text-signal" : "text-muted-foreground"}>
                          {STATUS_LABEL[a.status] ?? a.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                        {formatDateTime(a.updated_at)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {ctx.data?.canPublish ? (
                          <button
                            type="button"
                            className="text-xs text-muted-foreground hover:text-signal"
                            onClick={() => onDelete(a.id, a.title)}
                          >
                            Supprimer
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </NewsroomMain>
    </div>
  );
}


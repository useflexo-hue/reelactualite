import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { searchArticles } from "@/lib/search.functions";
import { ArticleCard } from "@/components/site/ArticleCard";
import type { ArticleCardData } from "@/lib/news-types";
import { absUrl, SITE_NAME } from "@/lib/site";

const PAGE_SIZE = 12;

type SearchParams = { q?: string | undefined; page?: number | undefined };

export const Route = createFileRoute("/recherche")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: typeof search.q === "string" ? search.q.slice(0, 120) : undefined,
    page: Number(search.page) > 1 ? Math.min(50, Math.round(Number(search.page))) : undefined,
  }),
  loaderDeps: ({ search }) => ({ q: search.q ?? "", page: search.page ?? 1 }),
  loader: ({ deps }) => searchArticles({ data: deps }),
  head: ({ loaderData }) => {
    const q = loaderData?.q ?? "";
    const title = q ? `Recherche : ${q} — ${SITE_NAME}` : `Rechercher un article — ${SITE_NAME}`;
    const description = q
      ? `Résultats de recherche pour « ${q} » sur ${SITE_NAME}.`
      : `Recherchez dans toutes les actualités publiées par ${SITE_NAME}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "noindex, follow" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: absUrl("/recherche") },
      ],
      links: [{ rel: "canonical", href: absUrl("/recherche") }],
    };
  },
  errorComponent: () => (
    <main className="mx-auto max-w-[1200px] px-4 py-12">
      <p className="text-sm text-muted-foreground">La recherche est momentanément indisponible.</p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="mx-auto max-w-[1200px] px-4 py-12">
      <p className="text-sm text-muted-foreground">Page introuvable.</p>
    </main>
  ),
  component: SearchPage,
});

function SearchPage() {
  const data = Route.useLoaderData();
  const navigate = Route.useNavigate();
  const [value, setValue] = useState(data.q);
  const pages = Math.ceil(data.total / PAGE_SIZE);

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-8">
      <h1 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">Rechercher</h1>

      <form
        role="search"
        className="mt-4 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void navigate({ search: { q: value.trim() || undefined } });
        }}
      >
        <label htmlFor="q" className="sr-only">
          Votre recherche
        </label>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            id="q"
            name="q"
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Mot-clé, personnalité, ville…"
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="submit"
          className="shrink-0 rounded-full bg-signal px-5 py-2.5 font-sans text-sm font-bold text-signal-foreground transition-opacity hover:opacity-90"
        >
          Chercher
        </button>
      </form>

      <p className="mt-4 font-sans text-sm text-muted-foreground" aria-live="polite">
        {data.q.length < 2
          ? "Saisissez au moins deux caractères."
          : `${data.total} résultat${data.total > 1 ? "s" : ""} pour « ${data.q} »`}
      </p>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.results.map((article: ArticleCardData) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>

      {pages > 1 ? (
        <nav className="mt-10 flex flex-wrap items-center gap-2" aria-label="Pagination">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              to="/recherche"
              search={{ q: data.q, page: p > 1 ? p : undefined }}
              className={`min-h-11 min-w-11 rounded-md border px-3 py-2 text-center font-sans text-sm ${
                p === data.page
                  ? "border-signal bg-signal text-signal-foreground"
                  : "border-border text-foreground"
              }`}
            >
              {p}
            </Link>
          ))}
        </nav>
      ) : null}
    </main>
  );
}

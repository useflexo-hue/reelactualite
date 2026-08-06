import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getCategoryFeed } from "@/lib/news.functions";
import type { ArticleCardData, CategoryItem } from "@/lib/news-types";
import { ArticleCard } from "@/components/site/ArticleCard";
import { absUrl } from "@/lib/site";

type FeedData = {
  category: CategoryItem | null;
  articles: ArticleCardData[];
  page: number;
  pageCount: number;
  total: number;
};

export const Route = createFileRoute("/category/$slug")({
  validateSearch: (search: Record<string, unknown>) => {
    const raw = Math.trunc(Number(search.page ?? 1));
    const page = Number.isFinite(raw) && raw > 1 ? Math.min(raw, 100) : 1;
    return page > 1 ? { page } : {};
  },
  loaderDeps: ({ search }) => ({ page: (search as { page?: number }).page ?? 1 }),
  loader: async ({ params, deps }) => {
    const res = (await getCategoryFeed({
      data: { slug: params.slug, page: deps.page },
    })) as FeedData;
    if (!res.category) throw notFound();
    return res;
  },
  head: ({ params, loaderData }) => {
    const data = loaderData as FeedData | undefined;
    const name = data?.category?.name;
    if (!name) {
      return {
        meta: [{ title: "Rubrique introuvable — ReelActu" }, { name: "robots", content: "noindex" }],
      };
    }
    const page = data?.page ?? 1;
    const pageCount = data?.pageCount ?? 1;
    const suffix = page > 1 ? ` — page ${page}` : "";
    const title = `${name} — Actualités et reportages${suffix} | ReelActu`;
    const description = `Toute l'actualité ${name} : dépêches, reportages et analyses vérifiés par la rédaction de ReelActu.`;
    const base = `/category/${params.slug}`;
    const pageUrl = (p: number) => absUrl(p > 1 ? `${base}?page=${p}` : base);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: pageUrl(page) },
      ],
      links: [
        { rel: "canonical", href: pageUrl(page) },
        ...(page > 1 ? [{ rel: "prev", href: pageUrl(page - 1) }] : []),
        ...(page < pageCount ? [{ rel: "next", href: pageUrl(page + 1) }] : []),
      ],
    };
  },
  notFoundComponent: CategoryNotFound,
  errorComponent: CategoryNotFound,
  component: CategoryPage,
});


function CategoryNotFound() {
  return (
    <div className="mx-auto max-w-[680px] px-4 py-24 text-center">
      <p className="kicker">Erreur 404</p>
      <h1 className="mt-2 text-3xl">Rubrique introuvable</h1>
      <Link to="/" className="mt-6 inline-block font-sans text-sm font-semibold text-signal">
        Retour à la une
      </Link>
    </div>
  );
}

function CategoryPage() {
  const { category, articles, page, pageCount } = Route.useLoaderData() as FeedData;
  const params = Route.useParams();
  const isFirstPage = page <= 1;
  const [lead, ...rest] = articles;
  const grid = isFirstPage ? rest : articles;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8">
      <header className="rule-heavy pb-3">
        <p className="kicker-muted">Rubrique</p>
        <h1 className="mt-1 text-3xl">{category?.name}</h1>
        {pageCount > 1 ? (
          <p className="mt-1 font-sans text-xs text-muted-foreground">
            Page {page} sur {pageCount}
          </p>
        ) : null}
      </header>

      {articles.length === 0 ? (
        <p className="py-16 text-center font-sans text-sm text-muted-foreground">
          Aucun article publié dans cette rubrique pour le moment.
        </p>
      ) : (
        <div className="mt-6">
          {isFirstPage && lead ? <ArticleCard article={lead} variant="lead" priority /> : null}
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {grid.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        </div>
      )}

      {pageCount > 1 ? (
        <nav
          aria-label="Pagination"
          className="mt-12 flex items-center justify-between border-t border-border pt-6 font-sans text-sm"
        >
          {page > 1 ? (
            <Link
              to="/category/$slug"
              params={{ slug: params.slug }}
              search={page - 1 > 1 ? { page: page - 1 } : {}}
              rel="prev"
              className="font-semibold text-signal"
            >
              ← Page précédente
            </Link>
          ) : (
            <span />
          )}
          {page < pageCount ? (
            <Link
              to="/category/$slug"
              params={{ slug: params.slug }}
              search={{ page: page + 1 }}
              rel="next"
              className="font-semibold text-signal"
            >
              Page suivante →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}


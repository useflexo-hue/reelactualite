import { createServerFn } from "@tanstack/react-start";
import type { ArticleCardData, ArticleFull, CategoryItem, HomeData } from "./news-types";

const CARD_SELECT =
  "slug,title,dek,cover_url,published_at,location,reading_minutes,is_breaking,category:categories!articles_category_id_fkey(slug,name),author:authors(slug,display_name,avatar_url,twitter)";

const CARD_SELECT_INNER = CARD_SELECT.replace("categories!articles_category_id_fkey(", "categories!articles_category_id_fkey!inner(");

const SECTION_SLUGS = [
  "guerre-securite",
  "politique",
  "justice",
  "sante",
  "economie",
  "societe",
  "culture",
  "interviews",
  "afrique",
  "monde",
  "nord-kivu",
  "sud-kivu",
  "ituri",
];

export const getHomeData = createServerFn({ method: "GET" }).handler(async (): Promise<HomeData> => {
  const { publicDb } = await import("./public-db.server");
  const { logDirect, minutesSince, severityFor } = await import("./direct-monitor");
  const startedAt = Date.now();
  const db = publicDb();
  const nowIso = new Date().toISOString();

  const base = () =>
    db
      .from("articles")
      .select(CARD_SELECT)
      .eq("status", "publie")
      .lte("published_at", nowIso);

  const [cats, breaking, featured, latest, mostRead, mostShared] = await Promise.all([
    db.from("categories").select("slug,name,kind,position").order("position"),
    base().eq("is_breaking", true).order("published_at", { ascending: false }).limit(1),
    base().eq("is_featured", true).order("published_at", { ascending: false }).limit(4),
    base().order("published_at", { ascending: false }).limit(10),
    base().order("view_count", { ascending: false }).limit(5),
    base().order("share_count", { ascending: false }).limit(5),
  ]);

  // Diagnostic du fil direct : erreurs de requête, fraîcheur, volume.
  const queryErrors = Object.entries({
    categories: cats.error,
    breaking: breaking.error,
    featured: featured.error,
    latest: latest.error,
    mostRead: mostRead.error,
    mostShared: mostShared.error,
  })
    .filter(([, e]) => Boolean(e))
    .map(([k, e]) => `${k}: ${e?.message}`);

  const breakingRow = (breaking.data ?? [])[0] as { published_at?: string | null } | undefined;
  const latestRows = (latest.data ?? []) as { published_at?: string | null }[];
  const newestIso = breakingRow?.published_at ?? latestRows[0]?.published_at ?? null;
  const ageMinutes = minutesSince(newestIso);
  const tickerItems = latestRows.length;
  const severity = queryErrors.length ? "critical" : severityFor(ageMinutes, tickerItems);

  logDirect(severity === "ok" ? "info" : severity === "warn" ? "warn" : "error", "home_data", {
    severity,
    ticker_items: tickerItems,
    has_breaking: Boolean(breakingRow),
    newest_published_at: newestIso,
    age_minutes: ageMinutes,
    query_errors: queryErrors,
    duration_ms: Date.now() - startedAt,
  });


  const { articlesForCategory } = await import("./category-feed.server");

  const sections = await Promise.all(
    SECTION_SLUGS.map(async (slug) => {
      const cat = (cats.data ?? []).find((c) => c.slug === slug);
      const articles = await articlesForCategory(db, {
        slug,
        nowIso,
        limit: 3,
        select: CARD_SELECT,
      });
      return { slug, name: cat?.name ?? slug, articles };
    }),
  );


  return {
    categories: (cats.data ?? []) as CategoryItem[],
    breaking: ((breaking.data ?? [])[0] as unknown as ArticleCardData) ?? null,
    featured: (featured.data ?? []) as unknown as ArticleCardData[],
    latest: (latest.data ?? []) as unknown as ArticleCardData[],
    mostRead: (mostRead.data ?? []) as unknown as ArticleCardData[],
    mostShared: (mostShared.data ?? []) as unknown as ArticleCardData[],
    sections: sections.filter((s) => s.articles.length > 0),
  };
});

export const getCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<CategoryItem[]> => {
    const { publicDb } = await import("./public-db.server");
    const db = publicDb();
    const { data } = await db.from("categories").select("slug,name,kind,position").order("position");
    return (data ?? []) as CategoryItem[];
  },
);

export type ArticleNeighbor = { slug: string; title: string } | null;

export const getArticle = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => ({ slug: String(data.slug).slice(0, 200) }))
  .handler(
    async ({
      data,
    }): Promise<{
      article: ArticleFull | null;
      related: ArticleCardData[];
      prev: ArticleNeighbor;
      next: ArticleNeighbor;
    }> => {
      const { publicDb } = await import("./public-db.server");
      const db = publicDb();
      const nowIso = new Date().toISOString();

      const { data: rows } = await db
        .from("articles")
        .select(
          "id,slug,title,dek,body,cover_url,cover_credit,published_at,location,reading_minutes,is_breaking,seo_title,seo_description,view_count,share_count,category:categories!articles_category_id_fkey(slug,name),author:authors(slug,display_name,role_label,bio,city,avatar_url,twitter),article_tags(tags(slug,name))",
        )
        .eq("slug", data.slug)
        .eq("status", "publie")
        .lte("published_at", nowIso)
        .limit(1);

      const row = (rows ?? [])[0] as Record<string, unknown> | undefined;
      if (!row) return { article: null, related: [], prev: null, next: null };

      const tags = ((row.article_tags as { tags: { slug: string; name: string } | null }[]) ?? [])
        .map((t) => t.tags)
        .filter((t): t is { slug: string; name: string } => Boolean(t));

      const article = { ...row, tags } as unknown as ArticleFull;

      const catSlug = article.category?.slug;
      let related: ArticleCardData[] = [];
      if (catSlug) {
        const { data: rel } = await db
          .from("articles")
          .select(CARD_SELECT_INNER)
          .eq("status", "publie")
          .lte("published_at", nowIso)
          .neq("slug", data.slug)
          .eq("categories.slug", catSlug)
          .order("published_at", { ascending: false })
          .limit(4);
        related = ((rel ?? []) as unknown as ArticleCardData[]).filter(
          (a) => a.category?.slug === catSlug,
        );
      }

      // Article précédent (plus ancien) et suivant (plus récent) par date de publication
      const pubAt = (article.published_at as string | null) ?? nowIso;
      const [{ data: olderRows }, { data: newerRows }] = await Promise.all([
        db
          .from("articles")
          .select("slug,title")
          .eq("status", "publie")
          .lt("published_at", pubAt)
          .order("published_at", { ascending: false })
          .limit(1),
        db
          .from("articles")
          .select("slug,title")
          .eq("status", "publie")
          .gt("published_at", pubAt)
          .lte("published_at", nowIso)
          .order("published_at", { ascending: true })
          .limit(1),
      ]);

      const prev = ((olderRows ?? [])[0] as ArticleNeighbor) ?? null;
      const next = ((newerRows ?? [])[0] as ArticleNeighbor) ?? null;

      return { article, related, prev, next };
    },
  );


export const getCategoryFeed = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string; page?: number }) => ({
    slug: String(data.slug).slice(0, 200),
    page: Math.min(Math.max(Math.trunc(Number(data.page ?? 1)) || 1, 1), 100),
  }))
  .handler(
    async ({
      data,
    }): Promise<{
      category: CategoryItem | null;
      articles: ArticleCardData[];
      page: number;
      pageCount: number;
      total: number;
    }> => {
      const { publicDb } = await import("./public-db.server");
      const db = publicDb();
      const nowIso = new Date().toISOString();

      const { data: cats } = await db
        .from("categories")
        .select("id,slug,name,kind,position")
        .eq("slug", data.slug)
        .limit(1);
      const row = ((cats ?? [])[0] as (CategoryItem & { id: string }) | undefined) ?? null;
      if (!row) return { category: null, articles: [], page: 1, pageCount: 0, total: 0 };
      const { id, ...category } = row;

      const { articlesForCategory } = await import("./category-feed.server");
      const all = await articlesForCategory(db, {
        slug: data.slug,
        categoryId: id,
        nowIso,
        limit: 500,
        select: CARD_SELECT,
      });

      const total = all.length;
      const pageCount = Math.max(1, Math.ceil(total / 12));
      const page = Math.min(data.page, pageCount);
      const start = (page - 1) * 12;
      return {
        category,
        articles: all.slice(start, start + 12),
        page,
        pageCount,
        total,
      };
    },
  );


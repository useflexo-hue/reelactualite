import type { ArticleCardData } from "./news-types";

/**
 * Récupère les articles d'une rubrique en combinant :
 *  - la rubrique principale de l'article (`articles.category_id`)
 *  - les rubriques secondaires (`article_categories`), qui permettent à un même
 *    article d'apparaître par exemple à la fois en « Nord-Kivu » et en « Guerre & Sécurité ».
 */
export async function articlesForCategory(
  db: {
    from: (table: string) => any;
  },
  opts: { slug: string; categoryId?: string | null; nowIso: string; limit: number; select: string },
): Promise<ArticleCardData[]> {
  const { slug, nowIso, limit, select } = opts;

  let categoryId = opts.categoryId ?? null;
  if (!categoryId) {
    const { data } = await db.from("categories").select("id").eq("slug", slug).limit(1);
    categoryId = (data ?? [])[0]?.id ?? null;
  }

  const selectInner = select.replace("categories!articles_category_id_fkey(", "categories!articles_category_id_fkey!inner(");

  const primaryQuery = db
    .from("articles")
    .select(selectInner)
    .eq("status", "publie")
    .lte("published_at", nowIso)
    .eq("categories.slug", slug)
    .order("published_at", { ascending: false })
    .limit(limit);

  const linkQuery = categoryId
    ? db.from("article_categories").select("article_id").eq("category_id", categoryId).limit(500)
    : Promise.resolve({ data: [] as { article_id: string }[] });

  const [primaryRes, linkRes] = await Promise.all([primaryQuery, linkQuery]);

  const primary = ((primaryRes.data ?? []) as unknown as ArticleCardData[]).filter(
    (a) => a.category?.slug === slug,
  );

  const linkedIds = ((linkRes.data ?? []) as { article_id: string }[]).map((r) => r.article_id);

  let secondary: ArticleCardData[] = [];
  if (linkedIds.length > 0) {
    const { data } = await db
      .from("articles")
      .select(select)
      .eq("status", "publie")
      .lte("published_at", nowIso)
      .in("id", linkedIds)
      .order("published_at", { ascending: false })
      .limit(limit);
    secondary = (data ?? []) as unknown as ArticleCardData[];
  }

  const seen = new Set<string>();
  return [...primary, ...secondary]
    .filter((a) => {
      if (seen.has(a.slug)) return false;
      seen.add(a.slug);
      return true;
    })
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))
    .slice(0, limit);
}

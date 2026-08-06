import { createServerFn } from "@tanstack/react-start";
import type { ArticleCardData } from "./news-types";

/** Recherche plein texte publique (titre, chapô, corps) sur les articles publiés. */
export const searchArticles = createServerFn({ method: "GET" })
  .inputValidator((input: { q?: string; page?: number }) => ({
    q: (input?.q ?? "").trim().slice(0, 120),
    page: Math.max(1, Math.min(50, Math.round(input?.page ?? 1))),
  }))
  .handler(
    async ({
      data,
    }): Promise<{ q: string; page: number; total: number; results: ArticleCardData[] }> => {
      const { publicDb } = await import("./public-db.server");
      const { SEARCH_PAGE_SIZE, buildSearchFilter, SEARCH_SELECT } = await import(
        "./search.server"
      );

      if (data.q.length < 2) return { q: data.q, page: data.page, total: 0, results: [] };

      const db = publicDb();
      const from = (data.page - 1) * SEARCH_PAGE_SIZE;
      const { data: rows, count } = await db
        .from("articles")
        .select(SEARCH_SELECT, { count: "exact" })
        .eq("status", "publie")
        .lte("published_at", new Date().toISOString())
        .or(buildSearchFilter(data.q))
        .order("published_at", { ascending: false })
        .range(from, from + SEARCH_PAGE_SIZE - 1);

      return {
        q: data.q,
        page: data.page,
        total: count ?? 0,
        results: (rows ?? []) as unknown as ArticleCardData[],
      };
    },
  );

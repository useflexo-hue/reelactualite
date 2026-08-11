import { createServerFn } from "@tanstack/react-start";
import type { ArticleCardData } from "./news-types";

const CARD_SELECT =
  "slug,title,dek,cover_url,published_at,location,reading_minutes,is_breaking,category:categories!articles_category_id_fkey(slug,name),author:authors!articles_author_id_fkey(slug,display_name,avatar_url,twitter)";

function toDateRange(isoDate: string) {
  const parts = isoDate.split("-").map((v) => parseInt(v, 10));
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 0;
  const day = parts[2] ?? 0;
  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));
  return { start: start.toISOString(), end: end.toISOString() };
}

export const getArticlesByDate = createServerFn({ method: "GET" })
  .inputValidator((data: { date: string }) => {
    const raw = String(data.date ?? "").trim();
    const normalized =
      raw.length === 0 ? new Date().toISOString().slice(0, 10) : raw.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      throw new Error("Format de date invalide");
    }
    return { date: normalized };
  })
  .handler(async ({ data }): Promise<{ date: string; articles: ArticleCardData[] }> => {
    const { publicDb } = await import("./public-db.server");
    const db = publicDb();
    const nowIso = new Date().toISOString();
    const { start, end } = toDateRange(data.date);

    const { data: rows, error } = await db
      .from("articles")
      .select(CARD_SELECT)
      .eq("status", "publie")
      .gte("published_at", start)
      .lt("published_at", end)
      .lte("published_at", nowIso)
      .order("published_at", { ascending: false });

    if (error) {
      throw new Error(`Erreur de récupération des articles : ${error.message}`);
    }

    return { date: data.date, articles: (rows ?? []) as unknown as ArticleCardData[] };
  });

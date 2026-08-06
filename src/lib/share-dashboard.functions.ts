import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const SHARE_NETWORKS = ["facebook", "x", "whatsapp", "telegram", "copy_link"] as const;
export type ShareNetwork = (typeof SHARE_NETWORKS)[number];

export type ShareArticleRow = {
  slug: string;
  title: string | null;
  total: number;
  by_network: Record<string, number>;
};

export type ShareDashboard = {
  range_days: number;
  range_start: string;
  range_end: string;
  network: string;
  total: number;
  by_network: { network: string; count: number }[];
  by_day: { day: string; total: number }[];
  articles: ShareArticleRow[];
};

const clampDays = (v: unknown): number => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 30;
  return Math.max(1, Math.min(366, Math.round(n)));
};

export const getShareDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days?: number; network?: string } | undefined) => ({
    days: clampDays(input?.days ?? 30),
    network:
      input?.network && (SHARE_NETWORKS as readonly string[]).includes(input.network)
        ? input.network
        : "all",
  }))
  .handler(async ({ data, context }): Promise<ShareDashboard> => {
    const end = new Date();
    const start = new Date(end.getTime() - data.days * 24 * 60 * 60 * 1000);

    let query = context.supabase
      .from("share_events")
      .select("article_slug,network,created_at")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: false })
      .limit(5000);

    if (data.network !== "all") query = query.eq("network", data.network);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const events = rows ?? [];

    const netCounts = new Map<string, number>();
    const dayCounts = new Map<string, number>();
    const perArticle = new Map<string, { total: number; by_network: Record<string, number> }>();

    for (const e of events) {
      netCounts.set(e.network, (netCounts.get(e.network) ?? 0) + 1);
      const day = String(e.created_at).slice(0, 10);
      dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
      const a = perArticle.get(e.article_slug) ?? { total: 0, by_network: {} };
      a.total += 1;
      a.by_network[e.network] = (a.by_network[e.network] ?? 0) + 1;
      perArticle.set(e.article_slug, a);
    }

    // Titres des articles concernés
    const slugs = [...perArticle.keys()].slice(0, 200);
    const titles = new Map<string, string>();
    if (slugs.length) {
      const { data: arts } = await context.supabase
        .from("articles")
        .select("slug,title")
        .in("slug", slugs);
      for (const a of arts ?? []) titles.set(a.slug, a.title);
    }

    const by_day: { day: string; total: number }[] = [];
    for (let i = data.days - 1; i >= 0; i--) {
      const d = new Date(end.getTime() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      by_day.push({ day: d, total: dayCounts.get(d) ?? 0 });
    }

    return {
      range_days: data.days,
      range_start: start.toISOString(),
      range_end: end.toISOString(),
      network: data.network,
      total: events.length,
      by_network: (data.network === "all" ? SHARE_NETWORKS : [data.network as ShareNetwork]).map(
        (n) => ({ network: n, count: netCounts.get(n) ?? 0 }),
      ),
      by_day,
      articles: [...perArticle.entries()]
        .map(([slug, v]) => ({
          slug,
          title: titles.get(slug) ?? null,
          total: v.total,
          by_network: v.by_network,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 50),
    };
  });

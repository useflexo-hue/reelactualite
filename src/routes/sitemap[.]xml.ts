import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";

/** Doit rester aligné avec la pagination de src/routes/category.$slug.tsx. */
const CATEGORY_PAGE_SIZE = 12;

type SitemapEntry = { loc: string; lastmod?: string; changefreq?: string; priority?: string };

function toXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((e) =>
      [
        "<url>",
        `<loc>${e.loc}</loc>`,
        e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : "",
        e.changefreq ? `<changefreq>${e.changefreq}</changefreq>` : "",
        e.priority ? `<priority>${e.priority}</priority>` : "",
        "</url>",
      ].join(""),
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { publicDb } = await import("@/lib/public-db.server");
        const db = publicDb();
        const nowIso = new Date().toISOString();

        const [articlesRes, catsRes, linksRes] = await Promise.all([
          db
            .from("articles")
            .select("id,slug,updated_at,published_at,category_id")
            .eq("status", "publie")
            .lte("published_at", nowIso)
            .order("published_at", { ascending: false })
            .limit(2000),
          db.from("categories").select("id,slug"),
          db.from("article_categories").select("article_id,category_id").limit(5000),
        ]);

        const articles = (articlesRes.data ?? []) as {
          id: string;
          slug: string;
          updated_at: string | null;
          published_at: string | null;
          category_id: string | null;
        }[];
        const cats = (catsRes.data ?? []) as { id: string; slug: string }[];
        const links = (linksRes.data ?? []) as { article_id: string; category_id: string }[];

        const publishedIds = new Set(articles.map((a) => a.id));

        // Nombre d'articles publiés par rubrique (principale + secondaire),
        // afin d'exclure du sitemap les rubriques vides (contenu pauvre).
        const perCategory = new Map<string, Set<string>>();
        const add = (categoryId: string | null, articleId: string) => {
          if (!categoryId) return;
          const set = perCategory.get(categoryId) ?? new Set<string>();
          set.add(articleId);
          perCategory.set(categoryId, set);
        };
        for (const a of articles) add(a.category_id, a.id);
        for (const l of links) if (publishedIds.has(l.article_id)) add(l.category_id, l.article_id);

        const entries: SitemapEntry[] = [
          { loc: `${SITE_URL}/`, changefreq: "hourly", priority: "1.0" },
          { loc: `${SITE_URL}/a-propos`, changefreq: "monthly", priority: "0.5" },
        ];

        for (const c of cats) {
          const count = perCategory.get(c.id)?.size ?? 0;
          if (count === 0) continue;
          entries.push({
            loc: `${SITE_URL}/category/${c.slug}`,
            changefreq: "hourly",
            priority: "0.7",
          });
          const pages = Math.ceil(count / CATEGORY_PAGE_SIZE);
          for (let p = 2; p <= pages; p += 1) {
            entries.push({
              loc: `${SITE_URL}/category/${c.slug}?page=${p}`,
              changefreq: "daily",
              priority: "0.4",
            });
          }
        }

        for (const a of articles) {
          entries.push({
            loc: `${SITE_URL}/${a.slug}`,
            // lastmod uniquement quand la base fournit une date propre à la page.
            ...(a.updated_at ? { lastmod: new Date(a.updated_at).toISOString() } : {}),
            priority: "0.8",
          });
        }

        return new Response(toXml(entries), {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=600",
          },
        });
      },
    },
  },
});

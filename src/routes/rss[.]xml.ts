import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL, SITE_NAME } from "@/lib/site";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Flux RSS 2.0 des derniers articles publiés (Google News, agrégateurs). */
export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { publicDb } = await import("@/lib/public-db.server");
        const nowIso = new Date().toISOString();
        const { data } = await publicDb()
          .from("articles")
          .select("slug,title,dek,published_at,cover_url")
          .eq("status", "publie")
          .lte("published_at", nowIso)
          .order("published_at", { ascending: false })
          .limit(50);

        const rows = (data ?? []) as {
          slug: string;
          title: string;
          dek: string | null;
          published_at: string | null;
          cover_url: string | null;
        }[];

        const items = rows
          .map((a) => {
            const link = `${SITE_URL}/${a.slug}`;
            const pub = a.published_at ? new Date(a.published_at).toUTCString() : "";
            const image = a.cover_url
              ? a.cover_url.startsWith("http")
                ? a.cover_url
                : `${SITE_URL}${a.cover_url}`
              : null;
            return [
              "<item>",
              `<title>${esc(a.title)}</title>`,
              `<link>${esc(link)}</link>`,
              `<guid isPermaLink="true">${esc(link)}</guid>`,
              a.dek ? `<description>${esc(a.dek)}</description>` : "",
              pub ? `<pubDate>${pub}</pubDate>` : "",
              image ? `<enclosure url="${esc(image)}" type="image/jpeg" />` : "",
              "</item>",
            ].join("");
          })
          .join("");

        const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${esc(
          SITE_NAME,
        )} — L'information Réelle</title><link>${SITE_URL}</link><description>Actualité de la République démocratique du Congo et d'Afrique.</description><language>fr</language><lastBuildDate>${new Date().toUTCString()}</lastBuildDate><atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />${items}</channel></rss>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=600",
          },
        });
      },
    },
  },
});

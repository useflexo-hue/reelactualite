import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";

/**
 * robots.txt unique du site (aucun fichier statique concurrent dans /public).
 * Autorise l'indexation publique, bloque les espaces techniques et privés,
 * et déclare le plan de site.
 */
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const host = new URL(request.url).hostname;
        // Les environnements de prévisualisation et de développement ne
        // doivent jamais être indexés ; tout autre domaine (domaine canonique
        // ou domaine personnalisé) l'est.
        const isIndexable =
          origin === SITE_URL ||
          (!host.includes("id-preview--") &&
            !host.endsWith("localhost") &&
            host !== "127.0.0.1" &&
            !host.endsWith(".lovableproject.com"));

        const disallow = ["/redaction", "/auth", "/api/"];

        const body = isIndexable
          ? [
              "User-agent: *",
              "Allow: /",
              ...disallow.map((p) => `Disallow: ${p}`),
              "",
              "User-agent: Googlebot",
              "Allow: /",
              ...disallow.map((p) => `Disallow: ${p}`),
              "",
              "User-agent: Googlebot-News",
              "Allow: /",
              "",
              "User-agent: Bingbot",
              "Allow: /",
              ...disallow.map((p) => `Disallow: ${p}`),
              "",
              "User-agent: Twitterbot",
              "Allow: /",
              "",
              "User-agent: facebookexternalhit",
              "Allow: /",
              "",
              `Sitemap: ${SITE_URL}/sitemap.xml`,
              "",
            ].join("\n")
          : // Environnements de prévisualisation : jamais indexés.
            ["User-agent: *", "Disallow: /", ""].join("\n");

        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});

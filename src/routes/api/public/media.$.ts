import { createFileRoute } from "@tanstack/react-router";

/**
 * Proxy public d'images stockées dans le bucket privé `article-images`.
 * Gère automatiquement le redimensionnement et la conversion (WebP) via
 * les transformations d'images du stockage.
 *
 * /api/public/media/<chemin>?w=800&q=75
 */
export const Route = createFileRoute("/api/public/media/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const path = (params as { _splat?: string })._splat ?? "";
        if (!path || path.includes("..")) {
          return new Response("Not found", { status: 404 });
        }

        const url = new URL(request.url);
        const w = Number(url.searchParams.get("w") ?? 0);
        const q = Number(url.searchParams.get("q") ?? 0);

        try {
          const { publicDb } = await import("@/lib/public-db.server");

          const transform =
            w > 0
              ? {
                  width: Math.min(Math.max(Math.round(w), 32), 2400),
                  quality: q > 0 ? Math.min(Math.max(Math.round(q), 20), 100) : 78,
                  resize: "contain" as const,
                }
              : undefined;

          const { data, error } = await publicDb()
            .storage.from("article-images")
            .createSignedUrl(path, 60 * 10, transform ? { transform } : undefined);

          if (error || !data?.signedUrl) {
            return new Response("Not found", { status: 404 });
          }

          const upstream = await fetch(data.signedUrl);
          if (!upstream.ok || !upstream.body) {
            return new Response("Not found", { status: 404 });
          }

          return new Response(upstream.body, {
            status: 200,
            headers: {
              "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        } catch {
          return new Response("Erreur média", { status: 500 });
        }
      },
    },
  },
});

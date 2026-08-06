import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { resolveLegacyPath } from "./lib/legacy-redirects";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// Redirections 301 des anciennes URL WordPress (actives dès la bascule DNS).
// Traite ici les cas résolubles sans base de données ; les slugs d'articles
// sont gérés par la route attrape-tout src/routes/$.tsx.
const legacyRedirectMiddleware = createMiddleware().server(async ({ next, request }) => {
  const req = request as Request | undefined;
  if (req && (req.method === "GET" || req.method === "HEAD")) {
    const url = new URL(req.url);
    const accepts = req.headers.get("accept") ?? "";
    const isDocument = accepts.includes("text/html") || accepts === "" || accepts === "*/*";
    if (isDocument && !url.pathname.startsWith("/api/") && !url.pathname.startsWith("/_serverFn")) {
      const permanent = (to: string) =>
        new Response(null, {
          status: 301,
          headers: { location: to, "cache-control": "public, max-age=3600" },
        });

      // Slash final hérité de WordPress : URL canonique sans slash.
      if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
        return permanent(`${url.pathname.replace(/\/+$/, "")}${url.search}`);
      }

      const resolution = resolveLegacyPath(url.pathname, url.search);
      if (resolution?.kind === "redirect") {
        if (resolution.to !== url.pathname) return permanent(`${resolution.to}${url.search}`);
        // Même chemin : on ne nettoie que les anciens paramètres WordPress,
        // jamais les paramètres légitimes du nouveau site (ex. ?page=2).
        const legacyParams = ["p", "page_id", "cat", "s", "replytocom", "preview"];
        const params = new URLSearchParams(url.search);
        if (legacyParams.some((k) => params.has(k))) return permanent(resolution.to);
      }

    }

  }
  return await next();
});


const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, legacyRedirectMiddleware, csrfMiddleware],
}));

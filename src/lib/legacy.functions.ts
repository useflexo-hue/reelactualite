import { createServerFn } from "@tanstack/react-start";

/**
 * Résout un ancien chemin WordPress vers l'URL correspondante du nouveau site.
 * Retourne `null` quand aucune correspondance n'existe (vraie 404).
 */
export const resolveLegacyUrl = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => {
    const d = data as { path?: unknown; search?: unknown };
    return {
      path: typeof d?.path === "string" ? d.path : "/",
      search: typeof d?.search === "string" ? d.search : "",
    };
  })
  .handler(async ({ data }): Promise<{ to: string | null }> => {
    const { resolveLegacyPath, slugCandidates } = await import("./legacy-redirects");
    const resolution = resolveLegacyPath(data.path, data.search);
    if (!resolution) return { to: null };
    if (resolution.kind === "redirect") return { to: resolution.to };

    const { publicDb } = await import("./public-db.server");
    const db = publicDb();
    const candidates = slugCandidates(resolution.slug);

    const exact = await db
      .from("articles")
      .select("slug")
      .eq("status", "publie")
      .in("slug", candidates)
      .limit(1);
    const found = (exact.data ?? [])[0] as { slug?: string } | undefined;
    if (found?.slug) return { to: `/${found.slug}` };

    // Rapprochement souple : même début de slug (suffixes WordPress, titres tronqués).
    const stem = candidates[candidates.length - 1] ?? resolution.slug;
    if (stem.length >= 12) {
      const like = await db
        .from("articles")
        .select("slug")
        .eq("status", "publie")
        .like("slug", `${stem}%`)
        .limit(1);
      const near = (like.data ?? [])[0] as { slug?: string } | undefined;
      if (near?.slug) return { to: `/${near.slug}` };
    }

    return { to: "/" };
  });

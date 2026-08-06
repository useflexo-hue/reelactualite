/**
 * Domaine canonique du site. Toutes les URL absolues (canonical, og:url,
 * données structurées, sitemap) doivent en découler.
 */
export const SITE_URL = "https://reelactu-afrique-prime.lovable.app";

export const SITE_NAME = "ReelActu";

/** Transforme un chemin interne en URL absolue canonique. */
export function absUrl(path: string): string {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

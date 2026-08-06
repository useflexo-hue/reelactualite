/**
 * Redirections 301 depuis l'ancien site WordPress (reelactu.com) vers le
 * nouveau site. Actives dès la bascule DNS : le nouveau serveur répond alors
 * à toutes les anciennes URL.
 *
 * Fonction pure (aucun accès base de données) pour rester exécutable dans le
 * middleware de requête, avant tout rendu.
 */

/** Anciennes rubriques WordPress -> rubriques du nouveau site. */
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  nation: "rdc",
  "securite-justice": "guerre-securite",
  "interview-reportage": "interviews",
  "opinions-debats": "opinions",
  "non-categorise": "rdc",
  actualites: "rdc",
  actualite: "rdc",
  politique: "politique",
  economie: "economie",
  monde: "monde",
  afrique: "afrique",
  culture: "culture",
  sport: "sport",
  sante: "sante",
  justice: "justice",
  videos: "videos",
  photos: "photos",
  podcasts: "podcasts",
  environnement: "environnement",
};

/** Chemins techniques WordPress qui n'ont plus d'équivalent. */
const WP_SYSTEM_PREFIXES = [
  "/wp-admin",
  "/wp-login.php",
  "/wp-signup.php",
  "/wp-register.php",
  "/xmlrpc.php",
];

const DATE_ARCHIVE = /^\/(19|20)\d{2}(\/\d{1,2})?(\/\d{1,2})?$/;
const DATED_POST = /^\/(19|20)\d{2}\/\d{1,2}(\/\d{1,2})?\/([^/]+)$/;

function stripSuffixes(pathname: string): string {
  let p = pathname;
  // /article/amp, /article/amp/, /article/feed, /article/print
  p = p.replace(/\/(amp|feed|print|embed|trackback|comment-page-\d+)$/i, "");
  // pagination WordPress : /rubrique/page/3
  p = p.replace(/\/page\/\d+$/i, "");
  return p || "/";
}

export type LegacyResolution =
  /** Redirection certaine, applicable sans consulter la base. */
  | { kind: "redirect"; to: string }
  /** Slug d'article potentiel : à vérifier en base avant de rediriger. */
  | { kind: "article"; slug: string }
  /** Rien à faire : laisser le routeur répondre normalement. */
  | null;

/**
 * @param pathname chemin de la requête (sans query string)
 * @param search   query string brute, ex. "?p=123"
 */
export function resolveLegacyPath(pathname: string, search = ""): LegacyResolution {
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;

  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);

  // Fichiers et endpoints WordPress : rien à récupérer.
  if (
    pathname.startsWith("/wp-content") ||
    pathname.startsWith("/wp-includes") ||
    pathname.startsWith("/wp-json")
  ) {
    return null;
  }
  if (WP_SYSTEM_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return { kind: "redirect", to: "/auth" };
  }

  // Anciens permaliens « ?p=123 » / « ?page_id=12 » : la correspondance par
  // identifiant n'existe plus, on renvoie vers la une.
  if (pathname === "/" || pathname === "") {
    if (params.has("p") || params.has("page_id") || params.has("cat") || params.has("s")) {
      return { kind: "redirect", to: "/" };
    }
    return null;
  }

  // Normalisation : slash final, /amp, /feed, /page/N.
  const withoutSlash = pathname.replace(/\/+$/, "");
  const cleaned = stripSuffixes(withoutSlash);

  if (cleaned === "" || cleaned === "/") return { kind: "redirect", to: "/" };

  const segments = cleaned.slice(1).split("/");

  // Flux RSS WordPress.
  if (segments[0] === "feed" || segments[0] === "comments") {
    return { kind: "redirect", to: "/" };
  }

  // Plans de site WordPress / Yoast.
  if (/^(wp-)?sitemap(_index)?(\.xml)?$/.test(segments[0] ?? "") && segments.length === 1) {
    return { kind: "redirect", to: "/sitemap.xml" };
  }

  // Rubriques.
  if (segments[0] === "category" || segments[0] === "rubrique") {
    const old = segments[segments.length - 1] ?? "";
    const mapped = LEGACY_CATEGORY_MAP[old] ?? old;
    return { kind: "redirect", to: mapped ? `/category/${mapped}` : "/" };
  }

  // Mots-clés -> rubrique équivalente si connue, sinon la une.
  if (segments[0] === "tag" || segments[0] === "etiquette") {
    const old = segments[1] ?? "";
    const mapped = LEGACY_CATEGORY_MAP[old];
    return { kind: "redirect", to: mapped ? `/category/${mapped}` : "/" };
  }

  // Auteurs et archives datées.
  if (segments[0] === "author" || segments[0] === "auteur") {
    return { kind: "redirect", to: "/" };
  }
  if (DATE_ARCHIVE.test(cleaned)) {
    return { kind: "redirect", to: "/" };
  }

  // Permaliens datés : /2025/07/13/mon-article -> /mon-article
  const dated = DATED_POST.exec(cleaned);
  if (dated?.[3]) {
    return { kind: "article", slug: decodeURIComponent(dated[3]) };
  }

  // Ancien slug de rubrique servi à la racine (/nation, /securite-justice…).
  if (LEGACY_CATEGORY_MAP[segments[0] ?? ""]) {
    return { kind: "redirect", to: `/category/${LEGACY_CATEGORY_MAP[segments[0]!]}` };
  }

  // Slug simple : on ne redirige que si l'URL a été normalisée (slash final,
  // /amp, pagination…), sinon le routeur gère déjà la page.
  if (segments.length === 1) {
    if (cleaned !== pathname) return { kind: "article", slug: decodeURIComponent(segments[0]!) };
    return null;
  }

  // Chemin profond inconnu : on tente le dernier segment comme slug d'article.
  return { kind: "article", slug: decodeURIComponent(segments[segments.length - 1]!) };
}

/** Variantes de slug tolérées (suffixes WordPress -2, -3, accents…). */
export function slugCandidates(slug: string): string[] {
  const base = slug.toLowerCase().trim();
  const out = new Set<string>([base]);
  out.add(base.replace(/-\d+$/, ""));
  out.add(base.replace(/\.html?$/, ""));
  out.add(base.replace(/^\d{4}-\d{2}-\d{2}-/, ""));
  return [...out].filter(Boolean);
}

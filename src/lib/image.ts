/**
 * Prise en charge universelle des formats d'images.
 *
 * - Normalise n'importe quelle URL (relative, protocole manquant, http…)
 * - Détecte les formats vectoriels/animés (SVG, GIF) qui ne doivent pas être transformés
 * - Génère automatiquement un `srcSet` responsive pour les images stockées sur le site
 */

const RASTER_SKIP = /\.(svg|gif|avif)(\?|#|$)/i;

/** Formats acceptés en entrée (upload rédaction), y compris ceux du mobile. */
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/pjpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/bmp",
  "image/tiff",
  "image/x-icon",
  "image/heic",
  "image/heif",
  "image/svg+xml",
];

export const ACCEPT_ATTR =
  "image/*,.jpg,.jpeg,.png,.webp,.avif,.gif,.bmp,.tif,.tiff,.heic,.heif,.svg";

/** Placeholder utilisé quand une image est manquante ou cassée. */
export const IMAGE_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="100%" height="100%" fill="#e7e5e4"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="48" fill="#a8a29e">ReelActu</text></svg>`,
  );

/**
 * Préfixe historique des médias hébergés par le CDN interne de Lovable
 * (images importées via l'éditeur Lovable avant la migration vers le bucket
 * Supabase `article-images`). Ces chemins sont stockés en base sous forme
 * relative (ex. `/__l5e/assets-v1/…`) mais n'existent que sur le domaine
 * Lovable d'origine : ils doivent donc rester absolus vers ce domaine plutôt
 * que d'être résolus contre l'origine du site auto-hébergé.
 */
const LOVABLE_ASSET_PREFIX = "/__l5e/";
const LOVABLE_ASSET_ORIGIN = "https://reelactu-afrique-prime.lovable.app";

/** Nettoie et sécurise une URL d'image, quelle que soit sa provenance. */
export function normalizeImageUrl(src?: string | null): string | null {
  if (!src) return null;
  const raw = src.trim();
  if (!raw) return null;
  if (raw.startsWith("data:") || raw.startsWith("blob:")) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith(LOVABLE_ASSET_PREFIX)) return `${LOVABLE_ASSET_ORIGIN}${raw}`;
  if (raw.startsWith("/")) return raw;
  if (/^https?:\/\//i.test(raw)) return raw.replace(/^http:\/\//i, "https://");
  return `https://${raw}`;
}

/** Vrai si l'image est servie par notre propre proxy média (transformable). */
export function isInternalMedia(url: string): boolean {
  return url.startsWith("/api/public/media/");
}

export function mediaUrl(path: string): string {
  return `/api/public/media/${path.split("/").map(encodeURIComponent).join("/")}`;
}

const WIDTHS = [400, 640, 800, 1200, 1600, 2000];

/** Construit un srcSet responsive quand c'est possible, sinon null. */
export function buildSrcSet(url: string, maxWidth: number): string | null {
  if (RASTER_SKIP.test(url) || !isInternalMedia(url)) return null;
  const widths = WIDTHS.filter((w) => w <= maxWidth * 2);
  if (widths.length === 0) return null;
  return widths.map((w) => `${url}${url.includes("?") ? "&" : "?"}w=${w} ${w}w`).join(", ");
}

export function sizedUrl(url: string, width: number): string {
  if (RASTER_SKIP.test(url) || !isInternalMedia(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}w=${width}`;
}

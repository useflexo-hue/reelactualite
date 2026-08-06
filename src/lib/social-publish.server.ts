/**
 * Diffusion automatique des articles sur les réseaux sociaux.
 * Chaque réseau est un adaptateur indépendant : si ses identifiants ne sont pas
 * encore configurés, la diffusion est « ignorée » avec une explication claire
 * plutôt que de faire échouer la publication de l'article.
 */

export type SocialTarget = "linkedin" | "facebook" | "x" | "telegram";

export type PublishOutcome = {
  platform: SocialTarget;
  status: "sent" | "failed" | "skipped";
  postUrl?: string | null;
  error?: string | null;
};

export const SOCIAL_TARGETS: SocialTarget[] = ["linkedin", "facebook", "x", "telegram"];

const GATEWAY = "https://connector-gateway.lovable.dev";

export function siteUrl(): string {
  return (process.env["SITE_URL"] ?? "https://reelactu.com").replace(/\/$/, "");
}

/** Compose le texte diffusé sur les réseaux. */
export function composeMessage(article: {
  title: string;
  excerpt?: string | null;
  slug: string;
  category?: string | null;
}): string {
  const url = `${siteUrl()}/${article.slug}`;
  const kicker = article.category ? `[${article.category.toUpperCase()}] ` : "";
  const excerpt = (article.excerpt ?? "").trim().slice(0, 220);
  return [`${kicker}${article.title}`, excerpt, url, "#ReelActu #RDC #Actualite"]
    .filter(Boolean)
    .join("\n\n");
}

/** Limite d'un tweet standard. */
export const X_TWEET_LIMIT = 280;

/** X compte chaque lien comme 23 caractères (raccourcissement t.co). */
export function weightedTweetLength(text: string): number {
  const links = text.match(/https?:\/\/\S+/g) ?? [];
  const linksLength = links.reduce((n, l) => n + l.length, 0);
  return [...text].length - linksLength + links.length * 23;
}

/** Tronque proprement un tweet trop long en préservant le lien et les hashtags. */
export function fitTweet(text: string): string {
  if (weightedTweetLength(text) <= X_TWEET_LIMIT) return text;
  const blocks = text.split("\n\n");
  const tail = blocks.slice(-2).join("\n\n"); // lien + hashtags
  const head = blocks.slice(0, -2).join("\n\n");
  const budget = X_TWEET_LIMIT - weightedTweetLength(tail) - 3;
  const chars = [...head];
  return `${chars.slice(0, Math.max(0, budget)).join("").trimEnd()}…\n\n${tail}`;
}

async function linkedin(message: string, link: string): Promise<PublishOutcome> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connKey = process.env["LINKEDIN_API_KEY"];
  if (!lovableKey || !connKey) {
    return {
      platform: "linkedin",
      status: "skipped",
      error: "Connecteur LinkedIn non relié au projet.",
    };
  }
  const headers = {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": connKey,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
  };

  const me = await fetch(`${GATEWAY}/linkedin/v2/userinfo`, { headers });
  if (!me.ok) {
    return { platform: "linkedin", status: "failed", error: `userinfo [${me.status}]: ${await me.text()}` };
  }
  const sub = ((await me.json()) as { sub?: string }).sub;
  if (!sub) return { platform: "linkedin", status: "failed", error: "Identifiant LinkedIn introuvable." };

  const res = await fetch(`${GATEWAY}/linkedin/v2/ugcPosts`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      author: `urn:li:person:${sub}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: message },
          shareMediaCategory: "ARTICLE",
          media: [{ status: "READY", originalUrl: link }],
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });
  if (!res.ok) {
    return { platform: "linkedin", status: "failed", error: `ugcPosts [${res.status}]: ${await res.text()}` };
  }
  const id = ((await res.json()) as { id?: string }).id;
  return {
    platform: "linkedin",
    status: "sent",
    postUrl: id ? `https://www.linkedin.com/feed/update/${id}` : null,
  };
}

async function facebook(message: string, link: string): Promise<PublishOutcome> {
  const pageId = process.env["FACEBOOK_PAGE_ID"];
  const token = process.env["FACEBOOK_PAGE_ACCESS_TOKEN"];
  if (!pageId || !token) {
    return {
      platform: "facebook",
      status: "skipped",
      error: "Jeton de Page Facebook non configuré.",
    };
  }
  const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, link, access_token: token }),
  });
  const body = await res.text();
  if (!res.ok) return { platform: "facebook", status: "failed", error: `[${res.status}] ${body}` };
  let postId: string | undefined;
  try {
    postId = (JSON.parse(body) as { id?: string }).id;
  } catch {
    /* ignore */
  }
  return {
    platform: "facebook",
    status: "sent",
    postUrl: postId ? `https://www.facebook.com/${postId}` : null,
  };
}


/** Limites média X : ≤5 Mo, formats JPEG/PNG/WEBP/GIF. */
const X_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const X_IMAGE_WIDTH = 1200;

/**
 * Récupère la une de l'article déjà redimensionnée côté serveur.
 * Les images internes passent par les transformations du stockage
 * (largeur 1200, qualité 80, format d'origine conservé) ; les images
 * externes sont récupérées telles quelles.
 */
export async function fetchCoverForTweet(
  coverUrl?: string | null,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const raw = (coverUrl ?? "").trim();
  if (!raw) return null;

  try {
    let target: string;
    if (raw.startsWith("/api/public/media/")) {
      const path = decodeURIComponent(raw.replace("/api/public/media/", "").split("?")[0] ?? "");
      if (!path || path.includes("..")) return null;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await supabaseAdmin.storage
        .from("article-images")
        .createSignedUrl(path, 600, {
          transform: { width: X_IMAGE_WIDTH, quality: 80, resize: "contain" },
        });
      if (error || !data?.signedUrl) return null;
      target = data.signedUrl;
    } else if (/^https?:\/\//i.test(raw)) {
      target = raw.replace(/^http:\/\//i, "https://");
    } else {
      return null;
    }

    const res = await fetch(target);
    if (!res.ok) return null;
    const contentType = (res.headers.get("Content-Type") ?? "image/jpeg").split(";")[0]!.trim();
    if (!/^image\/(jpeg|jpg|png|webp|gif)$/i.test(contentType)) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > X_IMAGE_MAX_BYTES) return null;
    return { bytes: buf, contentType };
  } catch {
    return null;
  }
}

/** Téléverse l'image sur X et renvoie son media_id. */
async function uploadXMedia(
  token: string,
  image: { bytes: Uint8Array; contentType: string },
): Promise<string | null> {
  const form = new FormData();
  form.append("media", new Blob([image.bytes as BlobPart], { type: image.contentType }), "cover");
  form.append("media_category", "tweet_image");
  const res = await fetch("https://api.x.com/2/media/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) return null;
  try {
    const parsed = JSON.parse(await res.text()) as {
      id?: string;
      media_id_string?: string;
      data?: { id?: string; media_key?: string };
    };
    return parsed.data?.id ?? parsed.id ?? parsed.media_id_string ?? null;
  } catch {
    return null;
  }
}

async function x(message: string, coverUrl?: string | null): Promise<PublishOutcome> {
  const token = process.env["X_OAUTH_USER_TOKEN"];
  if (!token) {
    return {
      platform: "x",
      status: "skipped",
      error: "Jeton d'écriture X non configuré (le connecteur X est en lecture seule).",
    };
  }
  // L'aperçu (une de l'article) est redimensionné côté serveur avant l'envoi.
  const image = await fetchCoverForTweet(coverUrl);
  const mediaId = image ? await uploadXMedia(token, image) : null;

  const res = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: fitTweet(message),
      ...(mediaId ? { media: { media_ids: [mediaId] } } : {}),
    }),
  });
  const body = await res.text();
  if (!res.ok) return { platform: "x", status: "failed", error: `[${res.status}] ${body}` };
  let id: string | undefined;
  try {
    id = (JSON.parse(body) as { data?: { id?: string } }).data?.id;
  } catch {
    /* ignore */
  }
  return { platform: "x", status: "sent", postUrl: id ? `https://x.com/ReelActu/status/${id}` : null };
}

async function telegram(message: string): Promise<PublishOutcome> {
  const botToken = process.env["TELEGRAM_BOT_TOKEN"];
  const chatId = process.env["TELEGRAM_CHANNEL_ID"];
  if (!botToken || !chatId) {
    return { platform: "telegram", status: "skipped", error: "Canal Telegram non configuré." };
  }
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message, disable_web_page_preview: false }),
  });
  if (!res.ok) return { platform: "telegram", status: "failed", error: `[${res.status}] ${await res.text()}` };
  return { platform: "telegram", status: "sent" };
}

export async function dispatch(
  platform: SocialTarget,
  message: string,
  link: string,
  coverUrl?: string | null,
): Promise<PublishOutcome> {
  try {
    if (platform === "linkedin") return await linkedin(message, link);
    if (platform === "facebook") return await facebook(message, link);
    if (platform === "x") return await x(message, coverUrl);
    return await telegram(message);
  } catch (err) {
    return {
      platform,
      status: "failed",
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
}

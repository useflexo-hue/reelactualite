import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canPublish } from "./roles";

export type XConnectionStatus = {
  tokenConfigured: boolean;
  autoBroadcast: boolean;
  handle: string | null;
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastTestMessage: string | null;
  canManage: boolean;
};

const SETTINGS_KEY = "x_connection";

type XSettings = {
  auto_broadcast?: boolean;
  handle?: string | null;
  last_test_at?: string | null;
  last_test_ok?: boolean | null;
  last_test_message?: string | null;
};

async function readSettings(supabase: {
  from: (t: string) => {
    select: (c: string) => {
      eq: (a: string, b: string) => { maybeSingle: () => Promise<{ data: { value: XSettings } | null }> };
    };
  };
}): Promise<XSettings> {
  const { data } = await supabase.from("app_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
  return (data?.value ?? {}) as XSettings;
}

export const getXConnectionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<XConnectionStatus> => {
    const { supabase, userId } = context;
    const [canManage, settings] = await Promise.all([
      canPublish(supabase, userId),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      readSettings(supabase as any),
    ]);

    return {
      tokenConfigured: Boolean(process.env["X_OAUTH_USER_TOKEN"]),
      autoBroadcast: settings.auto_broadcast === true,
      handle: settings.handle ?? null,
      lastTestAt: settings.last_test_at ?? null,
      lastTestOk: settings.last_test_ok ?? null,
      lastTestMessage: settings.last_test_message ?? null,
      canManage: Boolean(canManage),
    };
  });

/**
 * Teste réellement le droit de publication : lecture du compte, puis publication
 * d'un tweet de test immédiatement supprimé. Aucune trace ne reste sur le compte.
 */
export const testXWriteAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const canManage = await canPublish(supabase, userId);
    if (!canManage) throw new Error("Seule la direction peut tester la connexion X.");

    const token = process.env["X_OAUTH_USER_TOKEN"];
    if (!token) {
      return {
        ok: false,
        handle: null as string | null,
        message: "Aucun jeton d'écriture X enregistré.",
      };
    }

    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    let handle: string | null = null;
    let ok = false;
    let message = "";

    try {
      const me = await fetch("https://api.x.com/2/users/me", { headers });
      const meBody = await me.text();
      if (!me.ok) {
        message = `Lecture du compte refusée [${me.status}] : ${meBody.slice(0, 300)}`;
      } else {
        handle =
          (JSON.parse(meBody) as { data?: { username?: string } }).data?.username ?? null;

        const marker = `Test technique ReelActu ${Date.now()}`;
        const post = await fetch("https://api.x.com/2/tweets", {
          method: "POST",
          headers,
          body: JSON.stringify({ text: marker }),
        });
        const postBody = await post.text();
        if (!post.ok) {
          message = `Droit de publication refusé [${post.status}] : ${postBody.slice(0, 300)}`;
        } else {
          const id = (JSON.parse(postBody) as { data?: { id?: string } }).data?.id;
          if (id) {
            await fetch(`https://api.x.com/2/tweets/${id}`, { method: "DELETE", headers });
          }
          ok = true;
          message = `Publication autorisée${handle ? ` sur @${handle}` : ""} (message de test supprimé).`;
        }
      }
    } catch (err) {
      message = err instanceof Error ? err.message : "Erreur réseau inconnue.";
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const previous = await readSettings(supabase as any);
    await supabase.from("app_settings").upsert(
      {
        key: SETTINGS_KEY,
        value: {
          ...previous,
          handle,
          last_test_at: new Date().toISOString(),
          last_test_ok: ok,
          last_test_message: message,
          // Un test échoué désactive immédiatement l'auto-diffusion.
          auto_broadcast: ok ? previous.auto_broadcast === true : false,
        },
      },
      { onConflict: "key" },
    );

    return { ok, handle, message };
  });

/** L'auto-diffusion X ne peut être activée qu'après un test de publication réussi. */
export const setXAutoBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { enabled: boolean }) => {
    if (typeof input?.enabled !== "boolean") throw new Error("Valeur invalide.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const canManage = await canPublish(supabase, userId);
    if (!canManage) throw new Error("Seule la direction peut modifier ce réglage.");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const previous = await readSettings(supabase as any);
    if (data.enabled && previous.last_test_ok !== true) {
      throw new Error("Testez d'abord le droit de publication avant d'activer l'auto-diffusion.");
    }

    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: SETTINGS_KEY, value: { ...previous, auto_broadcast: data.enabled } }, { onConflict: "key" });
    if (error) throw new Error(error.message);

    return { enabled: data.enabled };
  });

export type XTweetPreview = {
  slug: string;
  title: string;
  status: string;
  text: string;
  url: string;
  hashtags: string[];
  imageUrl: string | null;
  weightedLength: number;
  limit: number;
  truncated: boolean;
};

/**
 * Prévisualise le tweet exact qui serait diffusé pour les derniers articles.
 * X compte chaque lien comme 23 caractères (t.co) : le calcul le reproduit.
 */
export const getXTweetPreview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<XTweetPreview[]> => {
    const { composeMessage, siteUrl, X_TWEET_LIMIT, weightedTweetLength, fitTweet } = await import(
      "@/lib/social-publish.server"
    );

    const { data, error } = await context.supabase
      .from("articles")
      .select("slug, title, dek, status, cover_url, published_at, created_at, categories!articles_category_id_fkey(name)")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(3);
    if (error) throw new Error(error.message);

    return (data ?? []).map((a) => {
      const category =
        (a as { categories?: { name?: string } | null }).categories?.name ?? null;
      const text = fitTweet(composeMessage({
        title: a.title,
        excerpt: a.dek,
        slug: a.slug,
        category,
      }));
      const weightedLength = weightedTweetLength(text);
      return {
        slug: a.slug,
        title: a.title,
        status: a.status,
        text,
        url: `${siteUrl()}/${a.slug}`,
        imageUrl: a.cover_url ?? null,
        hashtags: text.match(/#[\p{L}\p{N}_]+/gu) ?? [],
        weightedLength,
        limit: X_TWEET_LIMIT,
        truncated: weightedLength > X_TWEET_LIMIT,
      };
    });
  });

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canPublish } from "./roles";

export type SocialPublication = {
  id: string;
  article_id: string;
  platform: string;
  status: string;
  message: string | null;
  post_url: string | null;
  error: string | null;
  sent_at: string | null;
  created_at: string;
  article_title?: string | null;
  article_slug?: string | null;
};

/**
 * Diffuse un article sur tous les réseaux configurés et journalise le résultat.
 * Appelée automatiquement au passage d'un article au statut « publié ».
 */
export const publishArticleToSocials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { articleId: string; force?: boolean }) => {
    if (!input?.articleId) throw new Error("Article manquant.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const allowed = await canPublish(supabase, userId);
    if (!allowed) throw new Error("Vous n'avez pas le droit de diffuser sur les réseaux.");

    const { data: article, error } = await supabase
      .from("articles")
      .select("id,slug,title,dek,status,cover_url,categories!articles_category_id_fkey(name)")
      .eq("id", data.articleId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!article) throw new Error("Article introuvable.");
    if (article.status !== "publie") {
      return { skipped: true as const, results: [], reason: "Article non publié." };
    }

    const { SOCIAL_TARGETS, composeMessage, dispatch, siteUrl } = await import(
      "@/lib/social-publish.server"
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const category = (article as { categories?: { name?: string } | null }).categories?.name ?? null;
    const message = composeMessage({
      title: article.title,
      excerpt: article.dek,
      slug: article.slug,
      category,
    });
    const link = `${siteUrl()}/${article.slug}`;

    // On ne rediffuse pas ce qui est déjà parti, sauf demande explicite.
    const { data: existing } = await supabaseAdmin
      .from("social_publications")
      .select("platform,status")
      .eq("article_id", article.id);
    const alreadySent = new Set(
      (existing ?? []).filter((r) => r.status === "sent").map((r) => r.platform),
    );

    // L'auto-diffusion X reste inactive tant que le test d'écriture n'a pas été validé.
    const { data: xSetting } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "x_connection")
      .maybeSingle();
    const xEnabled =
      (xSetting?.value as { auto_broadcast?: boolean } | null)?.auto_broadcast === true;

    const targets = SOCIAL_TARGETS.filter(
      (p) => (data.force || !alreadySent.has(p)) && (p !== "x" || xEnabled),
    );


    const results = await Promise.all(
      targets.map((p) => dispatch(p, message, link, article.cover_url)),
    );

    if (results.length > 0) {
      await supabaseAdmin.from("social_publications").upsert(
        results.map((r) => ({
          article_id: article.id,
          platform: r.platform,
          status: r.status,
          message,
          post_url: r.postUrl ?? null,
          error: r.error ?? null,
          sent_at: r.status === "sent" ? new Date().toISOString() : null,
        })),
        { onConflict: "article_id,platform" },
      );
    }

    return { skipped: false as const, results, reason: null };
  });

/** Journal des diffusions pour le tableau de bord rédaction. */
export const listSocialPublications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SocialPublication[]> => {
    const { data, error } = await context.supabase
      .from("social_publications")
      .select("id,article_id,platform,status,message,post_url,error,sent_at,created_at,articles(title,slug)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => {
      const article = (row as { articles?: { title?: string; slug?: string } | null }).articles;
      return {
        id: row.id,
        article_id: row.article_id,
        platform: row.platform,
        status: row.status,
        message: row.message,
        post_url: row.post_url,
        error: row.error,
        sent_at: row.sent_at,
        created_at: row.created_at,
        article_title: article?.title ?? null,
        article_slug: article?.slug ?? null,
      };
    });
  });

import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type SupabaseServerClient = SupabaseClient<Database>;

export type NewsroomArticle = {
  id: string;
  slug: string;
  title: string;
  dek: string | null;
  body: string;
  cover_url: string | null;
  cover_credit: string | null;
  category_id: string | null;
  author_id: string | null;
  co_author_ids: string[];
  status: "brouillon" | "relecture" | "valide" | "publie";
  published_at: string | null;
  location: string | null;
  reading_minutes: number;
  is_featured: boolean;
  is_breaking: boolean;
  seo_title: string | null;
  seo_description: string | null;
  updated_at: string;
};

export type NewsroomContext = {
  userId: string;
  email: string | null;
  roles: string[];
  canPublish: boolean;
  categories: { id: string; name: string; slug: string }[];
  authors: { id: string; display_name: string }[];
};

const EDIT_SELECT =
  "id,slug,title,dek,body,cover_url,cover_credit,category_id,author_id,status,published_at,location,reading_minutes,is_featured,is_breaking,seo_title,seo_description,updated_at";

const PUBLISHER_ROLES = ["admin", "directeur_publication", "redacteur_chef"];

export const getNewsroomContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NewsroomContext> => {
    const { supabase, userId, claims } = context;

    const [rolesRes, catsRes, authorsRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("categories").select("id,name,slug").order("position"),
      supabase.from("authors").select("id,display_name").order("display_name"),
    ]);

    const roles = (rolesRes.data ?? []).map((r) => r.role as string);

    return {
      userId,
      email: (claims as { email?: string } | null)?.email ?? null,
      roles,
      canPublish: roles.some((r) => PUBLISHER_ROLES.includes(r)),
      categories: catsRes.data ?? [],
      authors: authorsRes.data ?? [],
    };
  });

export const listNewsroomArticles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NewsroomArticle[]> => {
    const { data, error } = await context.supabase
      .from("articles")
      .select(EDIT_SELECT)
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as NewsroomArticle[];
  });

export const getNewsroomArticle = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }): Promise<NewsroomArticle | null> => {
    const [{ data: row, error }, { data: coAuthors, error: coAuthorsError }] = await Promise.all([
      context.supabase.from("articles").select(EDIT_SELECT).eq("id", data.id).maybeSingle(),
      context.supabase
        .from("article_authors")
        .select("author_id")
        .eq("article_id", data.id)
        .order("position"),
    ]);
    if (error) throw new Error(error.message);
    if (coAuthorsError) throw new Error(coAuthorsError.message);
    if (!row) return null;
    return {
      ...row,
      co_author_ids: (coAuthors ?? []).map((c) => c.author_id),
    } as unknown as NewsroomArticle;
  });

export type ArticleInput = {
  id?: string;
  slug: string;
  title: string;
  dek: string | null;
  body: string;
  cover_url: string | null;
  cover_credit: string | null;
  category_id: string | null;
  author_id: string | null;
  co_author_ids: string[];
  status: NewsroomArticle["status"];
  location: string | null;
  reading_minutes: number;
  is_featured: boolean;
  is_breaking: boolean;
  seo_title: string | null;
  seo_description: string | null;
};

function validate(input: ArticleInput): ArticleInput {
  if (!input.title?.trim()) throw new Error("Le titre est obligatoire.");
  if (!input.slug?.trim()) throw new Error("L'URL (slug) est obligatoire.");
  return input;
}

async function syncCoAuthors(
  supabase: SupabaseServerClient,
  articleId: string,
  primaryAuthorId: string | null,
  coAuthorIds: string[],
) {
  const { error: deleteError } = await supabase
    .from("article_authors")
    .delete()
    .eq("article_id", articleId);
  if (deleteError) throw new Error(deleteError.message);

  const uniqueIds = Array.from(new Set(coAuthorIds.filter(Boolean))).filter(
    (aid) => aid !== primaryAuthorId,
  );
  if (uniqueIds.length === 0) return;

  const { error: insertError } = await supabase
    .from("article_authors")
    .insert(uniqueIds.map((author_id, position) => ({ article_id: articleId, author_id, position })));
  if (insertError) throw new Error(insertError.message);
}

export const saveNewsroomArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ArticleInput) => validate(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { supabase, userId } = context;
    const { id, co_author_ids, ...fields } = data;

    const publishedAt =
      fields.status === "publie" ? new Date().toISOString() : null;

    if (id) {
      const current = await supabase
        .from("articles")
        .select("published_at,status")
        .eq("id", id)
        .maybeSingle();

      const keepDate =
        fields.status === "publie"
          ? (current.data?.published_at ?? publishedAt)
          : null;

      const { error } = await supabase
        .from("articles")
        .update({ ...fields, published_at: keepDate })
        .eq("id", id);
      if (error) throw new Error(error.message);
      await syncCoAuthors(supabase, id, fields.author_id, co_author_ids ?? []);
      return { id };
    }

    const { data: inserted, error } = await supabase
      .from("articles")
      .insert({ ...fields, published_at: publishedAt, created_by: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await syncCoAuthors(supabase, inserted.id, fields.author_id, co_author_ids ?? []);
    return { id: inserted.id };
  });

export const deleteNewsroomArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("articles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

function slugifyAuthorName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const createNewsroomAuthor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { display_name: string }) => input)
  .handler(async ({ data, context }): Promise<{ id: string; display_name: string }> => {
    const displayName = data.display_name?.trim();
    if (!displayName) throw new Error("Le nom du journaliste est obligatoire.");

    const baseSlug = slugifyAuthorName(displayName) || "journaliste";
    let slug = baseSlug;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data: clash } = await context.supabase
        .from("authors")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!clash) break;
      slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const { data: inserted, error } = await context.supabase
      .from("authors")
      .insert({ slug, display_name: displayName })
      .select("id,display_name")
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

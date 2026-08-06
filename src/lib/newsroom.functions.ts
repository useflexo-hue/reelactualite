import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
    const { data: row, error } = await context.supabase
      .from("articles")
      .select(EDIT_SELECT)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row ?? null) as unknown as NewsroomArticle | null;
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

export const saveNewsroomArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ArticleInput) => validate(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { supabase, userId } = context;
    const { id, ...fields } = data;

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
      return { id };
    }

    const { data: inserted, error } = await supabase
      .from("articles")
      .insert({ ...fields, published_at: publishedAt, created_by: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
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

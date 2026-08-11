export const SEARCH_PAGE_SIZE = 12;

export const SEARCH_SELECT =
  "slug,title,dek,cover_url,published_at,location,reading_minutes,is_breaking,category:categories!articles_category_id_fkey(slug,name),author:authors!articles_author_id_fkey(slug,display_name,avatar_url,twitter)";

/**
 * Construit le filtre PostgREST `or=(...)` en neutralisant les caractères
 * qui pourraient casser la syntaxe du filtre (virgules, parenthèses, %).
 */
export function buildSearchFilter(q: string): string {
  const safe = q.replace(/[,()%*\\]/g, " ").replace(/\s+/g, " ").trim();
  const term = `%${safe}%`;
  return [`title.ilike.${term}`, `dek.ilike.${term}`, `body.ilike.${term}`].join(",");
}

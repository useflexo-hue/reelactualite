export type ArticleCardData = {
  slug: string;
  title: string;
  dek: string | null;
  cover_url: string | null;
  published_at: string | null;
  location: string | null;
  reading_minutes: number;
  is_breaking: boolean;
  category: { slug: string; name: string } | null;
  author: {
    slug: string;
    display_name: string;
    avatar_url?: string | null;
    twitter?: string | null;
  } | null;
};

export type ArticleFull = ArticleCardData & {
  id: string;
  body: string;
  cover_credit: string | null;
  seo_title: string | null;
  seo_description: string | null;
  view_count: number;
  share_count: number;
  author: {
    slug: string;
    display_name: string;
    role_label: string | null;
    bio: string | null;
    city: string | null;
    avatar_url: string | null;
    twitter: string | null;
  } | null;
  tags: { slug: string; name: string }[];
};

export type CategoryItem = {
  slug: string;
  name: string;
  kind: string;
  position: number;
};

export type HomeData = {
  categories: CategoryItem[];
  breaking: ArticleCardData | null;
  featured: ArticleCardData[];
  latest: ArticleCardData[];
  mostRead: ArticleCardData[];
  mostShared: ArticleCardData[];
  sections: { slug: string; name: string; articles: ArticleCardData[] }[];
};

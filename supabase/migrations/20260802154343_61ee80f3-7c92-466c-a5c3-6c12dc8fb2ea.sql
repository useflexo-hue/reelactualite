CREATE TABLE IF NOT EXISTS public.article_categories (
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, category_id)
);

GRANT SELECT ON public.article_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.article_categories TO authenticated;
GRANT ALL ON public.article_categories TO service_role;

ALTER TABLE public.article_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rubriques secondaires publiques"
  ON public.article_categories FOR SELECT TO anon USING (true);
CREATE POLICY "Rubriques secondaires lisibles connecte"
  ON public.article_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Redaction gere les rubriques secondaires"
  ON public.article_categories FOR ALL TO authenticated
  USING (is_newsroom(auth.uid())) WITH CHECK (is_newsroom(auth.uid()));

CREATE INDEX IF NOT EXISTS article_categories_category_idx ON public.article_categories(category_id);
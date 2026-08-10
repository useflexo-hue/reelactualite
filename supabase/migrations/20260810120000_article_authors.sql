-- Signatures multiples : un article peut être co-signé par d'autres journalistes
-- en plus de l'auteur principal (articles.author_id).
CREATE TABLE IF NOT EXISTS public.article_authors (
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.authors(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (article_id, author_id)
);

GRANT SELECT ON public.article_authors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.article_authors TO authenticated;
GRANT ALL ON public.article_authors TO service_role;

ALTER TABLE public.article_authors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Co-signatures publiques"
  ON public.article_authors FOR SELECT TO anon USING (true);
CREATE POLICY "Co-signatures lisibles connecte"
  ON public.article_authors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Redaction gere les co-signatures"
  ON public.article_authors FOR ALL TO authenticated
  USING (is_newsroom(auth.uid())) WITH CHECK (is_newsroom(auth.uid()));

CREATE INDEX IF NOT EXISTS article_authors_author_idx ON public.article_authors(author_id);

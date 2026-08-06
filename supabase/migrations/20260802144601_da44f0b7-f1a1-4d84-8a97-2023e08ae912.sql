CREATE TABLE public.social_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  platform text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  message text,
  post_url text,
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (article_id, platform)
);

CREATE INDEX social_publications_created_idx ON public.social_publications (created_at DESC);

GRANT SELECT ON public.social_publications TO authenticated;
GRANT ALL ON public.social_publications TO service_role;

ALTER TABLE public.social_publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Newsroom can read social publications"
ON public.social_publications FOR SELECT TO authenticated
USING (public.is_newsroom(auth.uid()));

CREATE TRIGGER social_publications_touch
BEFORE UPDATE ON public.social_publications
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
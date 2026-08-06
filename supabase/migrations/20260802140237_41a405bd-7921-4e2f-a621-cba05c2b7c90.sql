CREATE TABLE public.share_events (
  id uuid primary key default gen_random_uuid(),
  article_slug text not null,
  network text not null,
  referrer text,
  created_at timestamptz not null default now()
);
CREATE INDEX share_events_created_at_idx ON public.share_events (created_at desc);
CREATE INDEX share_events_slug_idx ON public.share_events (article_slug);
GRANT SELECT ON public.share_events TO authenticated;
GRANT ALL ON public.share_events TO service_role;
ALTER TABLE public.share_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Newsroom can read share events" ON public.share_events FOR SELECT TO authenticated USING (true);
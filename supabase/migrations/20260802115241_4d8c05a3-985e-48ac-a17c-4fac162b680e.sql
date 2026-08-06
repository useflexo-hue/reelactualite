CREATE TABLE public.direct_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  reason text,
  age_minutes integer,
  breaking_count integer,
  ticker_items integer,
  duration_ms integer,
  db_error text,
  path text,
  detail jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX direct_events_created_at_idx ON public.direct_events (created_at DESC);

GRANT SELECT ON public.direct_events TO authenticated;
GRANT ALL ON public.direct_events TO service_role;

ALTER TABLE public.direct_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Redaction lit le journal du direct"
ON public.direct_events FOR SELECT TO authenticated
USING (public.is_newsroom(auth.uid()));
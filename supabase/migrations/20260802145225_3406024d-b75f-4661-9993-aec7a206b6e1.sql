CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Newsroom reads settings"
ON public.app_settings FOR SELECT TO authenticated
USING (public.is_newsroom(auth.uid()));

CREATE POLICY "Publishers insert settings"
ON public.app_settings FOR INSERT TO authenticated
WITH CHECK (public.can_publish(auth.uid()));

CREATE POLICY "Publishers update settings"
ON public.app_settings FOR UPDATE TO authenticated
USING (public.can_publish(auth.uid()))
WITH CHECK (public.can_publish(auth.uid()));

CREATE TRIGGER app_settings_touch
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
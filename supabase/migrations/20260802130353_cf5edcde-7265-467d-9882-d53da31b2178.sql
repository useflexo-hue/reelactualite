GRANT SELECT (twitter, linkedin) ON public.authors TO anon, authenticated;
UPDATE public.authors SET twitter = 'reelactu' WHERE slug = 'redaction-reelactu' AND twitter IS NULL;
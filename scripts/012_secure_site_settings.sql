-- Site settings are read and written only by trusted server routes. Public
-- callers receive an explicit safe projection from /api/site-settings.
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow upsert on site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow update on site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Public site settings are readable" ON public.site_settings;
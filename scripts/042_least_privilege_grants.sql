-- Establish an explicit client privilege allow-list for the public schema.
-- RLS remains the row-level boundary on every table granted below.

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

GRANT SELECT ON TABLE
  public.categories,
  public.pdfs,
  public.apx_platforms,
  public.apx_test_series,
  public.reviews
TO anon, authenticated;

-- questions contains the answer key; clients must use server projections.
REVOKE ALL PRIVILEGES ON TABLE public.quizzes FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE
  public.user_pdf_activity,
  public.quiz_results,
  public.community_submissions,
  public.notifications
TO authenticated;

GRANT INSERT ON TABLE public.reviews TO authenticated;
GRANT UPDATE ON TABLE public.notifications TO authenticated;

-- Site settings are projected through the server-only /api/site-settings
-- route. Remove legacy direct-read policies as well as underlying grants.
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow upsert on site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow update on site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Public site settings are readable" ON public.site_settings;
DROP POLICY IF EXISTS "Public site settings allow-list" ON public.site_settings;
REVOKE ALL PRIVILEGES ON TABLE public.site_settings FROM PUBLIC, anon, authenticated;

-- get_public_pdf_stats has no arguments (see 028_public_pdf_stats.sql and
-- 036_community_pdf_submissions.sql). It is the sole client-callable RPC.
GRANT EXECUTE ON FUNCTION public.get_public_pdf_stats() TO anon, authenticated;

-- PostgreSQL grants function execution to PUBLIC by default. Reset all three
-- object classes for objects subsequently created by the postgres owner.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO service_role;

NOTIFY pgrst, 'reload schema';
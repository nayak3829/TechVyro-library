-- PDF favorites are mediated by authenticated application routes and the
-- service-role-only toggle_pdf_favorite RPC. Clients must not access the table
-- directly because device IDs are not an authorization boundary.

ALTER TABLE public.pdf_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on pdf_favorites" ON public.pdf_favorites;
DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pdf_favorites'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.pdf_favorites', policy_name);
  END LOOP;
END
$$;

REVOKE ALL PRIVILEGES ON TABLE public.pdf_favorites FROM anon, authenticated;

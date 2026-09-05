-- Phase 5 authorization isolation. Apply only after the PDF processing columns
-- and user PDF activity function have been created.

ALTER TABLE public.pdfs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access on pdfs" ON public.pdfs;
DROP POLICY IF EXISTS "Public PDFs are readable" ON public.pdfs;
CREATE POLICY "Public PDFs are readable"
  ON public.pdfs FOR SELECT TO anon, authenticated
  USING (
    visibility = 'public'
    AND publish_status = 'published'
    AND malware_status = 'clean'
    AND (scheduled_at IS NULL OR scheduled_at <= NOW())
  );

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Allow insert on quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Allow update on quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Allow delete on quizzes" ON public.quizzes;
REVOKE ALL PRIVILEGES ON TABLE public.quizzes FROM PUBLIC, anon, authenticated;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Reviews are publicly readable" ON public.reviews;
DROP POLICY IF EXISTS "Allow public read on reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow public insert on reviews" ON public.reviews;
DROP POLICY IF EXISTS "Visible PDF reviews are publicly readable" ON public.reviews;
DROP POLICY IF EXISTS "Authenticated users insert own reviews" ON public.reviews;

CREATE POLICY "Visible PDF reviews are publicly readable"
  ON public.reviews FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pdfs
      WHERE pdfs.id = reviews.pdf_id
        AND pdfs.visibility = 'public'
        AND pdfs.publish_status = 'published'
        AND pdfs.malware_status = 'clean'
        AND (pdfs.scheduled_at IS NULL OR pdfs.scheduled_at <= NOW())
    )
  );

CREATE POLICY "Authenticated users insert own reviews"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()::TEXT
    AND EXISTS (
      SELECT 1 FROM public.pdfs
      WHERE pdfs.id = reviews.pdf_id
        AND pdfs.visibility = 'public'
        AND pdfs.publish_status = 'published'
        AND pdfs.malware_status = 'clean'
        AND (pdfs.scheduled_at IS NULL OR pdfs.scheduled_at <= NOW())
    )
  );

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_credits'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_credits', policy_name);
  END LOOP;
END
$$;
REVOKE ALL PRIVILEGES ON TABLE public.user_credits FROM anon, authenticated;

ALTER TABLE public.pdf_favorites ENABLE ROW LEVEL SECURITY;
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

CREATE OR REPLACE FUNCTION public.record_user_pdf_activity(
  p_user_id UUID,
  p_pdf_id UUID,
  p_event TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;

  IF p_event NOT IN ('view', 'download') THEN
    RAISE EXCEPTION 'invalid PDF activity event' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.user_pdf_activity (
    user_id, pdf_id, last_viewed_at, last_downloaded_at, view_count, download_count
  ) VALUES (
    p_user_id,
    p_pdf_id,
    CASE WHEN p_event = 'view' THEN now() END,
    CASE WHEN p_event = 'download' THEN now() END,
    CASE WHEN p_event = 'view' THEN 1 ELSE 0 END,
    CASE WHEN p_event = 'download' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, pdf_id) DO UPDATE SET
    last_viewed_at = CASE WHEN p_event = 'view' THEN now() ELSE user_pdf_activity.last_viewed_at END,
    last_downloaded_at = CASE WHEN p_event = 'download' THEN now() ELSE user_pdf_activity.last_downloaded_at END,
    view_count = user_pdf_activity.view_count + CASE WHEN p_event = 'view' THEN 1 ELSE 0 END,
    download_count = user_pdf_activity.download_count + CASE WHEN p_event = 'download' THEN 1 ELSE 0 END,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.record_user_pdf_activity(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_user_pdf_activity(UUID, UUID, TEXT) TO service_role;
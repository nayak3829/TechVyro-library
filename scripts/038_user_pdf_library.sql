-- Per-user PDF history for the My Library surface.
CREATE TABLE IF NOT EXISTS public.user_pdf_activity (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdf_id UUID NOT NULL REFERENCES public.pdfs(id) ON DELETE CASCADE,
  last_viewed_at TIMESTAMPTZ,
  last_downloaded_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  download_count INTEGER NOT NULL DEFAULT 0 CHECK (download_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, pdf_id)
);

CREATE INDEX IF NOT EXISTS idx_user_pdf_activity_recent
  ON public.user_pdf_activity (user_id, last_viewed_at DESC)
  WHERE last_viewed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_pdf_activity_downloads
  ON public.user_pdf_activity (user_id, last_downloaded_at DESC)
  WHERE last_downloaded_at IS NOT NULL;

ALTER TABLE public.user_pdf_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own PDF activity" ON public.user_pdf_activity;
CREATE POLICY "Users can read own PDF activity" ON public.user_pdf_activity
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

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

-- Prevent duplicate saved items while retaining guest/device favorites.
CREATE UNIQUE INDEX IF NOT EXISTS idx_pdf_favorites_user_pdf_unique
  ON public.pdf_favorites (user_id, pdf_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pdf_favorites_device_pdf_unique
  ON public.pdf_favorites (device_id, pdf_id) WHERE user_id IS NULL AND device_id IS NOT NULL;
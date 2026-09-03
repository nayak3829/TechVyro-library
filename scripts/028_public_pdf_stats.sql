CREATE OR REPLACE FUNCTION public.get_public_pdf_stats()
RETURNS TABLE (
  total_pdfs BIGINT,
  total_downloads BIGINT,
  total_views BIGINT,
  avg_rating NUMERIC,
  this_week_uploads BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*)::BIGINT,
    COALESCE(SUM(download_count), 0)::BIGINT,
    COALESCE(SUM(view_count), 0)::BIGINT,
    COALESCE(AVG(NULLIF(average_rating, 0)), 0)::NUMERIC,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::BIGINT
  FROM public.pdfs
  WHERE visibility = 'public'
    AND publish_status = 'published'
    AND (scheduled_at IS NULL OR scheduled_at <= NOW());
$$;

REVOKE ALL ON FUNCTION public.get_public_pdf_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_pdf_stats() TO anon, authenticated, service_role;
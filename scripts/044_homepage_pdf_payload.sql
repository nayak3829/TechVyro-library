-- Fetch the homepage catalogue and ranked lists with one visibility-filtered scan.
-- Ranked lists are represented by IDs so duplicate cards are not serialized twice.
CREATE OR REPLACE FUNCTION public.get_homepage_pdfs()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service_role required' USING ERRCODE = '42501';
  END IF;

  RETURN (
  WITH visible AS MATERIALIZED (
    SELECT
      p.id,
      p.title,
      p.description,
      p.file_size,
      p.page_count,
      p.category_id,
      p.download_count,
      p.view_count,
      p.average_rating,
      p.created_at,
      p.updated_at,
      p.allow_download,
      p.tags,
      p.content_type,
      p.content_category,
      p.content_subcategory,
      p.subject,
      CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'slug', c.slug,
        'color', c.color,
        'created_at', c.created_at
      ) END AS category
    FROM public.pdfs p
    LEFT JOIN public.categories c ON c.id = p.category_id
    WHERE p.visibility = 'public'
      AND p.publish_status = 'published'
      AND p.malware_status = 'clean'
      AND (p.scheduled_at IS NULL OR p.scheduled_at <= NOW())
  ),
  library AS (
    SELECT 'library'::TEXT AS bucket, row_number() OVER (ORDER BY created_at DESC) AS rank, visible.*
    FROM visible
    ORDER BY created_at DESC
    LIMIT 60
  ),
  popular AS (
    SELECT 'popular'::TEXT AS bucket, row_number() OVER (ORDER BY download_count DESC) AS rank, visible.*
    FROM visible
    WHERE download_count > 0
    ORDER BY download_count DESC
    LIMIT 4
  ),
  trending AS (
    SELECT 'trending'::TEXT AS bucket, row_number() OVER (ORDER BY view_count DESC) AS rank, visible.*
    FROM visible
    WHERE view_count > 0
    ORDER BY view_count DESC
    LIMIT 4
  ),
  top_rated AS (
    SELECT 'topRated'::TEXT AS bucket, row_number() OVER (ORDER BY average_rating DESC) AS rank, visible.*
    FROM visible
    WHERE average_rating > 0
    ORDER BY average_rating DESC
    LIMIT 4
  ),
  ranked AS (
    SELECT * FROM library
    UNION ALL SELECT * FROM popular
    UNION ALL SELECT * FROM trending
    UNION ALL SELECT * FROM top_rated
  ),
  unique_rows AS (
    SELECT DISTINCT ON (id) *
    FROM ranked
    ORDER BY id
  )
  SELECT jsonb_build_object(
    'pdfs', COALESCE((
      SELECT jsonb_agg(to_jsonb(unique_rows) - 'bucket' - 'rank')
      FROM unique_rows
    ), '[]'::JSONB),
    'libraryIds', COALESCE((
      SELECT jsonb_agg(id ORDER BY rank) FROM ranked WHERE bucket = 'library'
    ), '[]'::JSONB),
    'popularIds', COALESCE((
      SELECT jsonb_agg(id ORDER BY rank) FROM ranked WHERE bucket = 'popular'
    ), '[]'::JSONB),
    'trendingIds', COALESCE((
      SELECT jsonb_agg(id ORDER BY rank) FROM ranked WHERE bucket = 'trending'
    ), '[]'::JSONB),
    'topRatedIds', COALESCE((
      SELECT jsonb_agg(id ORDER BY rank) FROM ranked WHERE bucket = 'topRated'
    ), '[]'::JSONB)
  )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_homepage_pdfs() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_homepage_pdfs() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_homepage_pdfs() TO service_role;
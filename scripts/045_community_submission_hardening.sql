-- Final visibility and moderation hardening for community uploads.
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
    AND (COALESCE(storage_bucket, 'pdfs') <> 'community-pdfs' OR processing_status = 'completed')
  );

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Reviews are publicly readable" ON public.reviews;
DROP POLICY IF EXISTS "Allow public read on reviews" ON public.reviews;
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
        AND (COALESCE(pdfs.storage_bucket, 'pdfs') <> 'community-pdfs' OR pdfs.processing_status = 'completed')
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
        AND (COALESCE(pdfs.storage_bucket, 'pdfs') <> 'community-pdfs' OR pdfs.processing_status = 'completed')
    )
  );

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
    AND malware_status = 'clean'
    AND (COALESCE(storage_bucket, 'pdfs') <> 'community-pdfs' OR processing_status = 'completed')
    AND (scheduled_at IS NULL OR scheduled_at <= NOW());
$$;
REVOKE ALL ON FUNCTION public.get_public_pdf_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_pdf_stats() TO anon, authenticated, service_role;

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
    SELECT p.id,p.title,p.description,p.file_size,p.page_count,p.category_id,
      p.download_count,p.view_count,p.average_rating,p.created_at,p.updated_at,
      p.allow_download,p.tags,p.content_type,p.content_category,p.content_subcategory,p.subject,
      CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id',c.id,'name',c.name,'slug',c.slug,'color',c.color,'created_at',c.created_at
      ) END AS category
    FROM public.pdfs p LEFT JOIN public.categories c ON c.id=p.category_id
    WHERE p.visibility='public' AND p.publish_status='published' AND p.malware_status='clean'
      AND (COALESCE(p.storage_bucket, 'pdfs') <> 'community-pdfs' OR p.processing_status='completed')
      AND (p.scheduled_at IS NULL OR p.scheduled_at <= NOW())
  ), library AS (
    SELECT 'library'::TEXT AS bucket,row_number() OVER (ORDER BY created_at DESC) AS rank,visible.* FROM visible ORDER BY created_at DESC LIMIT 60
  ), popular AS (
    SELECT 'popular'::TEXT AS bucket,row_number() OVER (ORDER BY download_count DESC) AS rank,visible.* FROM visible WHERE download_count>0 ORDER BY download_count DESC LIMIT 4
  ), trending AS (
    SELECT 'trending'::TEXT AS bucket,row_number() OVER (ORDER BY view_count DESC) AS rank,visible.* FROM visible WHERE view_count>0 ORDER BY view_count DESC LIMIT 4
  ), top_rated AS (
    SELECT 'topRated'::TEXT AS bucket,row_number() OVER (ORDER BY average_rating DESC) AS rank,visible.* FROM visible WHERE average_rating>0 ORDER BY average_rating DESC LIMIT 4
  ), ranked AS (
    SELECT * FROM library UNION ALL SELECT * FROM popular UNION ALL SELECT * FROM trending UNION ALL SELECT * FROM top_rated
  ), unique_rows AS (
    SELECT DISTINCT ON (id) * FROM ranked ORDER BY id
  ) SELECT jsonb_build_object(
    'pdfs',COALESCE((SELECT jsonb_agg(to_jsonb(unique_rows)-'bucket'-'rank') FROM unique_rows),'[]'::JSONB),
    'libraryIds',COALESCE((SELECT jsonb_agg(id ORDER BY rank) FROM ranked WHERE bucket='library'),'[]'::JSONB),
    'popularIds',COALESCE((SELECT jsonb_agg(id ORDER BY rank) FROM ranked WHERE bucket='popular'),'[]'::JSONB),
    'trendingIds',COALESCE((SELECT jsonb_agg(id ORDER BY rank) FROM ranked WHERE bucket='trending'),'[]'::JSONB),
    'topRatedIds',COALESCE((SELECT jsonb_agg(id ORDER BY rank) FROM ranked WHERE bucket='topRated'),'[]'::JSONB)
  ));
END;
$$;
REVOKE ALL ON FUNCTION public.get_homepage_pdfs() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_homepage_pdfs() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_homepage_pdfs() TO service_role;

CREATE OR REPLACE FUNCTION public.create_community_submission(
  p_reservation_id uuid, p_email_hash text, p_file_path text, p_title text,
  p_file_size bigint, p_page_count integer, p_content_type text,
  p_content_category text, p_content_subcategory text, p_subject text,
  p_description text, p_submitter_name text, p_submitter_email text,
  p_submitter_note text, p_copyright_confirmed boolean, p_user_id uuid,
  p_content_hash text, p_malware_status text, p_review_warnings text[]
) RETURNS public.community_submissions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_res public.community_submission_reservations; v_row public.community_submissions;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_res FROM public.community_submission_reservations WHERE id=p_reservation_id FOR UPDATE;
  IF NOT FOUND OR v_res.email_hash<>p_email_hash OR v_res.expected_path<>p_file_path THEN
    RAISE EXCEPTION 'invalid reservation' USING ERRCODE='22023';
  END IF;
  IF v_res.consumed_at IS NOT NULL THEN
    IF v_res.consumed_path=p_file_path THEN
      SELECT * INTO v_row FROM public.community_submissions WHERE file_path=v_res.consumed_path;
      IF FOUND THEN RETURN v_row; END IF;
    END IF;
    RAISE EXCEPTION 'invalid consumed reservation without matching submission' USING ERRCODE='22023';
  END IF;
  IF v_res.expires_at<=now() THEN RAISE EXCEPTION 'invalid or expired reservation' USING ERRCODE='22023'; END IF;
  INSERT INTO public.community_submissions(title,file_path,file_size,page_count,content_type,content_category,content_subcategory,subject,description,submitter_name,submitter_email,submitter_note,copyright_confirmed,user_id,content_hash,malware_status,review_warnings)
  VALUES(p_title,p_file_path,p_file_size,p_page_count,p_content_type,p_content_category,p_content_subcategory,p_subject,p_description,p_submitter_name,p_submitter_email,p_submitter_note,p_copyright_confirmed,p_user_id,p_content_hash,p_malware_status,COALESCE(p_review_warnings,'{}'::text[]))
  RETURNING * INTO v_row;
  UPDATE public.community_submission_reservations SET consumed_at=now(),consumed_path=p_file_path WHERE id=p_reservation_id;
  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.create_community_submission(uuid,text,text,text,bigint,integer,text,text,text,text,text,text,text,text,boolean,uuid,text,text,text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_community_submission(uuid,text,text,text,bigint,integer,text,text,text,text,text,text,text,text,boolean,uuid,text,text,text[]) TO service_role;

CREATE OR REPLACE FUNCTION public.moderate_community_submission(
  p_submission_id UUID, p_action TEXT, p_reason TEXT, p_reviewed_by TEXT
) RETURNS public.community_submissions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_row public.community_submissions; v_pdf_id UUID;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF;
  IF p_action NOT IN ('approve','reject') OR nullif(btrim(p_reviewed_by),'') IS NULL THEN RAISE EXCEPTION 'invalid moderation input' USING ERRCODE='22023'; END IF;
  IF p_action='reject' AND nullif(btrim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'rejection reason required' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_row FROM public.community_submissions WHERE id=p_submission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'submission not found' USING ERRCODE='P0002'; END IF;
  IF v_row.status <> 'pending' THEN
    IF p_action='approve' AND v_row.status='approved' AND v_row.approved_pdf_id IS NOT NULL THEN
      INSERT INTO public.pdf_jobs(pdf_id,job_type,idempotency_key,status,available_at,payload,updated_at)
      VALUES(v_row.approved_pdf_id,'process','process:'||v_row.approved_pdf_id,'queued',now(),'{}'::JSONB,now())
      ON CONFLICT(idempotency_key) DO UPDATE SET status=CASE WHEN public.pdf_jobs.status IN('completed','failed','dead') THEN 'queued' ELSE public.pdf_jobs.status END,attempts=CASE WHEN public.pdf_jobs.status IN('completed','failed','dead') THEN 0 ELSE public.pdf_jobs.attempts END,last_error=CASE WHEN public.pdf_jobs.status IN('completed','failed','dead') THEN NULL ELSE public.pdf_jobs.last_error END,completed_at=CASE WHEN public.pdf_jobs.status IN('completed','failed','dead') THEN NULL ELSE public.pdf_jobs.completed_at END,available_at=CASE WHEN public.pdf_jobs.status IN('completed','failed','dead') THEN now() ELSE public.pdf_jobs.available_at END,updated_at=now();
      RETURN v_row;
    END IF;
    IF p_action='reject' AND v_row.status='rejected' THEN RETURN v_row; END IF;
    RAISE EXCEPTION 'conflicting moderation transition' USING ERRCODE='P0001';
  END IF;
  IF p_action='approve' THEN
    IF v_row.malware_status<>'clean' THEN RAISE EXCEPTION 'submission safety review prevents approval' USING ERRCODE='22023'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.community_submission_reservations r JOIN storage.objects o ON o.bucket_id='community-pdfs' AND o.name=v_row.file_path WHERE r.expected_path=v_row.file_path AND r.consumed_path=v_row.file_path AND r.consumed_at IS NOT NULL) THEN
      RAISE EXCEPTION 'reservation-bound storage object is missing' USING ERRCODE='22023';
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('community-content:'||v_row.content_hash,0));
    IF EXISTS (SELECT 1 FROM public.pdfs p WHERE p.content_hash=v_row.content_hash) THEN
      RAISE EXCEPTION 'duplicate content: an existing PDF already uses this content hash' USING ERRCODE='23505';
    END IF;
    INSERT INTO public.pdfs(title,description,file_path,file_size,page_count,content_type,content_category,content_subcategory,subject,content_hash,contributed_by,category_id,structure_location,visibility,publish_status,processing_status,view_count,storage_bucket,malware_status,review_warnings)
    VALUES(v_row.title,v_row.description,v_row.file_path,v_row.file_size,v_row.page_count,v_row.content_type,v_row.content_category,v_row.content_subcategory,v_row.subject,v_row.content_hash,v_row.submitter_name,NULL,NULL,'public','published','queued',0,'community-pdfs','clean',to_jsonb(v_row.review_warnings)) RETURNING id INTO v_pdf_id;
    UPDATE public.community_submissions SET status='approved',reviewed_at=now(),reviewed_by=btrim(p_reviewed_by),approved_pdf_id=v_pdf_id,rejection_reason=NULL WHERE id=p_submission_id RETURNING * INTO v_row;
    INSERT INTO public.pdf_jobs(pdf_id,job_type,idempotency_key,status,available_at,payload,updated_at) VALUES(v_pdf_id,'process','process:'||v_pdf_id,'queued',now(),'{}'::JSONB,now());
  ELSE
    UPDATE public.community_submissions SET status='rejected',reviewed_at=now(),reviewed_by=btrim(p_reviewed_by),rejection_reason=btrim(p_reason) WHERE id=p_submission_id RETURNING * INTO v_row;
  END IF;
  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.moderate_community_submission(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_community_submission(uuid,text,text,text) TO service_role;
NOTIFY pgrst,'reload schema';
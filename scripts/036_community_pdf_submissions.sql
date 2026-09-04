-- Private, rate-limited community PDF intake and atomic moderation.
ALTER TABLE public.pdfs ADD COLUMN IF NOT EXISTS contributed_by text;
ALTER TABLE public.pdfs ADD COLUMN IF NOT EXISTS storage_bucket text NOT NULL DEFAULT 'pdfs'
  CHECK (storage_bucket IN ('pdfs', 'community-pdfs'));
-- The older global unique-title index made a duplicate warning an implicit
-- hard block. Community moderation intentionally permits an administrator to
-- approve a distinct document with a similar or identical title.
DROP INDEX IF EXISTS public.pdfs_normalized_title_unique;
CREATE INDEX IF NOT EXISTS pdfs_normalized_title_idx ON public.pdfs (lower(btrim(title)));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('community-pdfs', 'community-pdfs', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET public=false, file_size_limit=52428800, allowed_mime_types=ARRAY['application/pdf'];

CREATE TABLE IF NOT EXISTS public.community_submission_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash text NOT NULL CHECK (email_hash ~ '^[0-9a-f]{64}$'),
  ip_hash text NOT NULL CHECK (ip_hash ~ '^[0-9a-f]{64}$'),
  expected_path text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  consumed_path text,
  cleaned_at timestamptz,
  CHECK (expires_at > created_at),
  CHECK (consumed_path IS NULL OR consumed_path = expected_path),
  CHECK (cleaned_at IS NULL OR (consumed_at IS NULL AND cleaned_at >= created_at))
);

CREATE TABLE IF NOT EXISTS public.community_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  file_path text NOT NULL UNIQUE CHECK (file_path ~ '^community/[0-9a-f-]{36}\.pdf$'),
  file_size bigint NOT NULL CHECK (file_size BETWEEN 1 AND 52428800),
  page_count integer CHECK (page_count BETWEEN 1 AND 10000),
  content_type text NOT NULL CHECK (content_type IN ('exams','school','college','diploma')),
  content_category text NOT NULL CHECK (char_length(content_category) BETWEEN 1 AND 80),
  content_subcategory text NOT NULL CHECK (char_length(content_subcategory) BETWEEN 1 AND 160),
  subject text CHECK (subject IS NULL OR char_length(subject) BETWEEN 1 AND 120),
  description text CHECK (description IS NULL OR char_length(description) <= 300),
  submitter_name text NOT NULL CHECK (char_length(submitter_name) BETWEEN 1 AND 120),
  submitter_email text NOT NULL CHECK (char_length(submitter_email) BETWEEN 3 AND 254),
  submitter_note text CHECK (submitter_note IS NULL OR char_length(submitter_note) <= 1000),
  copyright_confirmed boolean NOT NULL CHECK (copyright_confirmed = true),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  rejection_reason text CHECK (rejection_reason IS NULL OR char_length(rejection_reason) BETWEEN 1 AND 1000),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text CHECK (reviewed_by IS NULL OR char_length(reviewed_by) BETWEEN 1 AND 160),
  approved_pdf_id uuid REFERENCES public.pdfs(id) ON DELETE SET NULL,
  content_hash text NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  malware_status text NOT NULL CHECK (malware_status IN ('clean','suspicious')),
  review_warnings text[] NOT NULL DEFAULT '{}'::text[]
    CHECK (cardinality(review_warnings) <= 20 AND array_position(review_warnings, NULL) IS NULL
      AND octet_length(array_to_string(review_warnings, '')) <= 6000),
  CHECK (
    (status = 'pending' AND reviewed_at IS NULL AND reviewed_by IS NULL AND approved_pdf_id IS NULL AND rejection_reason IS NULL)
    -- approved_pdf_id may later become NULL through ON DELETE SET NULL when an
    -- administrator removes the published PDF; the moderation audit remains.
    OR (status = 'approved' AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL AND rejection_reason IS NULL)
    OR (status = 'rejected' AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL AND approved_pdf_id IS NULL AND rejection_reason IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS community_reservations_email_window_idx
  ON public.community_submission_reservations(email_hash, created_at);
CREATE INDEX IF NOT EXISTS community_reservations_ip_window_idx
  ON public.community_submission_reservations(ip_hash, created_at);
CREATE INDEX IF NOT EXISTS community_reservations_expiry_idx
  ON public.community_submission_reservations(expires_at) WHERE consumed_at IS NULL;
CREATE INDEX IF NOT EXISTS community_reservations_cleanup_idx
  ON public.community_submission_reservations(expires_at) WHERE consumed_at IS NULL AND cleaned_at IS NULL;
CREATE INDEX IF NOT EXISTS community_submissions_status_time_idx
  ON public.community_submissions(status, submitted_at);
CREATE INDEX IF NOT EXISTS community_submissions_user_time_idx
  ON public.community_submissions(user_id, submitted_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS community_submissions_hash_idx ON public.community_submissions(content_hash);

ALTER TABLE public.community_submission_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_submission_reservations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.community_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_submissions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_submissions_own_read ON public.community_submissions;
CREATE POLICY community_submissions_own_read ON public.community_submissions
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
-- There are deliberately no client INSERT/UPDATE/DELETE policies and no
-- reservation policies. Service-role server code bypasses RLS.

REVOKE ALL ON TABLE public.community_submissions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.community_submission_reservations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.community_submissions TO authenticated;

CREATE OR REPLACE FUNCTION public.reserve_community_submission_slot(
  p_email_hash text, p_ip_hash text, p_ttl_seconds integer DEFAULT 3600
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_id uuid := gen_random_uuid(); v_since timestamptz := date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE = '42501'; END IF;
  IF p_email_hash !~ '^[0-9a-f]{64}$' OR p_ip_hash !~ '^[0-9a-f]{64}$' OR p_ttl_seconds NOT BETWEEN 60 AND 7200 THEN
    RAISE EXCEPTION 'invalid reservation input' USING ERRCODE = '22023';
  END IF;
  -- Serialize both identities in a stable order; transaction locks prevent
  -- concurrent requests from each observing the same count.
  PERFORM pg_advisory_xact_lock(LEAST(hashtextextended('e:' || p_email_hash, 0), hashtextextended('i:' || p_ip_hash, 0)));
  PERFORM pg_advisory_xact_lock(GREATEST(hashtextextended('e:' || p_email_hash, 0), hashtextextended('i:' || p_ip_hash, 0)));
  IF (SELECT count(*) FROM public.community_submission_reservations WHERE email_hash = p_email_hash AND created_at >= v_since) >= 5
     OR (SELECT count(*) FROM public.community_submission_reservations WHERE ip_hash = p_ip_hash AND created_at >= v_since) >= 5 THEN
    RAISE EXCEPTION 'daily submission limit reached' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.community_submission_reservations(id,email_hash,ip_hash,expected_path,expires_at)
  VALUES (v_id,p_email_hash,p_ip_hash,'community/' || v_id::text || '.pdf',now() + make_interval(secs => p_ttl_seconds));
  RETURN v_id;
END $$;

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
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_res FROM public.community_submission_reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND OR v_res.consumed_at IS NOT NULL OR v_res.expires_at <= now()
     OR v_res.email_hash <> p_email_hash OR v_res.expected_path <> p_file_path THEN
    RAISE EXCEPTION 'invalid or expired reservation' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.community_submissions(title,file_path,file_size,page_count,content_type,content_category,
    content_subcategory,subject,description,submitter_name,submitter_email,submitter_note,
    copyright_confirmed,user_id,content_hash,malware_status,review_warnings)
  VALUES (p_title,p_file_path,p_file_size,p_page_count,p_content_type,p_content_category,p_content_subcategory,
    p_subject,p_description,p_submitter_name,p_submitter_email,p_submitter_note,p_copyright_confirmed,p_user_id,p_content_hash,
    p_malware_status,COALESCE(p_review_warnings,'{}'::text[]))
  RETURNING * INTO v_row;
  UPDATE public.community_submission_reservations SET consumed_at=now(),consumed_path=p_file_path WHERE id=p_reservation_id;
  RETURN v_row;
END $$;

CREATE OR REPLACE FUNCTION public.moderate_community_submission(
  p_submission_id uuid, p_action text, p_reason text, p_reviewed_by text
) RETURNS public.community_submissions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_row public.community_submissions; v_pdf_id uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE = '42501'; END IF;
  IF p_action NOT IN ('approve','reject') OR nullif(btrim(p_reviewed_by),'') IS NULL THEN RAISE EXCEPTION 'invalid moderation input' USING ERRCODE='22023'; END IF;
  IF p_action='reject' AND nullif(btrim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'rejection reason required' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_row FROM public.community_submissions WHERE id=p_submission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'submission not found' USING ERRCODE='P0002'; END IF;
  IF v_row.status <> 'pending' THEN
    IF (p_action='approve' AND v_row.status='approved') OR (p_action='reject' AND v_row.status='rejected') THEN RETURN v_row; END IF;
    RAISE EXCEPTION 'conflicting moderation transition' USING ERRCODE='P0001';
  END IF;
  IF p_action='approve' THEN
    IF v_row.malware_status <> 'clean' THEN
      RAISE EXCEPTION 'submission safety review prevents approval' USING ERRCODE='22023';
    END IF;
    INSERT INTO public.pdfs(title,description,file_path,file_size,page_count,content_type,content_category,
      content_subcategory,subject,content_hash,contributed_by,category_id,structure_location,
      visibility,publish_status,processing_status,view_count,storage_bucket,malware_status,review_warnings)
    VALUES(v_row.title,v_row.description,v_row.file_path,v_row.file_size,v_row.page_count,v_row.content_type,
      v_row.content_category,v_row.content_subcategory,v_row.subject,v_row.content_hash,v_row.submitter_name,
      NULL,NULL,'public','published','queued',0,'community-pdfs','clean',to_jsonb(v_row.review_warnings)) RETURNING id INTO v_pdf_id;
    UPDATE public.community_submissions SET status='approved',reviewed_at=now(),reviewed_by=btrim(p_reviewed_by),
      approved_pdf_id=v_pdf_id,rejection_reason=NULL WHERE id=p_submission_id RETURNING * INTO v_row;
  ELSE
    UPDATE public.community_submissions SET status='rejected',reviewed_at=now(),reviewed_by=btrim(p_reviewed_by),
      rejection_reason=btrim(p_reason) WHERE id=p_submission_id RETURNING * INTO v_row;
  END IF;
  RETURN v_row;
END $$;

REVOKE ALL ON FUNCTION public.reserve_community_submission_slot(text,text,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_community_submission(uuid,text,text,text,bigint,integer,text,text,text,text,text,text,text,text,boolean,uuid,text,text,text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.moderate_community_submission(uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_community_submission_slot(text,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_community_submission(uuid,text,text,text,bigint,integer,text,text,text,text,text,text,text,text,boolean,uuid,text,text,text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.moderate_community_submission(uuid,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.find_pdfs_by_normalized_title(p_title text, p_exclude_id uuid DEFAULT NULL, p_limit integer DEFAULT 10)
RETURNS TABLE(id uuid, title text, file_path text, thumbnail_path text, storage_bucket text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT p.id, p.title, p.file_path, p.thumbnail_path, p.storage_bucket FROM public.pdfs p
  WHERE lower(btrim(p.title)) = lower(btrim(p_title)) AND (p_exclude_id IS NULL OR p.id <> p_exclude_id)
  ORDER BY p.created_at ASC, p.id ASC LIMIT LEAST(GREATEST(p_limit, 1), 50)
$$;
REVOKE ALL ON FUNCTION public.find_pdfs_by_normalized_title(text,uuid,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_pdfs_by_normalized_title(text,uuid,integer) TO service_role;

-- Re-deploy the public aggregate after adding the source safety invariant.
CREATE OR REPLACE FUNCTION public.get_public_pdf_stats()
RETURNS TABLE (total_pdfs bigint,total_downloads bigint,total_views bigint,avg_rating numeric,this_week_uploads bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::bigint,COALESCE(SUM(download_count),0)::bigint,COALESCE(SUM(view_count),0)::bigint,
    COALESCE(AVG(NULLIF(average_rating,0)),0)::numeric,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::bigint
  FROM public.pdfs
  WHERE visibility='public' AND publish_status='published'
    AND (storage_bucket <> 'community-pdfs' OR malware_status='clean')
    AND (scheduled_at IS NULL OR scheduled_at <= NOW())
$$;
REVOKE ALL ON FUNCTION public.get_public_pdf_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_pdf_stats() TO anon, authenticated, service_role;
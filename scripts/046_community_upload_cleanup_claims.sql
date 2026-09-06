-- Race-free claims for server-side deletion of expired private uploads.
ALTER TABLE public.community_submission_reservations
  ADD COLUMN IF NOT EXISTS cleanup_claim_token uuid,
  ADD COLUMN IF NOT EXISTS cleanup_claimed_at timestamptz;

CREATE OR REPLACE FUNCTION public.claim_expired_community_uploads(p_limit integer DEFAULT 20)
RETURNS TABLE(reservation_id uuid, expected_path text, claim_token uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF;
  IF p_limit NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'invalid cleanup limit' USING ERRCODE='22023'; END IF;
  RETURN QUERY
  WITH candidates AS (
    SELECT r.id FROM public.community_submission_reservations r
    WHERE r.expires_at <= now() AND r.consumed_at IS NULL AND r.cleaned_at IS NULL
      AND (r.cleanup_claim_token IS NULL OR r.cleanup_claimed_at < now() - interval '5 minutes')
    ORDER BY r.expires_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  ), claimed AS (
    UPDATE public.community_submission_reservations r
    SET cleanup_claim_token=gen_random_uuid(), cleanup_claimed_at=now()
    FROM candidates c WHERE r.id=c.id
    RETURNING r.id,r.expected_path,r.cleanup_claim_token
  ) SELECT claimed.id,claimed.expected_path,claimed.cleanup_claim_token FROM claimed;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_community_upload_cleanup(
  p_reservation_id uuid, p_claim_token uuid, p_removed boolean
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF;
  IF p_reservation_id IS NULL OR p_claim_token IS NULL THEN RAISE EXCEPTION 'invalid cleanup claim' USING ERRCODE='22023'; END IF;
  IF p_removed THEN
    UPDATE public.community_submission_reservations
    SET cleaned_at=now(),cleanup_claim_token=NULL,cleanup_claimed_at=NULL
    WHERE id=p_reservation_id AND cleanup_claim_token=p_claim_token;
  ELSE
    UPDATE public.community_submission_reservations
    SET cleanup_claim_token=NULL,cleanup_claimed_at=NULL
    WHERE id=p_reservation_id AND cleanup_claim_token=p_claim_token;
  END IF;
  RETURN FOUND;
END;
$$;

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
  IF v_res.cleaned_at IS NOT NULL THEN RAISE EXCEPTION 'invalid or expired reservation' USING ERRCODE='22023'; END IF;
  IF v_res.cleanup_claim_token IS NOT NULL AND v_res.cleanup_claimed_at >= now() - interval '5 minutes' THEN
    RAISE EXCEPTION 'reservation cleanup in progress' USING ERRCODE='55P03';
  END IF;
  IF v_res.expires_at<=now() THEN RAISE EXCEPTION 'invalid or expired reservation' USING ERRCODE='22023'; END IF;
  INSERT INTO public.community_submissions(title,file_path,file_size,page_count,content_type,content_category,content_subcategory,subject,description,submitter_name,submitter_email,submitter_note,copyright_confirmed,user_id,content_hash,malware_status,review_warnings)
  VALUES(p_title,p_file_path,p_file_size,p_page_count,p_content_type,p_content_category,p_content_subcategory,p_subject,p_description,p_submitter_name,p_submitter_email,p_submitter_note,p_copyright_confirmed,p_user_id,p_content_hash,p_malware_status,COALESCE(p_review_warnings,'{}'::text[]))
  RETURNING * INTO v_row;
  UPDATE public.community_submission_reservations SET consumed_at=now(),consumed_path=p_file_path WHERE id=p_reservation_id;
  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_expired_community_uploads(integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.finish_community_upload_cleanup(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.create_community_submission(uuid,text,text,text,bigint,integer,text,text,text,text,text,text,text,text,boolean,uuid,text,text,text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_expired_community_uploads(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_community_upload_cleanup(uuid,uuid,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_community_submission(uuid,text,text,text,bigint,integer,text,text,text,text,text,text,text,text,boolean,uuid,text,text,text[]) TO service_role;
NOTIFY pgrst,'reload schema';
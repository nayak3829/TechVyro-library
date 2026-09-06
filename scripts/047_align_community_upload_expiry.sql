-- Supabase signed upload URLs remain usable for 7,200 seconds. Keep a further
-- one-hour margin so an upload completing near URL expiry can still finalize
-- before the durable cleanup protocol claims its reservation.
CREATE OR REPLACE FUNCTION public.reserve_community_submission_slot(
  p_email_hash text, p_ip_hash text, p_ttl_seconds integer DEFAULT 10800
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_id uuid := gen_random_uuid(); v_since timestamptz := date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE = '42501'; END IF;
  IF p_email_hash !~ '^[0-9a-f]{64}$' OR p_ip_hash !~ '^[0-9a-f]{64}$' OR p_ttl_seconds NOT BETWEEN 10800 AND 14400 THEN
    RAISE EXCEPTION 'invalid reservation input' USING ERRCODE = '22023';
  END IF;
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

REVOKE ALL ON FUNCTION public.reserve_community_submission_slot(text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_community_submission_slot(text,text,integer) TO service_role;
NOTIFY pgrst,'reload schema';
-- PostgreSQL 17 treats the partial-index conflict target `event_key` as
-- ambiguous because the analytics RPCs also expose an `event_key` parameter.
-- Keep the public RPC argument names stable and qualify parameter references.

CREATE OR REPLACE FUNCTION increment_view_count(pdf_id UUID, event_key TEXT DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  inserted_id BIGINT;
  new_count INTEGER;
BEGIN
  INSERT INTO analytics_events(pdf_id, event_type, event_key)
  VALUES (increment_view_count.pdf_id, 'view', NULLIF(increment_view_count.event_key, ''))
  ON CONFLICT DO NOTHING
  RETURNING id INTO inserted_id;

  IF inserted_id IS NULL THEN
    SELECT COALESCE(view_count, 0) INTO new_count FROM pdfs WHERE id = increment_view_count.pdf_id;
    RETURN new_count;
  END IF;

  UPDATE pdfs
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = increment_view_count.pdf_id
  RETURNING view_count INTO new_count;

  IF new_count IS NULL THEN RAISE EXCEPTION 'PDF not found'; END IF;
  RETURN new_count;
END;
$$;

CREATE OR REPLACE FUNCTION increment_download_count(pdf_id UUID, event_key TEXT DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  inserted_id BIGINT;
  new_count INTEGER;
BEGIN
  INSERT INTO analytics_events(pdf_id, event_type, event_key)
  VALUES (increment_download_count.pdf_id, 'download', NULLIF(increment_download_count.event_key, ''))
  ON CONFLICT DO NOTHING
  RETURNING id INTO inserted_id;

  IF inserted_id IS NULL THEN
    SELECT COALESCE(download_count, 0) INTO new_count FROM pdfs WHERE id = increment_download_count.pdf_id;
    RETURN new_count;
  END IF;

  UPDATE pdfs
  SET download_count = COALESCE(download_count, 0) + 1
  WHERE id = increment_download_count.pdf_id
  RETURNING download_count INTO new_count;

  IF new_count IS NULL THEN RAISE EXCEPTION 'PDF not found'; END IF;
  RETURN new_count;
END;
$$;

REVOKE ALL ON FUNCTION increment_view_count(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION increment_download_count(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_view_count(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION increment_download_count(UUID, TEXT) TO service_role;
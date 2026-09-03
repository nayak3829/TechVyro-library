ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS audit_events_actor_type_check;
UPDATE audit_events SET actor_type = 'server' WHERE actor_type = 'admin_server';
ALTER TABLE audit_events
  ADD CONSTRAINT audit_events_actor_type_check
  CHECK (actor_type IN ('user', 'server', 'system'));

CREATE OR REPLACE FUNCTION capture_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  row_data JSONB;
  previous_data JSONB;
  record_action TEXT;
  record_id TEXT;
  record_summary TEXT;
  request_role TEXT;
  record_actor TEXT;
  changed_fields JSONB := '[]'::JSONB;
BEGIN
  row_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  previous_data := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END;
  record_action := CASE TG_OP WHEN 'INSERT' THEN 'created' WHEN 'UPDATE' THEN 'updated' ELSE 'deleted' END;
  record_id := COALESCE(row_data->>'id', row_data->>'key', 'unknown');
  record_summary := LEFT(CASE TG_TABLE_NAME
    WHEN 'pdfs' THEN COALESCE(row_data->>'title', 'PDF ' || record_id)
    WHEN 'categories' THEN COALESCE(row_data->>'name', 'Category ' || record_id)
    WHEN 'quizzes' THEN COALESCE(row_data->>'title', 'Quiz ' || record_id)
    WHEN 'folders' THEN COALESCE(row_data->>'name', 'Folder ' || record_id)
    WHEN 'content_folders' THEN COALESCE(row_data->>'name', 'Content folder ' || record_id)
    WHEN 'content_sections' THEN COALESCE(row_data->>'title', 'Content section ' || record_id)
    WHEN 'site_settings' THEN 'Site setting'
    ELSE INITCAP(REPLACE(TG_TABLE_NAME, '_', ' ')) || ' ' || record_id
  END, 300);

  request_role := COALESCE(current_setting('request.jwt.claim.role', true), '');
  record_actor := CASE
    WHEN request_role = 'authenticated' THEN 'user'
    WHEN request_role = 'service_role' THEN 'server'
    ELSE 'system'
  END;

  IF TG_OP = 'UPDATE' THEN
    SELECT COALESCE(jsonb_agg(key ORDER BY key), '[]'::JSONB)
    INTO changed_fields
    FROM jsonb_object_keys(row_data) AS fields(key)
    WHERE row_data->key IS DISTINCT FROM previous_data->key;
  END IF;

  INSERT INTO audit_events(action, resource_type, resource_id, actor_type, summary, metadata)
  VALUES (
    record_action, TG_TABLE_NAME, record_id, record_actor, record_summary,
    CASE WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('changed_fields', changed_fields) ELSE '{}'::JSONB END
  );
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

REVOKE ALL ON TABLE audit_events FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON TABLE audit_events TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$
DECLARE
  existing_job BIGINT;
BEGIN
  SELECT jobid INTO existing_job FROM cron.job WHERE jobname = 'purge-expired-audit-events';
  IF existing_job IS NOT NULL THEN PERFORM cron.unschedule(existing_job); END IF;
  PERFORM cron.schedule(
    'purge-expired-audit-events',
    '17 3 * * *',
    'SELECT public.purge_expired_audit_events(365)'
  );
END;
$$;
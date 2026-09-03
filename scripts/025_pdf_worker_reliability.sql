-- Reliability follow-up for the Smart PDF pipeline. Apply through migrations;
-- this file is intentionally never executed by the application.
CREATE UNIQUE INDEX IF NOT EXISTS pdfs_content_hash_unique_idx
  ON public.pdfs(content_hash) WHERE content_hash IS NOT NULL;

ALTER TABLE public.pdf_jobs
  ADD COLUMN IF NOT EXISTS lease_token uuid;

-- Older deployments have the exact constraint created by 023. Replace it
-- safely so daily is accepted without depending on constraint rename support.
ALTER TABLE public.pdfs DROP CONSTRAINT IF EXISTS pdfs_notification_preference_check;
ALTER TABLE public.pdfs
  ADD CONSTRAINT pdfs_notification_preference_check
  CHECK (notification_preference IN ('immediate','daily','scheduled','none'));

ALTER TABLE public.pdfs
  ADD COLUMN IF NOT EXISTS notification_claim_token uuid,
  ADD COLUMN IF NOT EXISTS notification_claimed_at timestamptz;

CREATE INDEX IF NOT EXISTS pdfs_notification_due_idx
  ON public.pdfs(notification_state, notification_preference, publish_status, notification_claimed_at);
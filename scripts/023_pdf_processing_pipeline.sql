-- Smart PDF processing pipeline. Safe to run repeatedly after older schemas.
ALTER TABLE public.pdfs
  ADD COLUMN IF NOT EXISTS processing_status text NOT NULL DEFAULT 'queued',
  ADD COLUMN IF NOT EXISTS processing_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS processing_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS processing_error text,
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS page_count integer,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS extracted_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS extracted_text text,
  ADD COLUMN IF NOT EXISTS thumbnail_path text,
  ADD COLUMN IF NOT EXISTS review_warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS malware_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS ocr_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS ocr_confidence numeric,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS seo_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS publish_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS notification_preference text NOT NULL DEFAULT 'immediate',
  ADD COLUMN IF NOT EXISTS notification_state text NOT NULL DEFAULT 'not_sent',
  ADD COLUMN IF NOT EXISTS notification_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notification_error text,
  ADD COLUMN IF NOT EXISTS notification_sent_at timestamptz;

-- Preserve the visibility semantics of records created before this pipeline.
UPDATE public.pdfs
SET publish_status = 'published'
WHERE publish_status = 'draft' AND visibility IN ('public', 'unlisted');

DO $$ BEGIN
  ALTER TABLE public.pdfs ADD CONSTRAINT pdfs_processing_status_check CHECK (processing_status IN ('queued','processing','completed','failed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.pdfs ADD CONSTRAINT pdfs_malware_status_check CHECK (malware_status IN ('pending','clean','suspicious','blocked','unknown'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.pdfs ADD CONSTRAINT pdfs_ocr_status_check CHECK (ocr_status IN ('pending','not_required','processing','completed','failed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.pdfs ADD CONSTRAINT pdfs_publish_status_check CHECK (publish_status IN ('draft','needs_review','published','rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.pdfs ADD CONSTRAINT pdfs_notification_preference_check CHECK (notification_preference IN ('immediate','scheduled','none'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.pdf_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_id uuid NOT NULL REFERENCES public.pdfs(id) ON DELETE CASCADE,
  job_type text NOT NULL CHECK (job_type IN ('process','notify')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','dead')),
  idempotency_key text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  available_at timestamptz NOT NULL DEFAULT now(),
  leased_at timestamptz,
  lease_expires_at timestamptz,
  last_error text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (idempotency_key)
);
CREATE INDEX IF NOT EXISTS pdfs_content_hash_idx ON public.pdfs(content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS pdfs_publish_status_idx ON public.pdfs(publish_status);
CREATE INDEX IF NOT EXISTS pdf_jobs_ready_idx ON public.pdf_jobs(status, available_at);
CREATE INDEX IF NOT EXISTS pdf_jobs_pdf_idx ON public.pdf_jobs(pdf_id);
ALTER TABLE public.pdf_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pdf jobs admin only" ON public.pdf_jobs;
CREATE POLICY "pdf jobs admin only" ON public.pdf_jobs USING (false) WITH CHECK (false);
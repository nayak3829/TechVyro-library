-- Follow-up to 023_pdf_processing_pipeline.sql. Do not run this file from the
-- application; apply it through the normal migration process.
ALTER TABLE public.pdfs
  ADD COLUMN IF NOT EXISTS text_fingerprint text;

ALTER TABLE public.pdf_jobs
  ALTER COLUMN pdf_id DROP NOT NULL;

ALTER TABLE public.pdf_jobs DROP CONSTRAINT IF EXISTS pdf_jobs_job_type_check;
ALTER TABLE public.pdf_jobs
  ADD CONSTRAINT pdf_jobs_job_type_check CHECK (job_type IN ('process', 'notify', 'cleanup'));

CREATE INDEX IF NOT EXISTS pdf_jobs_due_idx
  ON public.pdf_jobs (available_at, status, job_type);
CREATE INDEX IF NOT EXISTS pdfs_text_fingerprint_idx
  ON public.pdfs (text_fingerprint) WHERE text_fingerprint IS NOT NULL;
CREATE INDEX IF NOT EXISTS pdfs_thumbnail_path_idx
  ON public.pdfs (thumbnail_path) WHERE thumbnail_path IS NOT NULL;
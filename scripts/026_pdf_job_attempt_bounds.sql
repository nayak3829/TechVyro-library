-- Keep retry configuration bounded even when jobs are inserted outside the app.
UPDATE public.pdf_jobs
SET max_attempts = LEAST(20, GREATEST(1, max_attempts))
WHERE max_attempts < 1 OR max_attempts > 20;

ALTER TABLE public.pdf_jobs
  DROP CONSTRAINT IF EXISTS pdf_jobs_max_attempts_check;

ALTER TABLE public.pdf_jobs
  ADD CONSTRAINT pdf_jobs_max_attempts_check
  CHECK (max_attempts BETWEEN 1 AND 20);
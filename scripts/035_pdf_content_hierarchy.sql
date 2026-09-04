-- Generic PDF content hierarchy. Nullable columns preserve legacy records.
ALTER TABLE public.pdfs
  ADD COLUMN IF NOT EXISTS content_type TEXT,
  ADD COLUMN IF NOT EXISTS content_category TEXT,
  ADD COLUMN IF NOT EXISTS content_subcategory TEXT,
  ADD COLUMN IF NOT EXISTS subject TEXT;

ALTER TABLE public.pdfs DROP CONSTRAINT IF EXISTS pdfs_content_type_check;
ALTER TABLE public.pdfs
  ADD CONSTRAINT pdfs_content_type_check
  CHECK (content_type IS NULL OR content_type IN ('exams', 'school', 'college', 'diploma'));

CREATE INDEX IF NOT EXISTS idx_pdfs_content_type ON public.pdfs (content_type);
CREATE INDEX IF NOT EXISTS idx_pdfs_content_hierarchy
  ON public.pdfs (content_type, content_category, content_subcategory);
CREATE INDEX IF NOT EXISTS idx_pdfs_subject ON public.pdfs (subject) WHERE subject IS NOT NULL;

-- Only fill missing generic metadata. The relational category and all existing
-- generic values remain authoritative and are never overwritten.
UPDATE public.pdfs AS p
SET
  content_type = COALESCE(p.content_type, 'exams'),
  content_category = COALESCE(p.content_category, 'SSC')
FROM public.categories AS c
WHERE p.category_id = c.id
  AND lower(trim(c.name)) = 'ssc'
  AND (p.content_type IS NULL OR p.content_category IS NULL);
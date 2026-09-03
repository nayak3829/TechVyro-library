-- Prevent concurrent uploads from creating duplicate PDF titles.
-- Titles are compared case-insensitively after trimming surrounding whitespace.
CREATE UNIQUE INDEX IF NOT EXISTS pdfs_normalized_title_unique
  ON public.pdfs (lower(btrim(title)));
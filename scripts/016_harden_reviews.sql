-- Reviews are submitted by authenticated users and may only be read when the
-- referenced PDF itself is publicly accessible.
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS user_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_one_per_user_pdf
  ON reviews(pdf_id, user_id) WHERE user_id IS NOT NULL;

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reviews are publicly readable" ON reviews;
DROP POLICY IF EXISTS "Allow public read on reviews" ON reviews;
DROP POLICY IF EXISTS "Allow public insert on reviews" ON reviews;
DROP POLICY IF EXISTS "Authenticated users insert own reviews" ON reviews;

CREATE POLICY "Visible PDF reviews are publicly readable"
  ON reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM pdfs
      WHERE pdfs.id = reviews.pdf_id
        AND pdfs.visibility IN ('public', 'unlisted')
        AND (pdfs.scheduled_at IS NULL OR pdfs.scheduled_at <= NOW())
    )
  );

CREATE POLICY "Authenticated users insert own reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()::TEXT
    AND EXISTS (
      SELECT 1
      FROM pdfs
      WHERE pdfs.id = reviews.pdf_id
        AND pdfs.visibility IN ('public', 'unlisted')
        AND (pdfs.scheduled_at IS NULL OR pdfs.scheduled_at <= NOW())
    )
  );

CREATE OR REPLACE FUNCTION update_pdf_review_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    UPDATE pdfs
    SET average_rating = (SELECT AVG(rating)::DECIMAL(2,1) FROM reviews WHERE pdf_id = OLD.pdf_id),
        review_count = (SELECT COUNT(*) FROM reviews WHERE pdf_id = OLD.pdf_id)
    WHERE id = OLD.pdf_id;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE pdfs
    SET average_rating = (SELECT AVG(rating)::DECIMAL(2,1) FROM reviews WHERE pdf_id = NEW.pdf_id),
        review_count = (SELECT COUNT(*) FROM reviews WHERE pdf_id = NEW.pdf_id)
    WHERE id = NEW.pdf_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

UPDATE pdfs
SET average_rating = stats.average_rating,
    review_count = stats.review_count
FROM (
  SELECT pdfs.id,
         AVG(reviews.rating)::DECIMAL(2,1) AS average_rating,
         COUNT(reviews.id)::INTEGER AS review_count
  FROM pdfs
  LEFT JOIN reviews ON reviews.pdf_id = pdfs.id
  GROUP BY pdfs.id
) AS stats
WHERE pdfs.id = stats.id;
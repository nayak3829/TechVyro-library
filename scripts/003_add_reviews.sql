-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_id UUID NOT NULL REFERENCES pdfs(id) ON DELETE CASCADE,
  user_name VARCHAR(100) NOT NULL,
  user_id TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add average_rating and review_count to pdfs table
ALTER TABLE pdfs 
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(2,1) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reviews_pdf_id ON reviews(pdf_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_one_per_user_pdf
  ON reviews(pdf_id, user_id) WHERE user_id IS NOT NULL;

-- Create function to update PDF stats after review
CREATE OR REPLACE FUNCTION update_pdf_review_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    UPDATE pdfs
    SET average_rating = (SELECT AVG(rating)::DECIMAL(2,1) FROM reviews WHERE pdf_id = OLD.pdf_id),
        review_count = (SELECT COUNT(*) FROM reviews WHERE pdf_id = OLD.pdf_id)
    WHERE id = OLD.pdf_id;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE pdfs
  SET 
        average_rating = (SELECT AVG(rating)::DECIMAL(2,1) FROM reviews WHERE pdf_id = NEW.pdf_id),
        review_count = (SELECT COUNT(*) FROM reviews WHERE pdf_id = NEW.pdf_id)
    WHERE id = NEW.pdf_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_pdf_review_stats ON reviews;
CREATE TRIGGER trigger_update_pdf_review_stats
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_pdf_review_stats();

REVOKE EXECUTE ON FUNCTION public.update_pdf_review_stats() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_pdf_review_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_pdf_review_stats() FROM authenticated;

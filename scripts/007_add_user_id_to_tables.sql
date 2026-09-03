-- Create pdf_favorites table if it doesn't exist
CREATE TABLE IF NOT EXISTS pdf_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT,
  user_id TEXT DEFAULT NULL,
  pdf_id UUID REFERENCES pdfs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE pdf_favorites ENABLE ROW LEVEL SECURITY;

-- Policy (drop first to avoid duplicate error)
DROP POLICY IF EXISTS "Allow all on pdf_favorites" ON pdf_favorites;
CREATE POLICY "Allow all on pdf_favorites" ON pdf_favorites
  FOR ALL USING (true) WITH CHECK (true);

-- Add user_id to quiz_results (safe — no-op if column already exists)
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pdf_favorites_device_id ON pdf_favorites(device_id);
CREATE INDEX IF NOT EXISTS idx_pdf_favorites_user_id ON pdf_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_favorites_pdf_id ON pdf_favorites(pdf_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON quiz_results(user_id);

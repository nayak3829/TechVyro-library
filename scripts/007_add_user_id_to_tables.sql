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

-- Favorites are accessed through service-role application routes only.
DROP POLICY IF EXISTS "Allow all on pdf_favorites" ON pdf_favorites;
DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pdf_favorites'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON pdf_favorites', policy_name);
  END LOOP;
END
$$;
REVOKE ALL PRIVILEGES ON TABLE pdf_favorites FROM anon, authenticated;

-- Add user_id to quiz_results (safe — no-op if column already exists)
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pdf_favorites_device_id ON pdf_favorites(device_id);
CREATE INDEX IF NOT EXISTS idx_pdf_favorites_user_id ON pdf_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_favorites_pdf_id ON pdf_favorites(pdf_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON quiz_results(user_id);

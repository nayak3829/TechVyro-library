-- ============================================================
-- TechVyro Library — COMPLETE DATABASE SETUP (A to Z)
-- Run this ONCE in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. CATEGORIES TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#8B5CF6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow public read access on categories" ON categories FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO categories (name, slug, color) VALUES
  ('Technology', 'technology', '#3B82F6'),
  ('Business', 'business', '#10B981'),
  ('Education', 'education', '#8B5CF6'),
  ('Health', 'health', '#EC4899'),
  ('Science', 'science', '#F59E0B')
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────
-- 2. PDFS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  average_rating DECIMAL(2,1) DEFAULT NULL,
  review_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT NULL,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted', 'private')),
  scheduled_at TIMESTAMPTZ DEFAULT NULL,
  allow_download BOOLEAN DEFAULT TRUE,
  slug TEXT DEFAULT NULL,
  structure_location JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pdfs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public PDFs are readable" ON pdfs
    FOR SELECT TO anon, authenticated USING (visibility = 'public');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS pdfs_slug_unique ON pdfs(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pdfs_category_id ON pdfs(category_id);
CREATE INDEX IF NOT EXISTS idx_pdfs_created_at ON pdfs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdfs_view_count ON pdfs(view_count DESC);
CREATE INDEX IF NOT EXISTS pdfs_tags_idx ON pdfs USING GIN(tags);
CREATE INDEX IF NOT EXISTS pdfs_visibility_idx ON pdfs(visibility);
CREATE INDEX IF NOT EXISTS pdfs_scheduled_at_idx ON pdfs(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS pdfs_structure_location_idx ON pdfs USING GIN(structure_location);

-- ─────────────────────────────────────────────
-- 3. REVIEWS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_id UUID NOT NULL REFERENCES pdfs(id) ON DELETE CASCADE,
  user_name VARCHAR(100) NOT NULL,
  user_id TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Visible PDF reviews are publicly readable"
    ON reviews FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM pdfs
        WHERE pdfs.id = reviews.pdf_id
          AND pdfs.visibility IN ('public', 'unlisted')
          AND (pdfs.scheduled_at IS NULL OR pdfs.scheduled_at <= NOW())
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users insert own reviews"
    ON reviews FOR INSERT TO authenticated
    WITH CHECK (
      user_id = auth.uid()::TEXT
      AND EXISTS (
        SELECT 1 FROM pdfs
        WHERE pdfs.id = reviews.pdf_id
          AND pdfs.visibility IN ('public', 'unlisted')
          AND (pdfs.scheduled_at IS NULL OR pdfs.scheduled_at <= NOW())
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_reviews_pdf_id ON reviews(pdf_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_one_per_user_pdf
  ON reviews(pdf_id, user_id) WHERE user_id IS NOT NULL;

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
    SET average_rating = (SELECT AVG(rating)::DECIMAL(2,1) FROM reviews WHERE pdf_id = NEW.pdf_id),
        review_count = (SELECT COUNT(*) FROM reviews WHERE pdf_id = NEW.pdf_id)
    WHERE id = NEW.pdf_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trigger_update_pdf_review_stats ON reviews;
CREATE TRIGGER trigger_update_pdf_review_stats
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_pdf_review_stats();

REVOKE EXECUTE ON FUNCTION public.update_pdf_review_stats() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_pdf_review_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_pdf_review_stats() FROM authenticated;

-- ─────────────────────────────────────────────
-- 4. QUIZ TABLES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'General',
  time_limit INTEGER DEFAULT 1200,
  questions JSONB DEFAULT '[]',
  enabled BOOLEAN DEFAULT TRUE,
  tags TEXT[] DEFAULT '{}',
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted', 'private')),
  section TEXT DEFAULT 'General',
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  structure_location JSONB DEFAULT NULL,
  negative_marking DECIMAL(6,2) DEFAULT 0 CHECK (negative_marking >= 0 AND negative_marking <= 100),
  passing_percentage DECIMAL(5,2) DEFAULT 0 CHECK (passing_percentage >= 0 AND passing_percentage <= 100),
  shuffle_questions BOOLEAN DEFAULT FALSE,
  shuffle_options BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_results (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  score DECIMAL(10,2) DEFAULT 0,
  percentage DECIMAL(5,2) DEFAULT 0,
  correct INTEGER DEFAULT 0,
  wrong INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  total_time INTEGER DEFAULT 0,
  quiz_id TEXT REFERENCES quizzes(id) ON DELETE SET NULL,
  quiz_title TEXT DEFAULT '',
  user_id TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow public read on quizzes" ON quizzes
    FOR SELECT USING (enabled = TRUE AND visibility IN ('public', 'unlisted'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users read own quiz results" ON quiz_results
    FOR SELECT TO authenticated USING ((auth.uid())::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_quizzes_enabled ON quizzes(enabled);
CREATE INDEX IF NOT EXISTS idx_quizzes_category ON quizzes(category);
CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_id ON quiz_results(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_percentage ON quiz_results(percentage DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_results_created_at ON quiz_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON quiz_results(user_id);

-- ─────────────────────────────────────────────
-- 5. SITE SETTINGS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_settings (
  "key" TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on site_settings" ON site_settings;
DROP POLICY IF EXISTS "Allow upsert on site_settings" ON site_settings;
DROP POLICY IF EXISTS "Allow update on site_settings" ON site_settings;
DROP POLICY IF EXISTS "Public site settings are readable" ON site_settings;

-- ─────────────────────────────────────────────
-- 6. ADMIN CHAT TABLES (SERVER ONLY)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_chat_sessions (
  id UUID PRIMARY KEY,
  student_name TEXT NOT NULL CHECK (char_length(student_name) BETWEEN 1 AND 80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES admin_chat_sessions(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('student', 'admin')),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  telegram_message_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_chat_sessions_last_message
  ON admin_chat_sessions(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_chat_messages_session_created
  ON admin_chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_chat_messages_telegram
  ON admin_chat_messages(telegram_message_id)
  WHERE telegram_message_id IS NOT NULL;

ALTER TABLE admin_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_chat_messages ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- 7. PDF FAVORITES TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pdf_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT,
  user_id TEXT DEFAULT NULL,
  pdf_id UUID REFERENCES pdfs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pdf_favorites ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_pdf_favorites_device_id ON pdf_favorites(device_id);
CREATE INDEX IF NOT EXISTS idx_pdf_favorites_user_id ON pdf_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_favorites_pdf_id ON pdf_favorites(pdf_id);

-- ─────────────────────────────────────────────
-- 7. RELOAD SCHEMA CACHE (fixes "schema cache" errors)
-- ─────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────
-- DONE! All tables created successfully.
-- ─────────────────────────────────────────────

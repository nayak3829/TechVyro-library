-- ============================================================
-- TechVyro Library — COMPLETE DATABASE SETUP (A to Z)
-- Safe to rerun in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
  page_count INTEGER,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  content_type TEXT,
  content_category TEXT,
  content_subcategory TEXT,
  subject TEXT,
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
  malware_status TEXT NOT NULL DEFAULT 'clean'
    CHECK (malware_status IN ('pending','clean','suspicious','blocked','unknown')),
  publish_status TEXT NOT NULL DEFAULT 'published'
    CHECK (publish_status IN ('draft','needs_review','published','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pdfs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public PDFs are readable" ON pdfs
    FOR SELECT TO anon, authenticated USING (
      visibility = 'public'
      AND publish_status = 'published'
      AND malware_status = 'clean'
      AND (scheduled_at IS NULL OR scheduled_at <= NOW())
    );
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
           AND pdfs.visibility = 'public'
           AND pdfs.publish_status = 'published'
           AND pdfs.malware_status = 'clean'
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
           AND pdfs.visibility = 'public'
           AND pdfs.publish_status = 'published'
           AND pdfs.malware_status = 'clean'
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
  question_count INTEGER GENERATED ALWAYS AS (
    CASE WHEN jsonb_typeof(questions) = 'array' THEN jsonb_array_length(questions) ELSE 0 END
  ) STORED,
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

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS question_count INTEGER GENERATED ALWAYS AS (
    CASE WHEN jsonb_typeof(questions) = 'array' THEN jsonb_array_length(questions) ELSE 0 END
  ) STORED;

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

-- Quiz questions include answer keys. Only service-role server routes may read
-- this table, and public routes project metadata explicitly.
REVOKE ALL PRIVILEGES ON TABLE public.quizzes FROM PUBLIC, anon, authenticated;

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
DROP POLICY IF EXISTS "Public site settings allow-list" ON site_settings;
REVOKE ALL PRIVILEGES ON TABLE public.site_settings FROM PUBLIC, anon, authenticated;

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

CREATE INDEX IF NOT EXISTS idx_pdf_favorites_device_id ON pdf_favorites(device_id);
CREATE INDEX IF NOT EXISTS idx_pdf_favorites_user_id ON pdf_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_favorites_pdf_id ON pdf_favorites(pdf_id);

-- ─────────────────────────────────────────────
-- 8. LEAST-PRIVILEGE CLIENT GRANTS
-- ─────────────────────────────────────────────
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

GRANT SELECT ON TABLE
  public.categories,
  public.pdfs,
  public.reviews
TO anon, authenticated;
GRANT SELECT ON TABLE public.quiz_results TO authenticated;
GRANT INSERT ON TABLE public.reviews TO authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.site_settings FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.quizzes FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO service_role;

-- ─────────────────────────────────────────────
-- 9. RELOAD SCHEMA CACHE (fixes "schema cache" errors)
-- ─────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────
-- DONE! All tables created successfully.
-- ─────────────────────────────────────────────

-- Homepage catalogue payload (also available as migration 044).
CREATE OR REPLACE FUNCTION public.get_homepage_pdfs()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service_role required' USING ERRCODE = '42501';
  END IF;

  RETURN (
  WITH visible AS MATERIALIZED (
    SELECT
      p.id, p.title, p.description, p.file_size, p.page_count, p.category_id,
      p.download_count, p.view_count, p.average_rating, p.created_at, p.updated_at,
      p.allow_download, p.tags, p.content_type, p.content_category,
      p.content_subcategory, p.subject,
      CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', c.id, 'name', c.name, 'slug', c.slug, 'color', c.color, 'created_at', c.created_at
      ) END AS category
    FROM public.pdfs p
    LEFT JOIN public.categories c ON c.id = p.category_id
    WHERE p.visibility = 'public'
      AND p.publish_status = 'published'
      AND p.malware_status = 'clean'
      AND (p.scheduled_at IS NULL OR p.scheduled_at <= NOW())
  ),
  library AS (
    SELECT 'library'::TEXT AS bucket, row_number() OVER (ORDER BY created_at DESC) AS rank, visible.*
    FROM visible ORDER BY created_at DESC LIMIT 60
  ),
  popular AS (
    SELECT 'popular'::TEXT AS bucket, row_number() OVER (ORDER BY download_count DESC) AS rank, visible.*
    FROM visible WHERE download_count > 0 ORDER BY download_count DESC LIMIT 4
  ),
  trending AS (
    SELECT 'trending'::TEXT AS bucket, row_number() OVER (ORDER BY view_count DESC) AS rank, visible.*
    FROM visible WHERE view_count > 0 ORDER BY view_count DESC LIMIT 4
  ),
  top_rated AS (
    SELECT 'topRated'::TEXT AS bucket, row_number() OVER (ORDER BY average_rating DESC) AS rank, visible.*
    FROM visible WHERE average_rating > 0 ORDER BY average_rating DESC LIMIT 4
  ),
  ranked AS (
    SELECT * FROM library
    UNION ALL SELECT * FROM popular
    UNION ALL SELECT * FROM trending
    UNION ALL SELECT * FROM top_rated
  ),
  unique_rows AS (
    SELECT DISTINCT ON (id) * FROM ranked ORDER BY id
  )
  SELECT jsonb_build_object(
    'pdfs', COALESCE((SELECT jsonb_agg(to_jsonb(unique_rows) - 'bucket' - 'rank') FROM unique_rows), '[]'::JSONB),
    'libraryIds', COALESCE((SELECT jsonb_agg(id ORDER BY rank) FROM ranked WHERE bucket = 'library'), '[]'::JSONB),
    'popularIds', COALESCE((SELECT jsonb_agg(id ORDER BY rank) FROM ranked WHERE bucket = 'popular'), '[]'::JSONB),
    'trendingIds', COALESCE((SELECT jsonb_agg(id ORDER BY rank) FROM ranked WHERE bucket = 'trending'), '[]'::JSONB),
    'topRatedIds', COALESCE((SELECT jsonb_agg(id ORDER BY rank) FROM ranked WHERE bucket = 'topRated'), '[]'::JSONB)
  )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_homepage_pdfs() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_homepage_pdfs() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_homepage_pdfs() TO service_role;

-- ============================================================================
-- Canonical migration source markers
-- ============================================================================
-- This file predates the numbered migration directory.  The base definitions
-- above are the rerunnable consolidation of 001_create_tables.sql through
-- 027_allow_pdf_thumbnail_mime_types.sql.  The blocks below retain an explicit
-- source boundary for every migration and apply the additions that were not in
-- the original setup.  Older CREATE POLICY statements are deliberately
-- represented by DROP/CREATE pairs: PostgreSQL has no CREATE POLICY IF NOT
-- EXISTS, and this is the safe rerunnable equivalent.

-- BEGIN 001_create_tables.sql
-- Base categories/pdfs definitions and seed rows are above.
-- END 001_create_tables.sql
-- BEGIN 001_create_apx_tables.sql
CREATE TABLE IF NOT EXISTS public.apx_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
  api_url text NOT NULL UNIQUE, web_url text, category text NOT NULL DEFAULT 'General',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.apx_test_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), platform_id uuid NOT NULL REFERENCES public.apx_platforms(id) ON DELETE CASCADE,
  name text NOT NULL, category text NOT NULL DEFAULT 'General', description text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.apx_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), series_id uuid NOT NULL REFERENCES public.apx_test_series(id) ON DELETE CASCADE,
  name text NOT NULL, duration integer, total_marks numeric, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.apx_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), test_id uuid NOT NULL REFERENCES public.apx_tests(id) ON DELETE CASCADE,
  question jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_apx_test_series_category ON public.apx_test_series(category);
CREATE INDEX IF NOT EXISTS idx_apx_test_series_platform ON public.apx_test_series(platform_id);
CREATE INDEX IF NOT EXISTS idx_apx_tests_series ON public.apx_tests(series_id);
CREATE INDEX IF NOT EXISTS idx_apx_questions_test ON public.apx_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_apx_platforms_category ON public.apx_platforms(category);
ALTER TABLE public.apx_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apx_test_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apx_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apx_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read platforms" ON public.apx_platforms;
DROP POLICY IF EXISTS "Anyone can read test series" ON public.apx_test_series;
DROP POLICY IF EXISTS "Anyone can read tests" ON public.apx_tests;
DROP POLICY IF EXISTS "Anyone can read questions" ON public.apx_questions;
CREATE POLICY "Anyone can read platforms" ON public.apx_platforms FOR SELECT USING (true);
CREATE POLICY "Anyone can read test series" ON public.apx_test_series FOR SELECT USING (true);
CREATE POLICY "Anyone can read tests" ON public.apx_tests FOR SELECT USING (true);
CREATE POLICY "Anyone can read questions" ON public.apx_questions FOR SELECT USING (true);
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS update_apx_platforms_updated_at ON public.apx_platforms;
DROP TRIGGER IF EXISTS update_apx_test_series_updated_at ON public.apx_test_series;
DROP TRIGGER IF EXISTS update_apx_tests_updated_at ON public.apx_tests;
DROP TRIGGER IF EXISTS update_apx_questions_updated_at ON public.apx_questions;
CREATE TRIGGER update_apx_platforms_updated_at BEFORE UPDATE ON public.apx_platforms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_apx_test_series_updated_at BEFORE UPDATE ON public.apx_test_series FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_apx_tests_updated_at BEFORE UPDATE ON public.apx_tests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_apx_questions_updated_at BEFORE UPDATE ON public.apx_questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- END 001_create_apx_tables.sql

-- BEGIN 002_add_view_count.sql
ALTER TABLE public.pdfs ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;
-- END 002_add_view_count.sql
-- BEGIN 003_add_reviews.sql
ALTER TABLE public.pdfs ADD COLUMN IF NOT EXISTS average_rating decimal(2,1), ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;
-- END 003_add_reviews.sql
-- BEGIN 004_create_quiz_tables.sql
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS negative_marking decimal(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS passing_percentage decimal(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shuffle_questions boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS shuffle_options boolean DEFAULT false;
DROP POLICY IF EXISTS "Users read own quiz results" ON public.quiz_results;
CREATE POLICY "Users read own quiz results" ON public.quiz_results FOR SELECT TO authenticated USING (auth.uid()::text = user_id);
-- END 004_create_quiz_tables.sql
-- BEGIN 005_create_site_settings.sql
CREATE TABLE IF NOT EXISTS public.site_settings (key text PRIMARY KEY, value jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz DEFAULT now());
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
-- END 005_create_site_settings.sql
-- BEGIN 006_add_pdf_structure_location.sql
ALTER TABLE public.pdfs ADD COLUMN IF NOT EXISTS structure_location jsonb;
CREATE INDEX IF NOT EXISTS pdfs_structure_location_idx ON public.pdfs USING gin(structure_location);
-- END 006_add_pdf_structure_location.sql
-- BEGIN 007_add_user_id_to_tables.sql
ALTER TABLE public.quiz_results ADD COLUMN IF NOT EXISTS user_id text;
-- END 007_add_user_id_to_tables.sql
-- BEGIN 008_add_credits_referral.sql
CREATE TABLE IF NOT EXISTS public.user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  credits integer NOT NULL DEFAULT 10,
  is_premium boolean NOT NULL DEFAULT false,
  premium_expires_at timestamptz DEFAULT NULL,
  referral_code varchar(12) NOT NULL UNIQUE
    DEFAULT upper(substring(gen_random_uuid()::text,1,8)),
  referred_by varchar(12) DEFAULT NULL,
  total_extractions integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can update own credits" ON public.user_credits;
REVOKE ALL PRIVILEGES ON public.user_credits FROM anon,authenticated;
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON public.user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_referral_code ON public.user_credits(referral_code);
CREATE OR REPLACE FUNCTION public.update_user_credits_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at=now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS user_credits_updated_at ON public.user_credits;
CREATE TRIGGER user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW EXECUTE FUNCTION public.update_user_credits_updated_at();
-- END 008_add_credits_referral.sql
-- BEGIN 009_create_pdf_storage.sql
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('pdfs','pdfs',false,52428800,ARRAY['application/pdf','image/jpeg','image/webp'])
ON CONFLICT (id) DO UPDATE SET public=false,file_size_limit=52428800,allowed_mime_types=EXCLUDED.allowed_mime_types;
-- END 009_create_pdf_storage.sql
-- BEGIN 010_harden_database_security.sql
-- Security hardening is superseded and re-applied by 041-044 below.
-- END 010_harden_database_security.sql
-- BEGIN 011_enforce_pdf_visibility.sql
ALTER TABLE public.pdfs ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
-- END 011_enforce_pdf_visibility.sql
-- BEGIN 012_secure_site_settings.sql
REVOKE ALL PRIVILEGES ON public.site_settings FROM PUBLIC, anon, authenticated;
-- END 012_secure_site_settings.sql
-- BEGIN 013_create_admin_chat_tables.sql
CREATE TABLE IF NOT EXISTS public.admin_chat_sessions (id uuid PRIMARY KEY, student_name text NOT NULL CHECK (char_length(student_name) BETWEEN 1 AND 80), created_at timestamptz NOT NULL DEFAULT now(), last_message_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.admin_chat_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES public.admin_chat_sessions(id) ON DELETE CASCADE, sender text NOT NULL CHECK (sender IN ('student','admin')), message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000), telegram_message_id bigint, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.admin_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_chat_messages ENABLE ROW LEVEL SECURITY;
-- END 013_create_admin_chat_tables.sql
-- BEGIN 014_quiz_manager_advanced_settings.sql
ALTER TABLE public.quizzes DROP CONSTRAINT IF EXISTS quizzes_negative_marking_check;
ALTER TABLE public.quizzes ADD CONSTRAINT quizzes_negative_marking_check CHECK (negative_marking >= 0 AND negative_marking <= 100);
ALTER TABLE public.quizzes DROP CONSTRAINT IF EXISTS quizzes_passing_percentage_check;
ALTER TABLE public.quizzes ADD CONSTRAINT quizzes_passing_percentage_check CHECK (passing_percentage >= 0 AND passing_percentage <= 100);
-- END 014_quiz_manager_advanced_settings.sql
-- BEGIN 015_harden_quiz_rls.sql
DROP POLICY IF EXISTS "Users read own quiz results" ON public.quiz_results;
CREATE POLICY "Users read own quiz results" ON public.quiz_results FOR SELECT TO authenticated USING (auth.uid()::text = user_id);
-- END 015_harden_quiz_rls.sql
-- BEGIN 016_harden_reviews.sql
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS user_id text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_one_per_user_pdf
  ON public.reviews(pdf_id,user_id) WHERE user_id IS NOT NULL;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_pdf_review_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
BEGIN
  IF TG_OP IN('UPDATE','DELETE') THEN
    UPDATE public.pdfs
    SET average_rating=(
      SELECT avg(rating)::decimal(2,1)
      FROM public.reviews
      WHERE pdf_id=OLD.pdf_id
    ),
    review_count=(
      SELECT count(*)
      FROM public.reviews
      WHERE pdf_id=OLD.pdf_id
    )
    WHERE id=OLD.pdf_id;
  END IF;

  IF TG_OP IN('INSERT','UPDATE') THEN
    UPDATE public.pdfs
    SET average_rating=(
      SELECT avg(rating)::decimal(2,1)
      FROM public.reviews
      WHERE pdf_id=NEW.pdf_id
    ),
    review_count=(
      SELECT count(*)
      FROM public.reviews
      WHERE pdf_id=NEW.pdf_id
    )
    WHERE id=NEW.pdf_id;
  END IF;

  RETURN coalesce(NEW,OLD);
END;
$$;

UPDATE public.pdfs
SET average_rating=stats.average_rating,
    review_count=stats.review_count
FROM(
  SELECT public.pdfs.id,
    avg(public.reviews.rating)::decimal(2,1) AS average_rating,
    count(public.reviews.id)::integer AS review_count
  FROM public.pdfs
  LEFT JOIN public.reviews ON public.reviews.pdf_id=public.pdfs.id
  GROUP BY public.pdfs.id
) AS stats
WHERE public.pdfs.id=stats.id;
-- END 016_harden_reviews.sql
-- BEGIN 017_restrict_review_trigger_rpc.sql
REVOKE ALL ON FUNCTION public.update_pdf_review_stats() FROM PUBLIC, anon, authenticated;
-- END 017_restrict_review_trigger_rpc.sql
-- BEGIN 018_real_analytics.sql
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  pdf_id uuid NOT NULL REFERENCES public.pdfs(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK(event_type IN('view','download')),
  event_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_type
  ON public.analytics_events(created_at,event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_pdf_created
  ON public.analytics_events(pdf_id,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_events_idempotency
  ON public.analytics_events(event_key) WHERE event_key IS NOT NULL;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.increment_view_count(
  pdf_id uuid,event_key text DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  inserted_id bigint;
  new_count integer;
BEGIN
  INSERT INTO public.analytics_events(pdf_id,event_type,event_key)
  VALUES(
    increment_view_count.pdf_id,'view',
    nullif(increment_view_count.event_key,'')
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO inserted_id;
  IF inserted_id IS NULL THEN
    SELECT coalesce(view_count,0) INTO new_count
    FROM public.pdfs WHERE id=increment_view_count.pdf_id;
    RETURN new_count;
  END IF;
  UPDATE public.pdfs
  SET view_count=coalesce(view_count,0)+1
  WHERE id=increment_view_count.pdf_id
  RETURNING view_count INTO new_count;
  IF new_count IS NULL THEN RAISE EXCEPTION 'PDF not found'; END IF;
  RETURN new_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_download_count(
  pdf_id uuid,event_key text DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  inserted_id bigint;
  new_count integer;
BEGIN
  INSERT INTO public.analytics_events(pdf_id,event_type,event_key)
  VALUES(
    increment_download_count.pdf_id,'download',
    nullif(increment_download_count.event_key,'')
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO inserted_id;
  IF inserted_id IS NULL THEN
    SELECT coalesce(download_count,0) INTO new_count
    FROM public.pdfs WHERE id=increment_download_count.pdf_id;
    RETURN new_count;
  END IF;
  UPDATE public.pdfs
  SET download_count=coalesce(download_count,0)+1
  WHERE id=increment_download_count.pdf_id
  RETURNING download_count INTO new_count;
  IF new_count IS NULL THEN RAISE EXCEPTION 'PDF not found'; END IF;
  RETURN new_count;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_view_count(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.increment_download_count(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.increment_view_count(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_download_count(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_analytics_trends(p_days integer DEFAULT 7)
RETURNS TABLE(event_date date,views bigint,downloads bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  WITH days AS(
    SELECT generate_series(
      current_date-(least(greatest(coalesce(p_days,7),1),90)-1),
      current_date,
      interval '1 day'
    )::date AS event_date
  ),
  counts AS(
    SELECT
      (created_at AT TIME ZONE 'UTC')::date AS event_date,
      count(*) FILTER(WHERE event_type='view') AS views,
      count(*) FILTER(WHERE event_type='download') AS downloads
    FROM public.analytics_events
    WHERE created_at >= (
      current_date-(least(greatest(coalesce(p_days,7),1),90)-1)
    )::timestamp AT TIME ZONE 'UTC'
    GROUP BY (created_at AT TIME ZONE 'UTC')::date
  )
  SELECT days.event_date,coalesce(counts.views,0),coalesce(counts.downloads,0)
  FROM days
  LEFT JOIN counts USING(event_date)
  ORDER BY days.event_date
$$;
REVOKE ALL ON FUNCTION public.get_analytics_trends(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_analytics_trends(integer) TO service_role;
-- END 018_real_analytics.sql
-- BEGIN 019_fix_analytics_utc.sql
CREATE OR REPLACE FUNCTION public.get_analytics_trends(p_days integer DEFAULT 7)
RETURNS TABLE(event_date date,views bigint,downloads bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  WITH days AS(
    SELECT generate_series(
      current_date-(least(greatest(coalesce(p_days,7),1),90)-1),
      current_date,
      interval '1 day'
    )::date AS event_date
  ),
  counts AS(
    SELECT
      (created_at AT TIME ZONE 'UTC')::date AS event_date,
      count(*) FILTER(WHERE event_type='view') AS views,
      count(*) FILTER(WHERE event_type='download') AS downloads
    FROM public.analytics_events
    WHERE created_at >= (
      current_date-(least(greatest(coalesce(p_days,7),1),90)-1)
    )::timestamp AT TIME ZONE 'UTC'
    GROUP BY (created_at AT TIME ZONE 'UTC')::date
  )
  SELECT days.event_date,coalesce(counts.views,0),coalesce(counts.downloads,0)
  FROM days
  LEFT JOIN counts USING(event_date)
  ORDER BY days.event_date
$$;
REVOKE ALL ON FUNCTION public.get_analytics_trends(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_analytics_trends(integer) TO service_role;
-- END 019_fix_analytics_utc.sql
-- BEGIN 020_real_activity_log.sql
CREATE TABLE IF NOT EXISTS public.audit_events (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  action text NOT NULL CHECK(action IN('created','updated','deleted')),
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  actor_type text NOT NULL CHECK(actor_type IN('user','server','system')),
  summary text NOT NULL CHECK(char_length(summary)<=300),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_events_id_desc ON public.audit_events(id DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_resource ON public.audit_events(resource_type,id DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON public.audit_events(action,id DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON public.audit_events(created_at DESC);
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.capture_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  row_data jsonb;
  previous_data jsonb;
  record_action text;
  record_id text;
  record_summary text;
  request_role text;
  record_actor text;
  changed_fields jsonb:='[]'::jsonb;
BEGIN
  row_data:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  previous_data:=CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END;
  record_action:=CASE TG_OP
    WHEN 'INSERT' THEN 'created'
    WHEN 'UPDATE' THEN 'updated'
    ELSE 'deleted'
  END;
  record_id:=coalesce(row_data->>'id',row_data->>'key','unknown');
  record_summary:=left(CASE TG_TABLE_NAME
    WHEN 'pdfs' THEN coalesce(row_data->>'title','PDF '||record_id)
    WHEN 'categories' THEN coalesce(row_data->>'name','Category '||record_id)
    WHEN 'quizzes' THEN coalesce(row_data->>'title','Quiz '||record_id)
    WHEN 'folders' THEN coalesce(row_data->>'name','Folder '||record_id)
    WHEN 'content_folders' THEN coalesce(row_data->>'name','Content folder '||record_id)
    WHEN 'content_sections' THEN coalesce(row_data->>'title','Content section '||record_id)
    WHEN 'site_settings' THEN 'Site setting'
    ELSE initcap(replace(TG_TABLE_NAME,'_',' '))||' '||record_id
  END,300);
  request_role:=coalesce(current_setting('request.jwt.claim.role',true),'');
  record_actor:=CASE
    WHEN request_role='authenticated' THEN 'user'
    WHEN request_role='service_role' THEN 'server'
    ELSE 'system'
  END;
  IF TG_OP='UPDATE' THEN
    SELECT coalesce(jsonb_agg(key ORDER BY key),'[]'::jsonb)
    INTO changed_fields
    FROM jsonb_object_keys(row_data) AS fields(key)
    WHERE row_data->key IS DISTINCT FROM previous_data->key;
  END IF;
  INSERT INTO public.audit_events(
    action,resource_type,resource_id,actor_type,summary,metadata
  ) VALUES(
    record_action,TG_TABLE_NAME,record_id,record_actor,record_summary,
    CASE WHEN TG_OP='UPDATE'
      THEN jsonb_build_object('changed_fields',changed_fields)
      ELSE '{}'::jsonb END
  );
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END;
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'pdfs','categories','reviews','quizzes','folders',
    'site_settings','content_folders','content_sections',
    'apx_platforms','apx_test_series','apx_tests','apx_questions'
  ]
  LOOP
    IF to_regclass('public.'||table_name) IS NOT NULL THEN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS audit_%I_changes ON public.%I',
        table_name,table_name
      );
      EXECUTE format(
        'CREATE TRIGGER audit_%I_changes AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.capture_audit_event()',
        table_name,table_name
      );
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_expired_audit_events(
  retention_days integer DEFAULT 365
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  deleted_count bigint;
BEGIN
  DELETE FROM public.audit_events
  WHERE created_at<now()-make_interval(
    days=>least(greatest(coalesce(retention_days,365),30),3650)
  );
  GET DIAGNOSTICS deleted_count=ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON public.audit_events FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.capture_audit_event() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.purge_expired_audit_events(integer) FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.audit_events TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.audit_events_id_seq TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_expired_audit_events(integer) TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$
DECLARE
  existing_job bigint;
BEGIN
  SELECT jobid INTO existing_job
  FROM cron.job
  WHERE jobname='purge-expired-audit-events';
  IF existing_job IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job);
  END IF;
  PERFORM cron.schedule(
    'purge-expired-audit-events',
    '17 3 * * *',
    'SELECT public.purge_expired_audit_events(365)'
  );
END;
$$;
-- END 020_real_activity_log.sql
-- BEGIN 021_harden_activity_log.sql
ALTER TABLE public.audit_events DROP CONSTRAINT IF EXISTS audit_events_actor_type_check;
UPDATE public.audit_events SET actor_type='server' WHERE actor_type='admin_server';
ALTER TABLE public.audit_events
  ADD CONSTRAINT audit_events_actor_type_check
  CHECK(actor_type IN('user','server','system'));

CREATE OR REPLACE FUNCTION public.capture_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  row_data jsonb;
  previous_data jsonb;
  record_action text;
  record_id text;
  record_summary text;
  request_role text;
  record_actor text;
  changed_fields jsonb:='[]'::jsonb;
BEGIN
  row_data:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  previous_data:=CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END;
  record_action:=CASE TG_OP
    WHEN 'INSERT' THEN 'created'
    WHEN 'UPDATE' THEN 'updated'
    ELSE 'deleted'
  END;
  record_id:=coalesce(row_data->>'id',row_data->>'key','unknown');
  record_summary:=left(CASE TG_TABLE_NAME
    WHEN 'pdfs' THEN coalesce(row_data->>'title','PDF '||record_id)
    WHEN 'categories' THEN coalesce(row_data->>'name','Category '||record_id)
    WHEN 'quizzes' THEN coalesce(row_data->>'title','Quiz '||record_id)
    WHEN 'folders' THEN coalesce(row_data->>'name','Folder '||record_id)
    WHEN 'content_folders' THEN coalesce(row_data->>'name','Content folder '||record_id)
    WHEN 'content_sections' THEN coalesce(row_data->>'title','Content section '||record_id)
    WHEN 'site_settings' THEN 'Site setting'
    ELSE initcap(replace(TG_TABLE_NAME,'_',' '))||' '||record_id
  END,300);
  request_role:=coalesce(current_setting('request.jwt.claim.role',true),'');
  record_actor:=CASE
    WHEN request_role='authenticated' THEN 'user'
    WHEN request_role='service_role' THEN 'server'
    ELSE 'system'
  END;
  IF TG_OP='UPDATE' THEN
    SELECT coalesce(jsonb_agg(key ORDER BY key),'[]'::jsonb)
    INTO changed_fields
    FROM jsonb_object_keys(row_data) AS fields(key)
    WHERE row_data->key IS DISTINCT FROM previous_data->key;
  END IF;
  INSERT INTO public.audit_events(
    action,resource_type,resource_id,actor_type,summary,metadata
  ) VALUES(
    record_action,TG_TABLE_NAME,record_id,record_actor,record_summary,
    CASE WHEN TG_OP='UPDATE'
      THEN jsonb_build_object('changed_fields',changed_fields)
      ELSE '{}'::jsonb END
  );
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END;
$$;
REVOKE ALL ON public.audit_events FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT ON public.audit_events TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$
DECLARE
  existing_job bigint;
BEGIN
  SELECT jobid INTO existing_job
  FROM cron.job
  WHERE jobname='purge-expired-audit-events';
  IF existing_job IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job);
  END IF;
  PERFORM cron.schedule(
    'purge-expired-audit-events',
    '17 3 * * *',
    'SELECT public.purge_expired_audit_events(365)'
  );
END;
$$;
-- END 021_harden_activity_log.sql
-- BEGIN 022_unique_pdf_titles.sql
CREATE UNIQUE INDEX IF NOT EXISTS pdfs_normalized_title_unique ON public.pdfs(lower(btrim(title)));
-- END 022_unique_pdf_titles.sql
-- BEGIN 023_pdf_processing_pipeline.sql
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

UPDATE public.pdfs
SET publish_status='published'
WHERE publish_status='draft' AND visibility IN('public','unlisted');

ALTER TABLE public.pdfs DROP CONSTRAINT IF EXISTS pdfs_processing_status_check;
ALTER TABLE public.pdfs ADD CONSTRAINT pdfs_processing_status_check CHECK (processing_status IN ('queued','processing','completed','failed'));
ALTER TABLE public.pdfs DROP CONSTRAINT IF EXISTS pdfs_malware_status_check;
ALTER TABLE public.pdfs ADD CONSTRAINT pdfs_malware_status_check CHECK (malware_status IN ('pending','clean','suspicious','blocked','unknown'));
ALTER TABLE public.pdfs DROP CONSTRAINT IF EXISTS pdfs_ocr_status_check;
ALTER TABLE public.pdfs ADD CONSTRAINT pdfs_ocr_status_check CHECK (ocr_status IN ('pending','not_required','processing','completed','failed'));
ALTER TABLE public.pdfs DROP CONSTRAINT IF EXISTS pdfs_publish_status_check;
ALTER TABLE public.pdfs ADD CONSTRAINT pdfs_publish_status_check CHECK (publish_status IN ('draft','needs_review','published','rejected'));
ALTER TABLE public.pdfs DROP CONSTRAINT IF EXISTS pdfs_notification_preference_check;
ALTER TABLE public.pdfs ADD CONSTRAINT pdfs_notification_preference_check CHECK (notification_preference IN ('immediate','scheduled','none'));
CREATE TABLE IF NOT EXISTS public.pdf_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_id uuid NOT NULL REFERENCES public.pdfs(id) ON DELETE CASCADE,
  job_type text NOT NULL CHECK(job_type IN('process','notify')),
  status text NOT NULL DEFAULT 'queued'
    CHECK(status IN('queued','running','completed','failed','dead')),
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
  UNIQUE(idempotency_key)
);
CREATE INDEX IF NOT EXISTS pdfs_content_hash_idx
  ON public.pdfs(content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS pdfs_publish_status_idx
  ON public.pdfs(publish_status);
CREATE INDEX IF NOT EXISTS pdf_jobs_ready_idx
  ON public.pdf_jobs(status,available_at);
CREATE INDEX IF NOT EXISTS pdf_jobs_pdf_idx
  ON public.pdf_jobs(pdf_id);
ALTER TABLE public.pdf_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pdf jobs admin only" ON public.pdf_jobs;
CREATE POLICY "pdf jobs admin only" ON public.pdf_jobs USING (false) WITH CHECK (false);
-- END 023_pdf_processing_pipeline.sql
-- BEGIN 024_pdf_job_runner.sql
ALTER TABLE public.pdfs ADD COLUMN IF NOT EXISTS text_fingerprint text;
ALTER TABLE public.pdf_jobs ALTER COLUMN pdf_id DROP NOT NULL;
ALTER TABLE public.pdf_jobs DROP CONSTRAINT IF EXISTS pdf_jobs_job_type_check;
ALTER TABLE public.pdf_jobs
  ADD CONSTRAINT pdf_jobs_job_type_check
  CHECK(job_type IN('process','notify','cleanup'));
CREATE INDEX IF NOT EXISTS pdf_jobs_due_idx
  ON public.pdf_jobs(available_at,status,job_type);
CREATE INDEX IF NOT EXISTS pdfs_text_fingerprint_idx
  ON public.pdfs(text_fingerprint) WHERE text_fingerprint IS NOT NULL;
CREATE INDEX IF NOT EXISTS pdfs_thumbnail_path_idx
  ON public.pdfs(thumbnail_path) WHERE thumbnail_path IS NOT NULL;
-- END 024_pdf_job_runner.sql
-- BEGIN 025_pdf_worker_reliability.sql
CREATE UNIQUE INDEX IF NOT EXISTS pdfs_content_hash_unique_idx
  ON public.pdfs(content_hash) WHERE content_hash IS NOT NULL;
ALTER TABLE public.pdf_jobs ADD COLUMN IF NOT EXISTS lease_token uuid;
ALTER TABLE public.pdfs DROP CONSTRAINT IF EXISTS pdfs_notification_preference_check;
ALTER TABLE public.pdfs ADD CONSTRAINT pdfs_notification_preference_check CHECK (notification_preference IN ('immediate','daily','scheduled','none'));
ALTER TABLE public.pdfs
  ADD COLUMN IF NOT EXISTS notification_claim_token uuid,
  ADD COLUMN IF NOT EXISTS notification_claimed_at timestamptz;
CREATE INDEX IF NOT EXISTS pdfs_notification_due_idx
  ON public.pdfs(notification_state,notification_preference,publish_status,notification_claimed_at);
-- END 025_pdf_worker_reliability.sql
-- BEGIN 026_pdf_job_attempt_bounds.sql
UPDATE public.pdf_jobs SET max_attempts=least(20,greatest(1,max_attempts)) WHERE max_attempts NOT BETWEEN 1 AND 20;
ALTER TABLE public.pdf_jobs DROP CONSTRAINT IF EXISTS pdf_jobs_max_attempts_check;
ALTER TABLE public.pdf_jobs
  ADD CONSTRAINT pdf_jobs_max_attempts_check
  CHECK(max_attempts BETWEEN 1 AND 20);
-- END 026_pdf_job_attempt_bounds.sql
-- BEGIN 027_allow_pdf_thumbnail_mime_types.sql
UPDATE storage.buckets SET allowed_mime_types=ARRAY['application/pdf','image/jpeg','image/webp'] WHERE id='pdfs';
-- END 027_allow_pdf_thumbnail_mime_types.sql

-- BEGIN 028_public_pdf_stats.sql
-- 036 introduced this column after 028; create it here so the canonical
-- aggregate can be compiled on an empty project while retaining final state.
ALTER TABLE public.pdfs ADD COLUMN IF NOT EXISTS storage_bucket text NOT NULL DEFAULT 'pdfs'
  CHECK (storage_bucket IN ('pdfs','community-pdfs'));
CREATE OR REPLACE FUNCTION public.get_public_pdf_stats()
RETURNS TABLE(total_pdfs bigint,total_downloads bigint,total_views bigint,avg_rating numeric,this_week_uploads bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT count(*)::bigint,coalesce(sum(download_count),0)::bigint,coalesce(sum(view_count),0)::bigint,
 coalesce(avg(nullif(average_rating,0)),0)::numeric,count(*) FILTER (WHERE created_at >= now()-interval '7 days')::bigint
 FROM public.pdfs WHERE visibility='public' AND publish_status='published'
 AND (storage_bucket <> 'community-pdfs' OR malware_status='clean') AND (scheduled_at IS NULL OR scheduled_at <= now());
$$;
REVOKE ALL ON FUNCTION public.get_public_pdf_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_pdf_stats() TO anon,authenticated,service_role;
-- END 028_public_pdf_stats.sql
-- BEGIN 029_student_progression.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS public.study_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,event_key text NOT NULL,event_type text NOT NULL,source_result_id text,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,event_key));
CREATE TABLE IF NOT EXISTS public.student_progress (user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,total_xp integer NOT NULL DEFAULT 0 CHECK(total_xp>=0),current_streak integer NOT NULL DEFAULT 0 CHECK(current_streak>=0),longest_streak integer NOT NULL DEFAULT 0 CHECK(longest_streak>=0),last_study_date date,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.xp_ledger (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,event_id uuid NOT NULL REFERENCES public.study_events(id) ON DELETE CASCADE,amount integer NOT NULL CHECK(amount>0),reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(event_id));
CREATE TABLE IF NOT EXISTS public.achievement_unlocks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,achievement_key text NOT NULL,source_event_id uuid REFERENCES public.study_events(id) ON DELETE SET NULL,unlocked_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,achievement_key));
CREATE INDEX IF NOT EXISTS study_events_user_created_idx ON public.study_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS xp_ledger_user_created_idx ON public.xp_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS achievement_unlocks_user_unlocked_idx ON public.achievement_unlocks(user_id, unlocked_at DESC);
ALTER TABLE public.study_events ENABLE ROW LEVEL SECURITY; ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY; ALTER TABLE public.xp_ledger ENABLE ROW LEVEL SECURITY; ALTER TABLE public.achievement_unlocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students read own study events" ON public.study_events; CREATE POLICY "Students read own study events" ON public.study_events FOR SELECT TO authenticated USING(auth.uid()=user_id);
DROP POLICY IF EXISTS "Students read own progress" ON public.student_progress; CREATE POLICY "Students read own progress" ON public.student_progress FOR SELECT TO authenticated USING(auth.uid()=user_id);
DROP POLICY IF EXISTS "Students read own XP ledger" ON public.xp_ledger; CREATE POLICY "Students read own XP ledger" ON public.xp_ledger FOR SELECT TO authenticated USING(auth.uid()=user_id);
DROP POLICY IF EXISTS "Students read own achievement unlocks" ON public.achievement_unlocks; CREATE POLICY "Students read own achievement unlocks" ON public.achievement_unlocks FOR SELECT TO authenticated USING(auth.uid()=user_id);
-- END 029_student_progression.sql
-- BEGIN 030_in_app_notifications.sql
DO $$ BEGIN CREATE TYPE public.notification_kind AS ENUM ('pdf','quiz','test'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.notification_status AS ENUM ('unread','read','dismissed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.notification_digest_mode AS ENUM ('immediate','daily'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS public.notification_preferences(user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,pdfs boolean NOT NULL DEFAULT true,quizzes boolean NOT NULL DEFAULT true,tests boolean NOT NULL DEFAULT true,digest_mode public.notification_digest_mode NOT NULL DEFAULT 'immediate',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.notifications(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.notification_kind NOT NULL,
  event_key text NOT NULL CHECK(char_length(event_key) BETWEEN 1 AND 200),
  title text NOT NULL CHECK(char_length(title) BETWEEN 1 AND 160),
  body text NOT NULL CHECK(char_length(body)<=500),
  href text NOT NULL CHECK(char_length(href) BETWEEN 1 AND 300 AND href ~ '^/[A-Za-z0-9/_-]*$'),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK(jsonb_typeof(payload)='object' AND octet_length(payload::text)<=4096),
  status public.notification_status NOT NULL DEFAULT 'unread',
  read_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_event_key_per_user UNIQUE(user_id,event_key),
  CONSTRAINT notifications_status_timestamps CHECK(
    (status='unread' AND read_at IS NULL AND dismissed_at IS NULL)
    OR (status='read' AND read_at IS NOT NULL AND dismissed_at IS NULL)
    OR (status='dismissed' AND dismissed_at IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS notification_preferences_opt_in_idx
  ON public.notification_preferences(user_id) WHERE pdfs OR quizzes OR tests;
CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications(user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx
  ON public.notifications(user_id, created_at DESC, id DESC) WHERE status='unread';
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY; ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own notification preferences" ON public.notification_preferences; CREATE POLICY "Users read own notification preferences" ON public.notification_preferences FOR SELECT TO authenticated USING(auth.uid()=user_id);
DROP POLICY IF EXISTS "Users update own notification preferences" ON public.notification_preferences; CREATE POLICY "Users update own notification preferences" ON public.notification_preferences FOR UPDATE TO authenticated USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id);
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications; CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated USING(auth.uid()=user_id);
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications; CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id);
REVOKE ALL ON public.notification_preferences, public.notifications FROM anon;
REVOKE INSERT, DELETE, UPDATE ON public.notification_preferences, public.notifications FROM authenticated;
GRANT SELECT, UPDATE(pdfs,quizzes,tests,digest_mode) ON public.notification_preferences TO authenticated;
GRANT SELECT, UPDATE(status,read_at,dismissed_at) ON public.notifications TO authenticated;
-- END 030_in_app_notifications.sql
-- BEGIN 031_quiz_attempt_integrity.sql
ALTER TABLE public.quiz_results ADD COLUMN IF NOT EXISTS client_attempt_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS quiz_results_user_client_attempt_id_key ON public.quiz_results(user_id,client_attempt_id) WHERE client_attempt_id IS NOT NULL;
-- END 031_quiz_attempt_integrity.sql
-- BEGIN 032_notification_delivery_defaults.sql
INSERT INTO public.notification_preferences(user_id) SELECT id FROM auth.users ON CONFLICT(user_id) DO NOTHING;
CREATE OR REPLACE FUNCTION public.provision_notification_preferences() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN INSERT INTO public.notification_preferences(user_id) VALUES(NEW.id) ON CONFLICT(user_id) DO NOTHING; RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS on_auth_user_created_notification_preferences ON auth.users;
CREATE TRIGGER on_auth_user_created_notification_preferences AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.provision_notification_preferences();
REVOKE ALL ON FUNCTION public.provision_notification_preferences() FROM PUBLIC,anon,authenticated;
-- END 032_notification_delivery_defaults.sql
-- BEGIN 033_progression_first_attempt_only.sql
-- Superseded by the legacy-safe canonical function in 034.
-- END 033_progression_first_attempt_only.sql
-- BEGIN 034_progression_legacy_guard.sql
WITH ranked_legacy AS (
 SELECT se.id,se.user_id,'quiz:'||qr.quiz_id AS canonical_key,row_number() OVER(PARTITION BY se.user_id,qr.quiz_id ORDER BY se.created_at,se.id) AS quiz_event_number
 FROM public.study_events se JOIN public.quiz_results qr ON qr.id=se.source_result_id AND qr.user_id=se.user_id::text
 WHERE se.event_type='quiz_completed' AND qr.quiz_id IS NOT NULL AND qr.quiz_id<>'' AND se.event_key LIKE 'quiz-result:%'
), canonical_candidates AS (SELECT id,user_id,canonical_key FROM ranked_legacy WHERE quiz_event_number=1)
UPDATE public.study_events se SET event_key=c.canonical_key FROM canonical_candidates c WHERE se.id=c.id AND NOT EXISTS(SELECT 1 FROM public.study_events e WHERE e.user_id=c.user_id AND e.event_key=c.canonical_key);
CREATE OR REPLACE FUNCTION public.award_quiz_progress(p_user_id uuid,p_result_id text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_result record;v_event_id uuid;v_xp integer;v_today date:=(now() AT TIME ZONE 'UTC')::date;v_progress public.student_progress%ROWTYPE;v_new_streak integer;v_unlocked jsonb:='[]'::jsonb;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF;
 SELECT id,quiz_id,correct,percentage INTO v_result FROM public.quiz_results WHERE id=p_result_id AND user_id=p_user_id::text;
 IF NOT FOUND OR v_result.quiz_id IS NULL OR v_result.quiz_id='' THEN RAISE EXCEPTION 'verified quiz result with quiz ID not found for student' USING ERRCODE='P0002'; END IF;
 IF EXISTS(SELECT 1 FROM public.study_events se JOIN public.quiz_results prior_result ON prior_result.id=se.source_result_id AND prior_result.user_id=se.user_id::text WHERE se.user_id=p_user_id AND se.event_type='quiz_completed' AND prior_result.quiz_id=v_result.quiz_id) THEN SELECT * INTO v_progress FROM public.student_progress WHERE user_id=p_user_id; RETURN jsonb_build_object('awarded',false,'progress',to_jsonb(v_progress),'unlockedAchievements','[]'::jsonb); END IF;
 v_xp:=10+(greatest(v_result.correct,0)*2)+CASE WHEN v_result.percentage>=90 THEN 20 WHEN v_result.percentage>=75 THEN 10 ELSE 0 END;
 INSERT INTO public.study_events(user_id,event_key,event_type,source_result_id) VALUES(p_user_id,'quiz:'||v_result.quiz_id,'quiz_completed',p_result_id) ON CONFLICT(user_id,event_key) DO NOTHING RETURNING id INTO v_event_id;
 IF v_event_id IS NULL THEN SELECT * INTO v_progress FROM public.student_progress WHERE user_id=p_user_id; RETURN jsonb_build_object('awarded',false,'progress',to_jsonb(v_progress),'unlockedAchievements','[]'::jsonb); END IF;
 INSERT INTO public.student_progress(user_id,total_xp,current_streak,longest_streak,last_study_date) VALUES(p_user_id,0,0,0,NULL) ON CONFLICT(user_id) DO NOTHING;
 SELECT * INTO v_progress FROM public.student_progress WHERE user_id=p_user_id FOR UPDATE;
 v_new_streak:=CASE WHEN v_progress.last_study_date=v_today THEN v_progress.current_streak WHEN v_progress.last_study_date=v_today-1 THEN v_progress.current_streak+1 ELSE 1 END;
 UPDATE public.student_progress SET total_xp=total_xp+v_xp,current_streak=v_new_streak,longest_streak=greatest(longest_streak,v_new_streak),last_study_date=v_today,updated_at=now() WHERE user_id=p_user_id RETURNING * INTO v_progress;
 INSERT INTO public.xp_ledger(user_id,event_id,amount,reason) VALUES(p_user_id,v_event_id,v_xp,'quiz_completed');
 WITH candidates(achievement_key) AS (SELECT 'first_quiz' UNION ALL SELECT 'xp_100' WHERE v_progress.total_xp>=100 UNION ALL SELECT 'streak_7' WHERE v_progress.current_streak>=7 UNION ALL SELECT 'perfect_score' WHERE v_result.percentage>=100),inserted AS (INSERT INTO public.achievement_unlocks(user_id,achievement_key,source_event_id) SELECT p_user_id,achievement_key,v_event_id FROM candidates ON CONFLICT(user_id,achievement_key) DO NOTHING RETURNING achievement_key,unlocked_at) SELECT coalesce(jsonb_agg(to_jsonb(inserted)),'[]'::jsonb) INTO v_unlocked FROM inserted;
 RETURN jsonb_build_object('awarded',true,'xpAwarded',v_xp,'progress',to_jsonb(v_progress),'unlockedAchievements',v_unlocked);
END; $$;
REVOKE ALL ON FUNCTION public.award_quiz_progress(uuid,text) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.award_quiz_progress(uuid,text) TO service_role;
-- END 034_progression_legacy_guard.sql
-- BEGIN 035_pdf_content_hierarchy.sql
ALTER TABLE public.pdfs ADD COLUMN IF NOT EXISTS content_type text,ADD COLUMN IF NOT EXISTS content_category text,ADD COLUMN IF NOT EXISTS content_subcategory text,ADD COLUMN IF NOT EXISTS subject text;
ALTER TABLE public.pdfs DROP CONSTRAINT IF EXISTS pdfs_content_type_check;
ALTER TABLE public.pdfs ADD CONSTRAINT pdfs_content_type_check CHECK(content_type IS NULL OR content_type IN('exams','school','college','diploma'));
CREATE INDEX IF NOT EXISTS idx_pdfs_content_type ON public.pdfs(content_type);
CREATE INDEX IF NOT EXISTS idx_pdfs_content_hierarchy ON public.pdfs(content_type,content_category,content_subcategory);
CREATE INDEX IF NOT EXISTS idx_pdfs_subject ON public.pdfs(subject) WHERE subject IS NOT NULL;
UPDATE public.pdfs p SET content_type=coalesce(p.content_type,'exams'),content_category=coalesce(p.content_category,'SSC') FROM public.categories c WHERE p.category_id=c.id AND lower(trim(c.name))='ssc' AND(p.content_type IS NULL OR p.content_category IS NULL);
-- END 035_pdf_content_hierarchy.sql
-- BEGIN 036_community_pdf_submissions.sql
-- Private, rate-limited community PDF intake and atomic moderation.
ALTER TABLE public.pdfs ADD COLUMN IF NOT EXISTS contributed_by text;
ALTER TABLE public.pdfs ADD COLUMN IF NOT EXISTS storage_bucket text NOT NULL DEFAULT 'pdfs'
  CHECK(storage_bucket IN('pdfs','community-pdfs'));
DROP INDEX IF EXISTS public.pdfs_normalized_title_unique;
CREATE INDEX IF NOT EXISTS pdfs_normalized_title_idx ON public.pdfs(lower(btrim(title)));

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('community-pdfs','community-pdfs',false,52428800,ARRAY['application/pdf'])
ON CONFLICT(id) DO UPDATE
SET public=false,file_size_limit=52428800,allowed_mime_types=ARRAY['application/pdf'];

CREATE TABLE IF NOT EXISTS public.community_submission_reservations(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash text NOT NULL CHECK(email_hash~'^[0-9a-f]{64}$'),
  ip_hash text NOT NULL CHECK(ip_hash~'^[0-9a-f]{64}$'),
  expected_path text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  consumed_path text,
  cleaned_at timestamptz,
  CHECK(expires_at>created_at),
  CHECK(consumed_path IS NULL OR consumed_path=expected_path),
  CHECK(cleaned_at IS NULL OR (consumed_at IS NULL AND cleaned_at>=created_at))
);

CREATE TABLE IF NOT EXISTS public.community_submissions(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK(char_length(title) BETWEEN 1 AND 200),
  file_path text NOT NULL UNIQUE CHECK(file_path~'^community/[0-9a-f-]{36}\.pdf$'),
  file_size bigint NOT NULL CHECK(file_size BETWEEN 1 AND 52428800),
  page_count integer CHECK(page_count BETWEEN 1 AND 10000),
  content_type text NOT NULL CHECK(content_type IN('exams','school','college','diploma')),
  content_category text NOT NULL CHECK(char_length(content_category) BETWEEN 1 AND 80),
  content_subcategory text NOT NULL CHECK(char_length(content_subcategory) BETWEEN 1 AND 160),
  subject text CHECK(subject IS NULL OR char_length(subject) BETWEEN 1 AND 120),
  description text CHECK(description IS NULL OR char_length(description)<=300),
  submitter_name text NOT NULL CHECK(char_length(submitter_name) BETWEEN 1 AND 120),
  submitter_email text NOT NULL CHECK(char_length(submitter_email) BETWEEN 3 AND 254),
  submitter_note text CHECK(submitter_note IS NULL OR char_length(submitter_note)<=1000),
  copyright_confirmed boolean NOT NULL CHECK(copyright_confirmed=true),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','approved','rejected')),
  rejection_reason text CHECK(rejection_reason IS NULL OR char_length(rejection_reason) BETWEEN 1 AND 1000),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text CHECK(reviewed_by IS NULL OR char_length(reviewed_by) BETWEEN 1 AND 160),
  approved_pdf_id uuid REFERENCES public.pdfs(id) ON DELETE SET NULL,
  content_hash text NOT NULL CHECK(content_hash~'^[0-9a-f]{64}$'),
  malware_status text NOT NULL CHECK(malware_status IN('clean','suspicious')),
  review_warnings text[] NOT NULL DEFAULT '{}'::text[]
    CHECK(cardinality(review_warnings)<=20
      AND array_position(review_warnings,NULL) IS NULL
      AND octet_length(array_to_string(review_warnings,''))<=6000),
  CHECK(
    (status='pending' AND reviewed_at IS NULL AND reviewed_by IS NULL AND approved_pdf_id IS NULL AND rejection_reason IS NULL)
    OR (status='approved' AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL AND rejection_reason IS NULL)
    OR (status='rejected' AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL AND approved_pdf_id IS NULL AND rejection_reason IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS community_reservations_email_window_idx
  ON public.community_submission_reservations(email_hash,created_at);
CREATE INDEX IF NOT EXISTS community_reservations_ip_window_idx
  ON public.community_submission_reservations(ip_hash,created_at);
CREATE INDEX IF NOT EXISTS community_reservations_expiry_idx
  ON public.community_submission_reservations(expires_at) WHERE consumed_at IS NULL;
CREATE INDEX IF NOT EXISTS community_reservations_cleanup_idx
  ON public.community_submission_reservations(expires_at) WHERE consumed_at IS NULL AND cleaned_at IS NULL;
CREATE INDEX IF NOT EXISTS community_submissions_status_time_idx
  ON public.community_submissions(status,submitted_at);
CREATE INDEX IF NOT EXISTS community_submissions_user_time_idx
  ON public.community_submissions(user_id,submitted_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS community_submissions_hash_idx
  ON public.community_submissions(content_hash);
ALTER TABLE public.community_submission_reservations ENABLE ROW LEVEL SECURITY; ALTER TABLE public.community_submission_reservations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.community_submissions ENABLE ROW LEVEL SECURITY; ALTER TABLE public.community_submissions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS community_submissions_own_read ON public.community_submissions; CREATE POLICY community_submissions_own_read ON public.community_submissions FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
REVOKE ALL ON public.community_submissions,public.community_submission_reservations FROM PUBLIC,anon,authenticated; GRANT SELECT ON public.community_submissions TO authenticated;

CREATE OR REPLACE FUNCTION public.reserve_community_submission_slot(
  p_email_hash text,p_ip_hash text,p_ttl_seconds integer DEFAULT 3600
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_id uuid:=gen_random_uuid();
  v_since timestamptz:=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
BEGIN
  IF auth.role()<>'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE='42501';
  END IF;
  IF p_email_hash!~'^[0-9a-f]{64}$' OR p_ip_hash!~'^[0-9a-f]{64}$'
     OR p_ttl_seconds NOT BETWEEN 60 AND 7200 THEN
    RAISE EXCEPTION 'invalid reservation input' USING ERRCODE='22023';
  END IF;
  PERFORM pg_advisory_xact_lock(LEAST(
    hashtextextended('e:'||p_email_hash,0),hashtextextended('i:'||p_ip_hash,0)
  ));
  PERFORM pg_advisory_xact_lock(GREATEST(
    hashtextextended('e:'||p_email_hash,0),hashtextextended('i:'||p_ip_hash,0)
  ));
  IF (SELECT count(*) FROM public.community_submission_reservations
      WHERE email_hash=p_email_hash AND created_at>=v_since)>=5
     OR (SELECT count(*) FROM public.community_submission_reservations
         WHERE ip_hash=p_ip_hash AND created_at>=v_since)>=5 THEN
    RAISE EXCEPTION 'daily submission limit reached' USING ERRCODE='P0001';
  END IF;
  INSERT INTO public.community_submission_reservations(
    id,email_hash,ip_hash,expected_path,expires_at
  ) VALUES(
    v_id,p_email_hash,p_ip_hash,'community/'||v_id::text||'.pdf',
    now()+make_interval(secs=>p_ttl_seconds)
  );
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.create_community_submission(
  p_reservation_id uuid,p_email_hash text,p_file_path text,p_title text,
  p_file_size bigint,p_page_count integer,p_content_type text,
  p_content_category text,p_content_subcategory text,p_subject text,
  p_description text,p_submitter_name text,p_submitter_email text,
  p_submitter_note text,p_copyright_confirmed boolean,p_user_id uuid,
  p_content_hash text,p_malware_status text,p_review_warnings text[]
) RETURNS public.community_submissions
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_res public.community_submission_reservations;
  v_row public.community_submissions;
BEGIN
  IF auth.role()<>'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_res FROM public.community_submission_reservations
  WHERE id=p_reservation_id FOR UPDATE;
  IF NOT FOUND OR v_res.consumed_at IS NOT NULL OR v_res.expires_at<=now()
     OR v_res.email_hash<>p_email_hash OR v_res.expected_path<>p_file_path THEN
    RAISE EXCEPTION 'invalid or expired reservation' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.community_submissions(
    title,file_path,file_size,page_count,content_type,content_category,
    content_subcategory,subject,description,submitter_name,submitter_email,
    submitter_note,copyright_confirmed,user_id,content_hash,malware_status,
    review_warnings
  ) VALUES(
    p_title,p_file_path,p_file_size,p_page_count,p_content_type,
    p_content_category,p_content_subcategory,p_subject,p_description,
    p_submitter_name,p_submitter_email,p_submitter_note,
    p_copyright_confirmed,p_user_id,p_content_hash,p_malware_status,
    coalesce(p_review_warnings,'{}'::text[])
  ) RETURNING * INTO v_row;
  UPDATE public.community_submission_reservations
  SET consumed_at=now(),consumed_path=p_file_path WHERE id=p_reservation_id;
  RETURN v_row;
END $$;

CREATE OR REPLACE FUNCTION public.find_pdfs_by_normalized_title(
  p_title text,p_exclude_id uuid DEFAULT NULL,p_limit integer DEFAULT 10
) RETURNS TABLE(id uuid,title text,file_path text,thumbnail_path text,storage_bucket text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT p.id,p.title,p.file_path,p.thumbnail_path,p.storage_bucket
  FROM public.pdfs p
  WHERE lower(btrim(p.title))=lower(btrim(p_title))
    AND (p_exclude_id IS NULL OR p.id<>p_exclude_id)
  ORDER BY p.created_at ASC,p.id ASC
  LIMIT least(greatest(p_limit,1),50)
$$;
REVOKE ALL ON FUNCTION public.reserve_community_submission_slot(text,text,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.create_community_submission(uuid,text,text,text,bigint,integer,text,text,text,text,text,text,text,text,boolean,uuid,text,text,text[]) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.find_pdfs_by_normalized_title(text,uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_community_submission_slot(text,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_community_submission(uuid,text,text,text,bigint,integer,text,text,text,text,text,text,text,text,boolean,uuid,text,text,text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.find_pdfs_by_normalized_title(text,uuid,integer) TO service_role;
-- END 036_community_pdf_submissions.sql
-- BEGIN 037_fix_analytics_event_key_ambiguity.sql
CREATE OR REPLACE FUNCTION public.increment_view_count(pdf_id uuid,event_key text DEFAULT NULL) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE inserted_id bigint;new_count integer; BEGIN INSERT INTO analytics_events(pdf_id,event_type,event_key) VALUES(increment_view_count.pdf_id,'view',nullif(increment_view_count.event_key,'')) ON CONFLICT DO NOTHING RETURNING id INTO inserted_id; IF inserted_id IS NULL THEN SELECT coalesce(view_count,0) INTO new_count FROM pdfs WHERE id=increment_view_count.pdf_id; RETURN new_count; END IF; UPDATE pdfs SET view_count=coalesce(view_count,0)+1 WHERE id=increment_view_count.pdf_id RETURNING view_count INTO new_count; IF new_count IS NULL THEN RAISE EXCEPTION 'PDF not found'; END IF; RETURN new_count; END; $$;
CREATE OR REPLACE FUNCTION public.increment_download_count(pdf_id uuid,event_key text DEFAULT NULL) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE inserted_id bigint;new_count integer; BEGIN INSERT INTO analytics_events(pdf_id,event_type,event_key) VALUES(increment_download_count.pdf_id,'download',nullif(increment_download_count.event_key,'')) ON CONFLICT DO NOTHING RETURNING id INTO inserted_id; IF inserted_id IS NULL THEN SELECT coalesce(download_count,0) INTO new_count FROM pdfs WHERE id=increment_download_count.pdf_id; RETURN new_count; END IF; UPDATE pdfs SET download_count=coalesce(download_count,0)+1 WHERE id=increment_download_count.pdf_id RETURNING download_count INTO new_count; IF new_count IS NULL THEN RAISE EXCEPTION 'PDF not found'; END IF; RETURN new_count; END; $$;
REVOKE ALL ON FUNCTION public.increment_view_count(uuid,text) FROM PUBLIC,anon,authenticated; REVOKE ALL ON FUNCTION public.increment_download_count(uuid,text) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.increment_view_count(uuid,text),public.increment_download_count(uuid,text) TO service_role;
-- END 037_fix_analytics_event_key_ambiguity.sql
-- BEGIN 038_user_pdf_library.sql
CREATE TABLE IF NOT EXISTS public.user_pdf_activity(user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,pdf_id uuid NOT NULL REFERENCES public.pdfs(id) ON DELETE CASCADE,last_viewed_at timestamptz,last_downloaded_at timestamptz,view_count integer NOT NULL DEFAULT 0 CHECK(view_count>=0),download_count integer NOT NULL DEFAULT 0 CHECK(download_count>=0),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,pdf_id));
CREATE INDEX IF NOT EXISTS idx_user_pdf_activity_recent
  ON public.user_pdf_activity(user_id,last_viewed_at DESC) WHERE last_viewed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_pdf_activity_downloads
  ON public.user_pdf_activity(user_id,last_downloaded_at DESC) WHERE last_downloaded_at IS NOT NULL;
ALTER TABLE public.user_pdf_activity ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS "Users can read own PDF activity" ON public.user_pdf_activity; CREATE POLICY "Users can read own PDF activity" ON public.user_pdf_activity FOR SELECT TO authenticated USING(auth.uid()=user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pdf_favorites_user_pdf_unique ON public.pdf_favorites(user_id,pdf_id) WHERE user_id IS NOT NULL; CREATE UNIQUE INDEX IF NOT EXISTS idx_pdf_favorites_device_pdf_unique ON public.pdf_favorites(device_id,pdf_id) WHERE user_id IS NULL AND device_id IS NOT NULL;
-- END 038_user_pdf_library.sql
-- BEGIN 039_api_data_integrity.sql
CREATE TABLE IF NOT EXISTS public.user_credit_accounts(user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,credits integer NOT NULL DEFAULT 10 CHECK(credits BETWEEN 0 AND 1000000),is_premium boolean NOT NULL DEFAULT false,referral_code text NOT NULL UNIQUE CHECK(referral_code~'^[A-Z0-9]{4,20}$'),referred_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.user_credit_accounts ENABLE ROW LEVEL SECURITY;
WITH source_accounts AS (
  SELECT id, raw_user_meta_data, upper(trim(raw_user_meta_data ->> 'referral_code')) AS requested_code FROM auth.users
), ranked_accounts AS (
  SELECT source_accounts.*, count(*) OVER (PARTITION BY requested_code) AS code_count FROM source_accounts
)
INSERT INTO public.user_credit_accounts(user_id,credits,is_premium,referral_code)
SELECT id,
  CASE WHEN raw_user_meta_data ->> 'credits' ~ '^\d{1,7}$' THEN least((raw_user_meta_data ->> 'credits')::integer,1000000) ELSE 10 END,
  CASE WHEN lower(raw_user_meta_data ->> 'is_premium') IN ('true','false') THEN (raw_user_meta_data ->> 'is_premium')::boolean ELSE false END,
  CASE WHEN requested_code ~ '^[A-Z0-9]{4,20}$' AND code_count=1 THEN requested_code ELSE 'TV'||upper(substr(replace(id::text,'-',''),1,10)) END
FROM ranked_accounts ON CONFLICT(user_id) DO NOTHING;
UPDATE public.user_credit_accounts account SET referred_by_user_id=referrer.user_id,updated_at=now()
FROM auth.users users JOIN public.user_credit_accounts referrer ON referrer.referral_code=upper(trim(users.raw_user_meta_data ->> 'referred_by'))
WHERE users.id=account.user_id AND account.referred_by_user_id IS NULL AND referrer.user_id<>account.user_id;
CREATE OR REPLACE FUNCTION public.ensure_user_credit_account(p_user_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_meta jsonb;v_code text;v_credits integer:=10;v_is_premium boolean:=false; BEGIN
 IF EXISTS(SELECT 1 FROM public.user_credit_accounts WHERE user_id=p_user_id) THEN RETURN; END IF;
 SELECT coalesce(raw_user_meta_data,'{}'::jsonb) INTO v_meta FROM auth.users WHERE id=p_user_id; IF NOT FOUND THEN RAISE EXCEPTION 'user not found' USING ERRCODE='P0002'; END IF;
 IF v_meta->>'credits' ~ '^\d{1,7}$' THEN v_credits:=least((v_meta->>'credits')::integer,1000000); END IF; IF lower(v_meta->>'is_premium') IN('true','false') THEN v_is_premium:=(v_meta->>'is_premium')::boolean; END IF;
 v_code:=upper(trim(v_meta->>'referral_code')); IF v_code !~ '^[A-Z0-9]{4,20}$' OR EXISTS(SELECT 1 FROM public.user_credit_accounts WHERE referral_code=v_code) THEN v_code:=NULL; END IF;
 LOOP IF v_code IS NULL THEN v_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)); END IF; BEGIN INSERT INTO public.user_credit_accounts(user_id,credits,is_premium,referral_code) VALUES(p_user_id,v_credits,v_is_premium,v_code); RETURN; EXCEPTION WHEN unique_violation THEN IF EXISTS(SELECT 1 FROM public.user_credit_accounts WHERE user_id=p_user_id) THEN RETURN; END IF; v_code:=NULL; END; END LOOP; END; $$;
CREATE OR REPLACE FUNCTION public.create_user_credit_account() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN PERFORM public.ensure_user_credit_account(NEW.id); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS create_user_credit_account_after_signup ON auth.users;
CREATE TRIGGER create_user_credit_account_after_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_user_credit_account();
CREATE OR REPLACE FUNCTION public.get_user_credit_account(p_user_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE a public.user_credit_accounts%ROWTYPE;r text; BEGIN IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF; PERFORM public.ensure_user_credit_account(p_user_id); SELECT * INTO STRICT a FROM public.user_credit_accounts WHERE user_id=p_user_id; SELECT referral_code INTO r FROM public.user_credit_accounts WHERE user_id=a.referred_by_user_id; RETURN jsonb_build_object('credits',a.credits,'is_premium',a.is_premium,'referral_code',a.referral_code,'referred_by',r); END; $$;
CREATE OR REPLACE FUNCTION public.spend_user_credit(p_user_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE a public.user_credit_accounts%ROWTYPE; BEGIN IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF; PERFORM public.ensure_user_credit_account(p_user_id); SELECT * INTO STRICT a FROM public.user_credit_accounts WHERE user_id=p_user_id FOR UPDATE; IF NOT a.is_premium AND a.credits<=0 THEN RETURN jsonb_build_object('status','no_credits','credits',0); END IF; IF NOT a.is_premium THEN UPDATE public.user_credit_accounts SET credits=credits-1,updated_at=now() WHERE user_id=p_user_id RETURNING * INTO a; END IF; RETURN jsonb_build_object('status','ok','credits',a.credits,'is_premium',a.is_premium,'referral_code',a.referral_code); END; $$;
CREATE OR REPLACE FUNCTION public.redeem_user_referral(p_user_id uuid,p_code text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE a public.user_credit_accounts%ROWTYPE;r public.user_credit_accounts%ROWTYPE;c text:=upper(trim(p_code)); BEGIN IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF; IF c !~ '^[A-Z0-9]{4,20}$' THEN RETURN jsonb_build_object('status','invalid_code'); END IF; PERFORM public.ensure_user_credit_account(p_user_id); SELECT * INTO r FROM public.user_credit_accounts WHERE referral_code=c; IF NOT FOUND THEN RETURN jsonb_build_object('status','invalid_code'); END IF; IF r.user_id=p_user_id THEN RETURN jsonb_build_object('status','own_code'); END IF; PERFORM 1 FROM public.user_credit_accounts WHERE user_id IN(p_user_id,r.user_id) ORDER BY user_id FOR UPDATE; SELECT * INTO STRICT a FROM public.user_credit_accounts WHERE user_id=p_user_id; IF a.referred_by_user_id IS NOT NULL THEN RETURN jsonb_build_object('status','already_redeemed'); END IF; UPDATE public.user_credit_accounts SET credits=least(credits+5,1000000),updated_at=now() WHERE user_id=r.user_id; UPDATE public.user_credit_accounts SET credits=least(credits+5,1000000),referred_by_user_id=r.user_id,updated_at=now() WHERE user_id=p_user_id RETURNING * INTO a; RETURN jsonb_build_object('status','ok','bonusEarned',5,'credits',a.credits,'is_premium',a.is_premium,'referral_code',a.referral_code,'referred_by',r.referral_code); END; $$;
CREATE OR REPLACE FUNCTION public.toggle_pdf_favorite(p_user_id uuid,p_device_id text,p_pdf_id uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE v_id uuid;v_identity text; BEGIN IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF; IF p_user_id IS NULL AND(p_device_id IS NULL OR p_device_id !~ '^[0-9a-fA-F-]{36}$') THEN RAISE EXCEPTION 'valid user or device is required' USING ERRCODE='22023'; END IF; v_identity:=coalesce(p_user_id::text,p_device_id); PERFORM pg_advisory_xact_lock(hashtextextended(v_identity||':'||p_pdf_id::text,0)); IF p_user_id IS NOT NULL THEN SELECT id INTO v_id FROM public.pdf_favorites WHERE user_id=p_user_id::text AND pdf_id=p_pdf_id LIMIT 1; ELSE SELECT id INTO v_id FROM public.pdf_favorites WHERE user_id IS NULL AND device_id=p_device_id AND pdf_id=p_pdf_id LIMIT 1; END IF; IF v_id IS NOT NULL THEN DELETE FROM public.pdf_favorites WHERE id=v_id; RETURN 'removed'; END IF; INSERT INTO public.pdf_favorites(device_id,user_id,pdf_id) VALUES(CASE WHEN p_user_id IS NULL THEN p_device_id END,p_user_id::text,p_pdf_id); RETURN 'added'; END; $$;
CREATE OR REPLACE FUNCTION public.record_pdf_download(p_pdf_id uuid,p_event_key text,p_user_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE e bigint;c integer; BEGIN IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF; INSERT INTO public.analytics_events(pdf_id,event_type,event_key) VALUES(p_pdf_id,'download',nullif(p_event_key,'')) ON CONFLICT DO NOTHING RETURNING id INTO e; IF e IS NULL THEN SELECT coalesce(download_count,0) INTO c FROM public.pdfs WHERE id=p_pdf_id; IF NOT FOUND THEN RAISE EXCEPTION 'PDF not found' USING ERRCODE='P0002'; END IF; RETURN jsonb_build_object('recorded',false,'download_count',c); END IF; UPDATE public.pdfs SET download_count=coalesce(download_count,0)+1 WHERE id=p_pdf_id RETURNING download_count INTO c; IF c IS NULL THEN RAISE EXCEPTION 'PDF not found' USING ERRCODE='P0002'; END IF; IF p_user_id IS NOT NULL THEN PERFORM public.record_user_pdf_activity(p_user_id,p_pdf_id,'download'); END IF; RETURN jsonb_build_object('recorded',true,'download_count',c); END; $$;
CREATE OR REPLACE FUNCTION public.patch_site_setting_json(p_key text,p_patch jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE v jsonb; BEGIN IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF; IF p_key IS NULL OR p_key='' OR p_patch IS NULL OR jsonb_typeof(p_patch)<>'object' THEN RAISE EXCEPTION 'setting key and object patch are required' USING ERRCODE='22023'; END IF; INSERT INTO public.site_settings(key,value,updated_at) VALUES(p_key,p_patch,now()) ON CONFLICT(key) DO UPDATE SET value=coalesce(public.site_settings.value,'{}'::jsonb)||excluded.value,updated_at=now() RETURNING value INTO v; RETURN v; END; $$;

CREATE OR REPLACE FUNCTION public.insert_quiz_result_and_award_progress(
  p_result_id text,
  p_user_id uuid,
  p_client_attempt_id uuid,
  p_name text,
  p_score numeric,
  p_percentage numeric,
  p_correct integer,
  p_wrong integer,
  p_skipped integer,
  p_total_time integer,
  p_quiz_id text,
  p_quiz_title text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  v_result public.quiz_results%ROWTYPE;
  v_progression jsonb;
  v_duplicate boolean:=false;
BEGIN
  IF auth.role()<>'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE='42501';
  END IF;

  INSERT INTO public.quiz_results(
    id,name,score,percentage,correct,wrong,skipped,total_time,
    quiz_id,quiz_title,user_id,client_attempt_id
  ) VALUES(
    p_result_id,p_name,p_score,p_percentage,p_correct,p_wrong,p_skipped,
    p_total_time,p_quiz_id,p_quiz_title,p_user_id::text,p_client_attempt_id
  )
  ON CONFLICT(user_id,client_attempt_id) WHERE client_attempt_id IS NOT NULL
  DO NOTHING
  RETURNING * INTO v_result;

  IF v_result.id IS NULL THEN
    v_duplicate:=true;
    SELECT * INTO STRICT v_result
    FROM public.quiz_results
    WHERE user_id=p_user_id::text
      AND client_attempt_id=p_client_attempt_id;
  END IF;

  v_progression:=public.award_quiz_progress(p_user_id,v_result.id);
  RETURN jsonb_build_object(
    'result',to_jsonb(v_result)-'user_id'-'client_attempt_id',
    'progression',v_progression,
    'duplicate',v_duplicate
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_analytics_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.role()<>'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE='42501';
  END IF;
  WITH totals AS(
    SELECT
      count(*)::bigint AS total_pdfs,
      coalesce(sum(view_count),0)::bigint AS total_views,
      coalesce(sum(download_count),0)::bigint AS total_downloads,
      coalesce(sum(review_count),0)::bigint AS total_reviews,
      coalesce(sum(file_size),0)::bigint AS total_storage,
      count(*) FILTER(WHERE coalesce(review_count,0)>0)::bigint AS reviewed_pdfs,
      count(*) FILTER(WHERE coalesce(average_rating,0)>=4)::bigint AS high_rated,
      count(*) FILTER(WHERE coalesce(average_rating,0)>=2 AND average_rating<4)::bigint AS medium_rated,
      count(*) FILTER(WHERE coalesce(average_rating,0)>0 AND average_rating<2)::bigint AS low_rated,
      count(*) FILTER(WHERE coalesce(average_rating,0)=0)::bigint AS unrated,
      count(*) FILTER(WHERE coalesce(download_count,0)>=10 AND coalesce(average_rating,0)>=4)::bigint AS top_performers,
      count(*) FILTER(WHERE coalesce(view_count,0)<10 AND coalesce(download_count,0)=0)::bigint AS underperformers,
      CASE WHEN coalesce(sum(review_count),0)>0
        THEN sum(coalesce(average_rating,0)*coalesce(review_count,0))/sum(review_count)
        ELSE 0 END AS avg_rating
    FROM public.pdfs
  ),
  top_views AS(
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id',ranked.id,'title',ranked.title,
      'views',ranked.view_count,'downloads',ranked.download_count
    ) ORDER BY ranked.view_count DESC,ranked.id),'[]'::jsonb) AS value
    FROM(
      SELECT id,title,coalesce(view_count,0) AS view_count,
        coalesce(download_count,0) AS download_count
      FROM public.pdfs
      ORDER BY coalesce(view_count,0) DESC,id
      LIMIT 5
    ) AS ranked
  ),
  top_downloads AS(
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id',ranked.id,'title',ranked.title,
      'views',ranked.view_count,'downloads',ranked.download_count
    ) ORDER BY ranked.download_count DESC,ranked.id),'[]'::jsonb) AS value
    FROM(
      SELECT id,title,coalesce(view_count,0) AS view_count,
        coalesce(download_count,0) AS download_count
      FROM public.pdfs
      ORDER BY coalesce(download_count,0) DESC,id
      LIMIT 5
    ) AS ranked
  ),
  category_summary AS(
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id',grouped.id,'name',grouped.name,'color',grouped.color,
      'count',grouped.pdf_count,'views',grouped.views,'downloads',grouped.downloads
    ) ORDER BY grouped.pdf_count DESC,grouped.name),'[]'::jsonb) AS value
    FROM(
      SELECT category.id,category.name,category.color,
        count(pdf.id)::bigint AS pdf_count,
        coalesce(sum(pdf.view_count),0)::bigint AS views,
        coalesce(sum(pdf.download_count),0)::bigint AS downloads
      FROM public.categories AS category
      JOIN public.pdfs AS pdf ON pdf.category_id=category.id
      GROUP BY category.id,category.name,category.color
    ) AS grouped
  )
  SELECT jsonb_build_object(
    'stats',jsonb_build_object(
      'totalViews',totals.total_views,
      'totalDownloads',totals.total_downloads,
      'totalReviews',totals.total_reviews,
      'totalPdfs',totals.total_pdfs,
      'totalStorage',totals.total_storage,
      'avgRating',totals.avg_rating,
      'reviewedPdfs',totals.reviewed_pdfs,
      'engagementRate',CASE WHEN totals.total_views>0
        THEN totals.total_downloads::numeric/totals.total_views*100 ELSE 0 END,
      'avgDownloads',CASE WHEN totals.total_pdfs>0
        THEN totals.total_downloads::numeric/totals.total_pdfs ELSE 0 END
    ),
    'performance',jsonb_build_object(
      'highRated',totals.high_rated,
      'mediumRated',totals.medium_rated,
      'lowRated',totals.low_rated,
      'unrated',totals.unrated,
      'topPerformers',totals.top_performers,
      'underperformers',totals.underperformers
    ),
    'topPdfs',top_views.value,
    'topDownloads',top_downloads.value,
    'categories',category_summary.value
  ) INTO v_result
  FROM totals,top_views,top_downloads,category_summary;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_quiz_analytics(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.role()<>'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE='42501';
  END IF;
  WITH user_results AS(
    SELECT result.*,quiz.category AS quiz_category,
      coalesce(quiz.title,result.quiz_title,'Unknown quiz') AS display_title
    FROM public.quiz_results AS result
    LEFT JOIN public.quizzes AS quiz ON quiz.id=result.quiz_id
    WHERE result.user_id=p_user_id::text
  ),
  all_time AS(
    SELECT
      count(*)::bigint AS attempts,
      coalesce(round(avg(percentage)),0) AS average_score,
      coalesce(max(percentage),0) AS best_score,
      coalesce(sum(correct),0)::bigint AS correct,
      coalesce(sum(wrong),0)::bigint AS wrong,
      coalesce(sum(skipped),0)::bigint AS skipped
    FROM user_results
  ),
  recent_rows AS(
    SELECT created_at,percentage,quiz_id,display_title
    FROM user_results
    ORDER BY created_at DESC
    LIMIT 10
  ),
  recent AS(
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'date',created_at,
      'percentage',coalesce(percentage,0),
      'quizId',quiz_id,
      'quizTitle',display_title
    ) ORDER BY created_at),'[]'::jsonb) AS value
    FROM recent_rows
  ),
  quiz_groups AS(
    SELECT
      coalesce(quiz_id,'unknown') AS key,
      max(display_title) AS label,
      count(*)::bigint AS attempts,
      coalesce(round(avg(percentage)),0) AS average_score,
      CASE WHEN coalesce(sum(correct),0)+coalesce(sum(wrong),0)+coalesce(sum(skipped),0)>0
        THEN round(coalesce(sum(correct),0)::numeric/
          (coalesce(sum(correct),0)+coalesce(sum(wrong),0)+coalesce(sum(skipped),0))*100)
        ELSE 0 END AS accuracy
    FROM user_results
    GROUP BY coalesce(quiz_id,'unknown')
  ),
  by_quiz AS(
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'key',key,'label',label,'attempts',attempts,
      'averageScore',average_score,'accuracy',accuracy
    ) ORDER BY attempts DESC,key),'[]'::jsonb) AS value
    FROM quiz_groups
  ),
  category_groups AS(
    SELECT
      coalesce(quiz_category,'Uncategorized') AS key,
      coalesce(quiz_category,'Uncategorized') AS label,
      count(*)::bigint AS attempts,
      coalesce(round(avg(percentage)),0) AS average_score,
      CASE WHEN coalesce(sum(correct),0)+coalesce(sum(wrong),0)+coalesce(sum(skipped),0)>0
        THEN round(coalesce(sum(correct),0)::numeric/
          (coalesce(sum(correct),0)+coalesce(sum(wrong),0)+coalesce(sum(skipped),0))*100)
        ELSE 0 END AS accuracy
    FROM user_results
    GROUP BY coalesce(quiz_category,'Uncategorized')
  ),
  by_category AS(
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'key',key,'label',label,'attempts',attempts,
      'averageScore',average_score,'accuracy',accuracy
    ) ORDER BY attempts DESC,key),'[]'::jsonb) AS value
    FROM category_groups
  ),
  weakest AS(
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'key',ranked.key,'label',ranked.label,'attempts',ranked.attempts,
      'averageScore',ranked.average_score,'accuracy',ranked.accuracy
    ) ORDER BY ranked.accuracy,ranked.attempts DESC),'[]'::jsonb) AS value
    FROM(
      SELECT * FROM category_groups
      ORDER BY accuracy,attempts DESC
      LIMIT 5
    ) AS ranked
  )
  SELECT jsonb_build_object(
    'allTime',jsonb_build_object(
      'attempts',all_time.attempts,
      'averageScore',all_time.average_score,
      'bestScore',all_time.best_score,
      'correct',all_time.correct,
      'wrong',all_time.wrong,
      'skipped',all_time.skipped,
      'accuracy',CASE WHEN all_time.correct+all_time.wrong+all_time.skipped>0
        THEN round(all_time.correct::numeric/
          (all_time.correct+all_time.wrong+all_time.skipped)*100)
        ELSE 0 END
    ),
    'recentScoreTrend',recent.value,
    'byQuiz',by_quiz.value,
    'byCategory',by_category.value,
    'weakestAreas',weakest.value
  ) INTO v_result
  FROM all_time,recent,by_quiz,by_category,weakest;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.moderate_community_submission(
  p_submission_id uuid,
  p_action text,
  p_reason text,
  p_reviewed_by text
) RETURNS public.community_submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  v_row public.community_submissions;
  v_pdf_id uuid;
BEGIN
  IF auth.role()<>'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE='42501';
  END IF;
  IF p_action NOT IN('approve','reject') OR nullif(btrim(p_reviewed_by),'') IS NULL THEN
    RAISE EXCEPTION 'invalid moderation input' USING ERRCODE='22023';
  END IF;
  IF p_action='reject' AND nullif(btrim(p_reason),'') IS NULL THEN
    RAISE EXCEPTION 'rejection reason required' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_row
  FROM public.community_submissions
  WHERE id=p_submission_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'submission not found' USING ERRCODE='P0002';
  END IF;

  IF v_row.status<>'pending' THEN
    IF p_action='approve' AND v_row.status='approved'
       AND v_row.approved_pdf_id IS NOT NULL THEN
      INSERT INTO public.pdf_jobs(
        pdf_id,job_type,idempotency_key,status,available_at,payload,updated_at
      ) VALUES(
        v_row.approved_pdf_id,'process','process:'||v_row.approved_pdf_id,
        'queued',now(),'{}'::jsonb,now()
      )
      ON CONFLICT(idempotency_key) DO UPDATE SET
        status=CASE WHEN public.pdf_jobs.status IN('completed','failed','dead')
          THEN 'queued' ELSE public.pdf_jobs.status END,
        attempts=CASE WHEN public.pdf_jobs.status IN('completed','failed','dead')
          THEN 0 ELSE public.pdf_jobs.attempts END,
        last_error=CASE WHEN public.pdf_jobs.status IN('completed','failed','dead')
          THEN NULL ELSE public.pdf_jobs.last_error END,
        completed_at=CASE WHEN public.pdf_jobs.status IN('completed','failed','dead')
          THEN NULL ELSE public.pdf_jobs.completed_at END,
        available_at=CASE WHEN public.pdf_jobs.status IN('completed','failed','dead')
          THEN now() ELSE public.pdf_jobs.available_at END,
        updated_at=now();
      RETURN v_row;
    END IF;
    IF p_action='reject' AND v_row.status='rejected' THEN
      RETURN v_row;
    END IF;
    RAISE EXCEPTION 'conflicting moderation transition' USING ERRCODE='P0001';
  END IF;

  IF p_action='approve' THEN
    IF v_row.malware_status<>'clean' THEN
      RAISE EXCEPTION 'submission safety review prevents approval' USING ERRCODE='22023';
    END IF;
    IF NOT EXISTS(
      SELECT 1 FROM public.community_submission_reservations r
      JOIN storage.objects o ON o.bucket_id='community-pdfs' AND o.name=v_row.file_path
      WHERE r.expected_path=v_row.file_path AND r.consumed_path=v_row.file_path
        AND r.consumed_at IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'reservation-bound storage object is missing' USING ERRCODE='22023';
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('community-content:'||v_row.content_hash,0));
    IF EXISTS(SELECT 1 FROM public.pdfs p WHERE p.content_hash=v_row.content_hash) THEN
      RAISE EXCEPTION 'duplicate content: an existing PDF already uses this content hash' USING ERRCODE='23505';
    END IF;
    INSERT INTO public.pdfs(
      title,description,file_path,file_size,page_count,content_type,
      content_category,content_subcategory,subject,content_hash,contributed_by,
      category_id,structure_location,visibility,publish_status,processing_status,
      view_count,storage_bucket,malware_status,review_warnings
    ) VALUES(
      v_row.title,v_row.description,v_row.file_path,v_row.file_size,
      v_row.page_count,v_row.content_type,v_row.content_category,
      v_row.content_subcategory,v_row.subject,v_row.content_hash,
      v_row.submitter_name,NULL,NULL,'public','published','queued',0,
      'community-pdfs','clean',to_jsonb(v_row.review_warnings)
    ) RETURNING id INTO v_pdf_id;
    UPDATE public.community_submissions
    SET status='approved',reviewed_at=now(),reviewed_by=btrim(p_reviewed_by),
      approved_pdf_id=v_pdf_id,rejection_reason=NULL
    WHERE id=p_submission_id
    RETURNING * INTO v_row;
    INSERT INTO public.pdf_jobs(
      pdf_id,job_type,idempotency_key,status,available_at,payload,updated_at
    ) VALUES(
      v_pdf_id,'process','process:'||v_pdf_id,'queued',now(),'{}'::jsonb,now()
    );
  ELSE
    UPDATE public.community_submissions
    SET status='rejected',reviewed_at=now(),reviewed_by=btrim(p_reviewed_by),
      rejection_reason=btrim(p_reason)
    WHERE id=p_submission_id
    RETURNING * INTO v_row;
  END IF;
  RETURN v_row;
END;
$$;

REVOKE ALL ON TABLE public.user_credit_accounts FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.ensure_user_credit_account(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.create_user_credit_account() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.get_user_credit_account(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.spend_user_credit(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.redeem_user_referral(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.toggle_pdf_favorite(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.record_pdf_download(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.patch_site_setting_json(text,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.insert_quiz_result_and_award_progress(
  text,uuid,uuid,text,numeric,numeric,integer,integer,integer,integer,text,text
) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.get_admin_analytics_summary() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.get_user_quiz_analytics(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.moderate_community_submission(uuid,text,text,text) FROM PUBLIC,anon,authenticated;

GRANT EXECUTE ON FUNCTION public.get_user_credit_account(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.spend_user_credit(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.redeem_user_referral(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.toggle_pdf_favorite(uuid,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_pdf_download(uuid,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.patch_site_setting_json(text,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.insert_quiz_result_and_award_progress(
  text,uuid,uuid,text,numeric,numeric,integer,integer,integer,integer,text,text
) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics_summary() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_quiz_analytics(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.moderate_community_submission(uuid,text,text,text) TO service_role;
-- END 039_api_data_integrity.sql
-- BEGIN 040_lock_down_pdf_favorites.sql
ALTER TABLE public.pdf_favorites ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE policy_name text; BEGIN FOR policy_name IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='pdf_favorites' LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.pdf_favorites',policy_name); END LOOP; END $$;
REVOKE ALL PRIVILEGES ON public.pdf_favorites FROM PUBLIC,anon,authenticated;
-- END 040_lock_down_pdf_favorites.sql
-- BEGIN 041_authorization_isolation.sql
ALTER TABLE public.pdfs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access on pdfs" ON public.pdfs; DROP POLICY IF EXISTS "Public PDFs are readable" ON public.pdfs;
CREATE POLICY "Public PDFs are readable" ON public.pdfs FOR SELECT TO anon,authenticated USING(visibility='public' AND publish_status='published' AND malware_status='clean' AND(scheduled_at IS NULL OR scheduled_at<=now()));
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE policy_name text;
BEGIN
  FOR policy_name IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='quizzes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.quizzes',policy_name);
  END LOOP;
END
$$;
REVOKE ALL PRIVILEGES ON public.quizzes FROM PUBLIC,anon,authenticated;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Visible PDF reviews are publicly readable" ON public.reviews; DROP POLICY IF EXISTS "Authenticated users insert own reviews" ON public.reviews;
CREATE POLICY "Visible PDF reviews are publicly readable" ON public.reviews FOR SELECT TO anon,authenticated USING(EXISTS(SELECT 1 FROM public.pdfs WHERE pdfs.id=reviews.pdf_id AND pdfs.visibility='public' AND pdfs.publish_status='published' AND pdfs.malware_status='clean' AND(pdfs.scheduled_at IS NULL OR pdfs.scheduled_at<=now())));
CREATE POLICY "Authenticated users insert own reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid()::text AND EXISTS(SELECT 1 FROM public.pdfs WHERE pdfs.id=reviews.pdf_id AND pdfs.visibility='public' AND pdfs.publish_status='published' AND pdfs.malware_status='clean' AND(pdfs.scheduled_at IS NULL OR pdfs.scheduled_at<=now())));
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE policy_name text;
BEGIN
  FOR policy_name IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='user_credits'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_credits',policy_name);
  END LOOP;
END
$$;
REVOKE ALL PRIVILEGES ON public.user_credits FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.record_user_pdf_activity(p_user_id uuid,p_pdf_id uuid,p_event text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF; IF p_event NOT IN('view','download') THEN RAISE EXCEPTION 'invalid PDF activity event' USING ERRCODE='22023'; END IF; INSERT INTO public.user_pdf_activity(user_id,pdf_id,last_viewed_at,last_downloaded_at,view_count,download_count) VALUES(p_user_id,p_pdf_id,CASE WHEN p_event='view' THEN now() END,CASE WHEN p_event='download' THEN now() END,CASE WHEN p_event='view' THEN 1 ELSE 0 END,CASE WHEN p_event='download' THEN 1 ELSE 0 END) ON CONFLICT(user_id,pdf_id) DO UPDATE SET last_viewed_at=CASE WHEN p_event='view' THEN now() ELSE user_pdf_activity.last_viewed_at END,last_downloaded_at=CASE WHEN p_event='download' THEN now() ELSE user_pdf_activity.last_downloaded_at END,view_count=user_pdf_activity.view_count+CASE WHEN p_event='view' THEN 1 ELSE 0 END,download_count=user_pdf_activity.download_count+CASE WHEN p_event='download' THEN 1 ELSE 0 END,updated_at=now(); END; $$;
REVOKE ALL ON FUNCTION public.record_user_pdf_activity(uuid,uuid,text) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.record_user_pdf_activity(uuid,uuid,text) TO service_role;
-- END 041_authorization_isolation.sql
-- BEGIN 042_least_privilege_grants.sql
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC,anon,authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC,anon,authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT SELECT ON public.categories,public.pdfs,public.apx_platforms,public.apx_test_series,public.reviews TO anon,authenticated;
GRANT SELECT ON public.user_pdf_activity,public.quiz_results,public.community_submissions,public.notifications TO authenticated;
GRANT INSERT ON public.reviews TO authenticated; GRANT UPDATE ON public.notifications TO authenticated;
REVOKE ALL PRIVILEGES ON public.site_settings,public.quizzes FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_pdf_stats() TO anon,authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC,anon,authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC,anon,authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC,anon,authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;
-- END 042_least_privilege_grants.sql
-- BEGIN 043_quiz_answer_isolation.sql
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE policy_name text; BEGIN FOR policy_name IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='quizzes' LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.quizzes',policy_name); END LOOP; END $$;
REVOKE ALL PRIVILEGES ON public.quizzes FROM PUBLIC,anon,authenticated;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS question_count integer
  GENERATED ALWAYS AS (
    CASE WHEN jsonb_typeof(questions)='array' THEN jsonb_array_length(questions) ELSE 0 END
  ) STORED;
GRANT ALL PRIVILEGES ON public.quizzes TO service_role;
NOTIFY pgrst,'reload schema';
-- END 043_quiz_answer_isolation.sql
-- BEGIN 044_homepage_pdf_payload.sql
-- The canonical SECURITY DEFINER payload function is defined above; repeat its
-- final ACL after 043 so it cannot become browser-callable.
REVOKE ALL ON FUNCTION public.get_homepage_pdfs() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_homepage_pdfs() TO service_role;
NOTIFY pgrst,'reload schema';
-- END 044_homepage_pdf_payload.sql
-- BEGIN 045_community_submission_hardening.sql
-- Final definitions from 045: community PDFs remain non-public until their
-- queued processing job completes. The complete migration is intentionally
-- duplicated here only where it supersedes final setup definitions.
DROP POLICY IF EXISTS "Public PDFs are readable" ON public.pdfs;
CREATE POLICY "Public PDFs are readable" ON public.pdfs FOR SELECT TO anon, authenticated
  USING (visibility='public' AND publish_status='published' AND malware_status='clean'
    AND (scheduled_at IS NULL OR scheduled_at<=NOW())
    AND (COALESCE(storage_bucket,'pdfs') <> 'community-pdfs' OR processing_status='completed'));
DROP POLICY IF EXISTS "Visible PDF reviews are publicly readable" ON public.reviews;
DROP POLICY IF EXISTS "Authenticated users insert own reviews" ON public.reviews;
CREATE POLICY "Visible PDF reviews are publicly readable" ON public.reviews FOR SELECT TO anon, authenticated
  USING (EXISTS(SELECT 1 FROM public.pdfs WHERE pdfs.id=reviews.pdf_id
    AND pdfs.visibility='public' AND pdfs.publish_status='published' AND pdfs.malware_status='clean'
    AND (pdfs.scheduled_at IS NULL OR pdfs.scheduled_at<=NOW())
    AND (COALESCE(pdfs.storage_bucket,'pdfs') <> 'community-pdfs' OR pdfs.processing_status='completed')));
CREATE POLICY "Authenticated users insert own reviews" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK(user_id=auth.uid()::TEXT AND EXISTS(SELECT 1 FROM public.pdfs WHERE pdfs.id=reviews.pdf_id
    AND pdfs.visibility='public' AND pdfs.publish_status='published' AND pdfs.malware_status='clean'
    AND (pdfs.scheduled_at IS NULL OR pdfs.scheduled_at<=NOW())
    AND (COALESCE(pdfs.storage_bucket,'pdfs') <> 'community-pdfs' OR pdfs.processing_status='completed')));
CREATE OR REPLACE FUNCTION public.get_public_pdf_stats()
RETURNS TABLE(total_pdfs BIGINT,total_downloads BIGINT,total_views BIGINT,avg_rating NUMERIC,this_week_uploads BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT COUNT(*)::BIGINT,COALESCE(SUM(download_count),0)::BIGINT,COALESCE(SUM(view_count),0)::BIGINT,COALESCE(AVG(NULLIF(average_rating,0)),0)::NUMERIC,COUNT(*) FILTER(WHERE created_at>=NOW()-INTERVAL '7 days')::BIGINT
 FROM public.pdfs WHERE visibility='public' AND publish_status='published'
 AND malware_status='clean'
 AND (COALESCE(storage_bucket,'pdfs')<>'community-pdfs' OR processing_status='completed')
 AND (scheduled_at IS NULL OR scheduled_at<=NOW()) $$;
REVOKE ALL ON FUNCTION public.get_public_pdf_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_pdf_stats() TO anon,authenticated,service_role;
-- get_homepage_pdfs retains its 044 signature/security/ACL; its final visible
-- CTE uses the identical community processing predicate.
CREATE OR REPLACE FUNCTION public.get_homepage_pdfs() RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'service_role required' USING ERRCODE='42501'; END IF;
 RETURN (WITH visible AS MATERIALIZED (SELECT p.id,p.title,p.description,p.file_size,p.page_count,p.category_id,p.download_count,p.view_count,p.average_rating,p.created_at,p.updated_at,p.allow_download,p.tags,p.content_type,p.content_category,p.content_subcategory,p.subject,CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object('id',c.id,'name',c.name,'slug',c.slug,'color',c.color,'created_at',c.created_at) END AS category FROM public.pdfs p LEFT JOIN public.categories c ON c.id=p.category_id WHERE p.visibility='public' AND p.publish_status='published' AND p.malware_status='clean' AND (COALESCE(p.storage_bucket,'pdfs') <> 'community-pdfs' OR p.processing_status='completed') AND (p.scheduled_at IS NULL OR p.scheduled_at<=NOW())),library AS(SELECT 'library'::TEXT bucket,row_number() OVER(ORDER BY created_at DESC) rank,visible.* FROM visible ORDER BY created_at DESC LIMIT 60),popular AS(SELECT 'popular'::TEXT bucket,row_number() OVER(ORDER BY download_count DESC) rank,visible.* FROM visible WHERE download_count>0 ORDER BY download_count DESC LIMIT 4),trending AS(SELECT 'trending'::TEXT bucket,row_number() OVER(ORDER BY view_count DESC) rank,visible.* FROM visible WHERE view_count>0 ORDER BY view_count DESC LIMIT 4),top_rated AS(SELECT 'topRated'::TEXT bucket,row_number() OVER(ORDER BY average_rating DESC) rank,visible.* FROM visible WHERE average_rating>0 ORDER BY average_rating DESC LIMIT 4),ranked AS(SELECT * FROM library UNION ALL SELECT * FROM popular UNION ALL SELECT * FROM trending UNION ALL SELECT * FROM top_rated),unique_rows AS(SELECT DISTINCT ON(id) * FROM ranked ORDER BY id) SELECT jsonb_build_object('pdfs',COALESCE((SELECT jsonb_agg(to_jsonb(unique_rows)-'bucket'-'rank') FROM unique_rows),'[]'::JSONB),'libraryIds',COALESCE((SELECT jsonb_agg(id ORDER BY rank) FROM ranked WHERE bucket='library'),'[]'::JSONB),'popularIds',COALESCE((SELECT jsonb_agg(id ORDER BY rank) FROM ranked WHERE bucket='popular'),'[]'::JSONB),'trendingIds',COALESCE((SELECT jsonb_agg(id ORDER BY rank) FROM ranked WHERE bucket='trending'),'[]'::JSONB),'topRatedIds',COALESCE((SELECT jsonb_agg(id ORDER BY rank) FROM ranked WHERE bucket='topRated'),'[]'::JSONB)));
END $$;
REVOKE ALL ON FUNCTION public.get_homepage_pdfs() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_homepage_pdfs() TO service_role;
CREATE OR REPLACE FUNCTION public.create_community_submission(p_reservation_id uuid,p_email_hash text,p_file_path text,p_title text,p_file_size bigint,p_page_count integer,p_content_type text,p_content_category text,p_content_subcategory text,p_subject text,p_description text,p_submitter_name text,p_submitter_email text,p_submitter_note text,p_copyright_confirmed boolean,p_user_id uuid,p_content_hash text,p_malware_status text,p_review_warnings text[])
RETURNS public.community_submissions LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_res public.community_submission_reservations;v_row public.community_submissions;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_res FROM public.community_submission_reservations WHERE id=p_reservation_id FOR UPDATE;
 IF NOT FOUND OR v_res.email_hash<>p_email_hash OR v_res.expected_path<>p_file_path THEN RAISE EXCEPTION 'invalid reservation' USING ERRCODE='22023'; END IF;
 IF v_res.consumed_at IS NOT NULL THEN
   IF v_res.consumed_path=p_file_path THEN SELECT * INTO v_row FROM public.community_submissions WHERE file_path=v_res.consumed_path; IF FOUND THEN RETURN v_row; END IF; END IF;
   RAISE EXCEPTION 'invalid consumed reservation without matching submission' USING ERRCODE='22023';
 END IF;
 IF v_res.expires_at<=now() THEN RAISE EXCEPTION 'invalid or expired reservation' USING ERRCODE='22023'; END IF;
 INSERT INTO public.community_submissions(title,file_path,file_size,page_count,content_type,content_category,content_subcategory,subject,description,submitter_name,submitter_email,submitter_note,copyright_confirmed,user_id,content_hash,malware_status,review_warnings) VALUES(p_title,p_file_path,p_file_size,p_page_count,p_content_type,p_content_category,p_content_subcategory,p_subject,p_description,p_submitter_name,p_submitter_email,p_submitter_note,p_copyright_confirmed,p_user_id,p_content_hash,p_malware_status,COALESCE(p_review_warnings,'{}'::text[])) RETURNING * INTO v_row;
 UPDATE public.community_submission_reservations SET consumed_at=now(),consumed_path=p_file_path WHERE id=p_reservation_id;
 RETURN v_row;
END $$;
REVOKE ALL ON FUNCTION public.create_community_submission(uuid,text,text,text,bigint,integer,text,text,text,text,text,text,text,text,boolean,uuid,text,text,text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_community_submission(uuid,text,text,text,bigint,integer,text,text,text,text,text,text,text,text,boolean,uuid,text,text,text[]) TO service_role;
-- The final moderation definition above includes the 045 reservation-object
-- and exact-content checks before it creates an approved PDF.
-- END 045_community_submission_hardening.sql
-- BEGIN 046_community_upload_cleanup_claims.sql
ALTER TABLE public.community_submission_reservations ADD COLUMN IF NOT EXISTS cleanup_claim_token uuid,ADD COLUMN IF NOT EXISTS cleanup_claimed_at timestamptz;
CREATE OR REPLACE FUNCTION public.claim_expired_community_uploads(p_limit integer DEFAULT 20) RETURNS TABLE(reservation_id uuid,expected_path text,claim_token uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF;
 IF p_limit NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'invalid cleanup limit' USING ERRCODE='22023'; END IF;
 RETURN QUERY WITH candidates AS(SELECT r.id FROM public.community_submission_reservations r WHERE r.expires_at<=now() AND r.consumed_at IS NULL AND r.cleaned_at IS NULL AND(r.cleanup_claim_token IS NULL OR r.cleanup_claimed_at<now()-interval '5 minutes') ORDER BY r.expires_at ASC FOR UPDATE SKIP LOCKED LIMIT p_limit),claimed AS(UPDATE public.community_submission_reservations r SET cleanup_claim_token=gen_random_uuid(),cleanup_claimed_at=now() FROM candidates c WHERE r.id=c.id RETURNING r.id,r.expected_path,r.cleanup_claim_token) SELECT claimed.id,claimed.expected_path,claimed.cleanup_claim_token FROM claimed;
END $$;
CREATE OR REPLACE FUNCTION public.finish_community_upload_cleanup(p_reservation_id uuid,p_claim_token uuid,p_removed boolean) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF;
 IF p_reservation_id IS NULL OR p_claim_token IS NULL THEN RAISE EXCEPTION 'invalid cleanup claim' USING ERRCODE='22023'; END IF;
 IF p_removed THEN UPDATE public.community_submission_reservations SET cleaned_at=now(),cleanup_claim_token=NULL,cleanup_claimed_at=NULL WHERE id=p_reservation_id AND cleanup_claim_token=p_claim_token; ELSE UPDATE public.community_submission_reservations SET cleanup_claim_token=NULL,cleanup_claimed_at=NULL WHERE id=p_reservation_id AND cleanup_claim_token=p_claim_token; END IF;
 RETURN FOUND;
END $$;
CREATE OR REPLACE FUNCTION public.create_community_submission(p_reservation_id uuid,p_email_hash text,p_file_path text,p_title text,p_file_size bigint,p_page_count integer,p_content_type text,p_content_category text,p_content_subcategory text,p_subject text,p_description text,p_submitter_name text,p_submitter_email text,p_submitter_note text,p_copyright_confirmed boolean,p_user_id uuid,p_content_hash text,p_malware_status text,p_review_warnings text[]) RETURNS public.community_submissions LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_res public.community_submission_reservations;v_row public.community_submissions;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_res FROM public.community_submission_reservations WHERE id=p_reservation_id FOR UPDATE;
 IF NOT FOUND OR v_res.email_hash<>p_email_hash OR v_res.expected_path<>p_file_path THEN RAISE EXCEPTION 'invalid reservation' USING ERRCODE='22023'; END IF;
 IF v_res.consumed_at IS NOT NULL THEN IF v_res.consumed_path=p_file_path THEN SELECT * INTO v_row FROM public.community_submissions WHERE file_path=v_res.consumed_path;IF FOUND THEN RETURN v_row;END IF;END IF;RAISE EXCEPTION 'invalid consumed reservation without matching submission' USING ERRCODE='22023';END IF;
 IF v_res.cleaned_at IS NOT NULL THEN RAISE EXCEPTION 'invalid or expired reservation' USING ERRCODE='22023';END IF;
 IF v_res.cleanup_claim_token IS NOT NULL AND v_res.cleanup_claimed_at>=now()-interval '5 minutes' THEN RAISE EXCEPTION 'reservation cleanup in progress' USING ERRCODE='55P03';END IF;
 IF v_res.expires_at<=now() THEN RAISE EXCEPTION 'invalid or expired reservation' USING ERRCODE='22023';END IF;
 INSERT INTO public.community_submissions(title,file_path,file_size,page_count,content_type,content_category,content_subcategory,subject,description,submitter_name,submitter_email,submitter_note,copyright_confirmed,user_id,content_hash,malware_status,review_warnings) VALUES(p_title,p_file_path,p_file_size,p_page_count,p_content_type,p_content_category,p_content_subcategory,p_subject,p_description,p_submitter_name,p_submitter_email,p_submitter_note,p_copyright_confirmed,p_user_id,p_content_hash,p_malware_status,COALESCE(p_review_warnings,'{}'::text[])) RETURNING * INTO v_row;
 UPDATE public.community_submission_reservations SET consumed_at=now(),consumed_path=p_file_path WHERE id=p_reservation_id;RETURN v_row;
END $$;
REVOKE ALL ON FUNCTION public.claim_expired_community_uploads(integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.finish_community_upload_cleanup(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.create_community_submission(uuid,text,text,text,bigint,integer,text,text,text,text,text,text,text,text,boolean,uuid,text,text,text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_expired_community_uploads(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_community_upload_cleanup(uuid,uuid,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_community_submission(uuid,text,text,text,bigint,integer,text,text,text,text,text,text,text,text,boolean,uuid,text,text,text[]) TO service_role;
NOTIFY pgrst,'reload schema';
-- END 046_community_upload_cleanup_claims.sql

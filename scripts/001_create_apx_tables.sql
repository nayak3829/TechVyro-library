-- Create tables for storing APX test series data
-- This stores test series, tests, and questions from APX platforms

-- Platforms table - stores APX platform information
CREATE TABLE IF NOT EXISTS public.apx_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  api_url TEXT NOT NULL UNIQUE,
  web_url TEXT,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Test series table - stores test series from platforms
CREATE TABLE IF NOT EXISTS public.apx_test_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id UUID REFERENCES public.apx_platforms(id) ON DELETE CASCADE,
  external_id TEXT, -- Original ID from the APX platform
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  total_tests INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  duration INTEGER DEFAULT 60, -- in minutes
  is_free BOOLEAN DEFAULT true,
  thumbnail_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform_id, slug)
);

-- Tests table - stores individual tests within a series
CREATE TABLE IF NOT EXISTS public.apx_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID REFERENCES public.apx_test_series(id) ON DELETE CASCADE,
  external_id TEXT, -- Original ID from the APX platform
  slug TEXT,
  title TEXT NOT NULL,
  description TEXT,
  duration INTEGER DEFAULT 60, -- in minutes
  total_questions INTEGER DEFAULT 0,
  max_marks INTEGER DEFAULT 0,
  negative_marks DECIMAL(3,2) DEFAULT 0,
  is_free BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions table - stores questions for each test
CREATE TABLE IF NOT EXISTS public.apx_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES public.apx_tests(id) ON DELETE CASCADE,
  external_id TEXT, -- Original question ID
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_html TEXT, -- HTML version if available
  options JSONB NOT NULL DEFAULT '[]', -- Array of options
  correct_option INTEGER, -- 0-indexed correct option
  explanation TEXT,
  explanation_html TEXT,
  marks INTEGER DEFAULT 1,
  negative_marks DECIMAL(3,2) DEFAULT 0,
  subject TEXT,
  topic TEXT,
  difficulty TEXT DEFAULT 'medium',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_apx_test_series_category ON public.apx_test_series(category);
CREATE INDEX IF NOT EXISTS idx_apx_test_series_platform ON public.apx_test_series(platform_id);
CREATE INDEX IF NOT EXISTS idx_apx_tests_series ON public.apx_tests(series_id);
CREATE INDEX IF NOT EXISTS idx_apx_questions_test ON public.apx_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_apx_platforms_category ON public.apx_platforms(category);

-- Enable Row Level Security
ALTER TABLE public.apx_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apx_test_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apx_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apx_questions ENABLE ROW LEVEL SECURITY;

-- Public read access for all APX tables (anyone can read test data)
CREATE POLICY "Anyone can read platforms" ON public.apx_platforms FOR SELECT USING (true);
CREATE POLICY "Anyone can read test series" ON public.apx_test_series FOR SELECT USING (true);
CREATE POLICY "Anyone can read tests" ON public.apx_tests FOR SELECT USING (true);
CREATE POLICY "Anyone can read questions" ON public.apx_questions FOR SELECT USING (true);

-- Only service role can insert/update/delete (used by sync scripts)
CREATE POLICY "Service role can manage platforms" ON public.apx_platforms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage test series" ON public.apx_test_series FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage tests" ON public.apx_tests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage questions" ON public.apx_questions FOR ALL USING (true) WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_apx_platforms_updated_at ON public.apx_platforms;
CREATE TRIGGER update_apx_platforms_updated_at
  BEFORE UPDATE ON public.apx_platforms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_apx_test_series_updated_at ON public.apx_test_series;
CREATE TRIGGER update_apx_test_series_updated_at
  BEFORE UPDATE ON public.apx_test_series
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_apx_tests_updated_at ON public.apx_tests;
CREATE TRIGGER update_apx_tests_updated_at
  BEFORE UPDATE ON public.apx_tests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_apx_questions_updated_at ON public.apx_questions;
CREATE TRIGGER update_apx_questions_updated_at
  BEFORE UPDATE ON public.apx_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

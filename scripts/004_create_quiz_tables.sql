-- Create quizzes table
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

ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS negative_marking DECIMAL(6,2) DEFAULT 0;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS passing_percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT FALSE;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS shuffle_options BOOLEAN DEFAULT FALSE;

-- Create quiz_results table (leaderboard)
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

-- Enable RLS
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

-- Public read for published quizzes. All mutations go through authenticated
-- server routes using the service role.
CREATE POLICY "Allow public read on quizzes" ON quizzes
  FOR SELECT USING (enabled = TRUE AND visibility IN ('public', 'unlisted'));

CREATE POLICY "Users read own quiz results" ON quiz_results
  FOR SELECT TO authenticated USING ((auth.uid())::text = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_enabled ON quizzes(enabled);
CREATE INDEX IF NOT EXISTS idx_quizzes_category ON quizzes(category);
CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_id ON quiz_results(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_percentage ON quiz_results(percentage DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_results_created_at ON quiz_results(created_at DESC);

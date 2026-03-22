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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

-- Public read for enabled quizzes
CREATE POLICY "Allow public read on quizzes" ON quizzes
  FOR SELECT USING (true);

-- Allow anyone to insert quiz results
CREATE POLICY "Allow public insert on quiz_results" ON quiz_results
  FOR INSERT WITH CHECK (true);

-- Allow public read on quiz results
CREATE POLICY "Allow public read on quiz_results" ON quiz_results
  FOR SELECT USING (true);

-- Allow delete on quiz_results (admin handles auth at API level)
CREATE POLICY "Allow delete on quiz_results" ON quiz_results
  FOR DELETE USING (true);

-- Allow all on quizzes (admin handles auth at API level)
CREATE POLICY "Allow insert on quizzes" ON quizzes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update on quizzes" ON quizzes
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete on quizzes" ON quizzes
  FOR DELETE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_enabled ON quizzes(enabled);
CREATE INDEX IF NOT EXISTS idx_quizzes_category ON quizzes(category);
CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_id ON quiz_results(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_percentage ON quiz_results(percentage DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_results_created_at ON quiz_results(created_at DESC);

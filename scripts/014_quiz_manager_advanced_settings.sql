ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS negative_marking DECIMAL(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS passing_percentage DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS shuffle_options BOOLEAN DEFAULT FALSE;

ALTER TABLE public.quizzes
  DROP CONSTRAINT IF EXISTS quizzes_negative_marking_check,
  ADD CONSTRAINT quizzes_negative_marking_check
    CHECK (negative_marking >= 0 AND negative_marking <= 100),
  DROP CONSTRAINT IF EXISTS quizzes_passing_percentage_check,
  ADD CONSTRAINT quizzes_passing_percentage_check
    CHECK (passing_percentage >= 0 AND passing_percentage <= 100);
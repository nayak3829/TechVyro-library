-- Quiz questions contain correct answers and explanations. Remove every direct
-- policy and privilege so all quiz reads are mediated by server-only routes.
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'quizzes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.quizzes', policy_name);
  END LOOP;
END
$$;

REVOKE ALL PRIVILEGES ON TABLE public.quizzes FROM PUBLIC, anon, authenticated;

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS question_count INTEGER GENERATED ALWAYS AS (
    CASE WHEN jsonb_typeof(questions) = 'array' THEN jsonb_array_length(questions) ELSE 0 END
  ) STORED;

GRANT ALL PRIVILEGES ON TABLE public.quizzes TO service_role;

NOTIFY pgrst, 'reload schema';
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Allow insert on quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Allow update on quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Allow delete on quizzes" ON public.quizzes;

-- The questions JSON contains answer keys. Quiz access is mediated by
-- service-role server routes, never by PostgREST client roles.
REVOKE ALL PRIVILEGES ON TABLE public.quizzes FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Allow public insert on quiz_results" ON public.quiz_results;
DROP POLICY IF EXISTS "Allow safe quiz result inserts" ON public.quiz_results;
DROP POLICY IF EXISTS "Allow public read on quiz_results" ON public.quiz_results;
DROP POLICY IF EXISTS "Allow delete on quiz_results" ON public.quiz_results;
DROP POLICY IF EXISTS "Users read own quiz results" ON public.quiz_results;
DROP POLICY IF EXISTS "Users can read own quiz results" ON public.quiz_results;

CREATE POLICY "Users read own quiz results"
  ON public.quiz_results FOR SELECT TO authenticated
  USING ((auth.uid())::text = user_id);
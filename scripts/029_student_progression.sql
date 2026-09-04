-- Server-authoritative student progression. Apply this migration through the
-- Supabase SQL migration process; it is intentionally not included in FULL_SETUP.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.study_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  source_result_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_key)
);

CREATE TABLE IF NOT EXISTS public.student_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  last_study_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.xp_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.study_events(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id)
);

CREATE TABLE IF NOT EXISTS public.achievement_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  source_event_id UUID REFERENCES public.study_events(id) ON DELETE SET NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_key)
);

CREATE INDEX IF NOT EXISTS study_events_user_created_idx ON public.study_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS xp_ledger_user_created_idx ON public.xp_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS achievement_unlocks_user_unlocked_idx ON public.achievement_unlocks(user_id, unlocked_at DESC);

ALTER TABLE public.study_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own study events" ON public.study_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Students read own progress" ON public.student_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Students read own XP ledger" ON public.xp_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Students read own achievement unlocks" ON public.achievement_unlocks FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Called only by server code using the service-role JWT. It derives every
-- reward input from the already-inserted quiz result rather than its arguments.
CREATE OR REPLACE FUNCTION public.award_quiz_progress(p_user_id UUID, p_result_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result RECORD;
  v_event_id UUID;
  v_inserted BOOLEAN := false;
  v_xp INTEGER;
  v_today DATE := (now() AT TIME ZONE 'UTC')::date;
  v_progress public.student_progress%ROWTYPE;
  v_new_streak INTEGER;
  v_unlocked JSONB := '[]'::jsonb;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;

  SELECT id, correct, wrong, skipped, percentage
    INTO v_result
    FROM public.quiz_results
    WHERE id = p_result_id AND user_id = p_user_id::text;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'verified quiz result not found for student' USING ERRCODE = 'P0002';
  END IF;

  -- 10 completion XP, 2 per correct response, and a server-derived score bonus.
  v_xp := 10 + (GREATEST(v_result.correct, 0) * 2)
    + CASE WHEN v_result.percentage >= 90 THEN 20 WHEN v_result.percentage >= 75 THEN 10 ELSE 0 END;

  INSERT INTO public.study_events (user_id, event_key, event_type, source_result_id)
    VALUES (p_user_id, 'quiz-result:' || p_result_id, 'quiz_completed', p_result_id)
    ON CONFLICT (user_id, event_key) DO NOTHING
    RETURNING id INTO v_event_id;
  v_inserted := FOUND;

  IF NOT v_inserted THEN
    SELECT * INTO v_progress FROM public.student_progress WHERE user_id = p_user_id;
    RETURN jsonb_build_object('awarded', false, 'progress', to_jsonb(v_progress), 'unlockedAchievements', '[]'::jsonb);
  END IF;

  INSERT INTO public.student_progress (user_id, total_xp, current_streak, longest_streak, last_study_date)
    VALUES (p_user_id, 0, 0, 0, NULL)
    ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_progress FROM public.student_progress WHERE user_id = p_user_id FOR UPDATE;

  v_new_streak := CASE
    WHEN v_progress.last_study_date = v_today THEN v_progress.current_streak
    WHEN v_progress.last_study_date = v_today - 1 THEN v_progress.current_streak + 1
    ELSE 1
  END;
  UPDATE public.student_progress
    SET total_xp = total_xp + v_xp,
        current_streak = v_new_streak,
        longest_streak = GREATEST(longest_streak, v_new_streak),
        last_study_date = v_today,
        updated_at = now()
    WHERE user_id = p_user_id
    RETURNING * INTO v_progress;
  INSERT INTO public.xp_ledger (user_id, event_id, amount, reason)
    VALUES (p_user_id, v_event_id, v_xp, 'quiz_completed');

  WITH candidates(achievement_key) AS (
    SELECT 'first_quiz' WHERE (SELECT count(*) FROM public.study_events WHERE user_id = p_user_id AND event_type = 'quiz_completed') >= 1
    UNION ALL SELECT 'xp_100' WHERE v_progress.total_xp >= 100
    UNION ALL SELECT 'streak_7' WHERE v_progress.current_streak >= 7
    UNION ALL SELECT 'perfect_score' WHERE v_result.percentage >= 100
  ), inserted AS (
    INSERT INTO public.achievement_unlocks (user_id, achievement_key, source_event_id)
      SELECT p_user_id, achievement_key, v_event_id FROM candidates
      ON CONFLICT (user_id, achievement_key) DO NOTHING
      RETURNING achievement_key, unlocked_at
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(inserted)), '[]'::jsonb) INTO v_unlocked FROM inserted;

  RETURN jsonb_build_object('awarded', true, 'xpAwarded', v_xp, 'progress', to_jsonb(v_progress), 'unlockedAchievements', v_unlocked);
END;
$$;

REVOKE ALL ON TABLE public.study_events, public.student_progress, public.xp_ledger, public.achievement_unlocks FROM anon, authenticated;
-- RLS limits these read grants to auth.uid() rows; no browser mutation grants
-- are provided for progression state or XP.
GRANT SELECT ON TABLE public.study_events, public.student_progress, public.xp_ledger, public.achievement_unlocks TO authenticated;
REVOKE ALL ON FUNCTION public.award_quiz_progress(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_quiz_progress(UUID, TEXT) TO service_role;
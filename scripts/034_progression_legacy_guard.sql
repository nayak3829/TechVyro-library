-- Canonicalize progression awarded by migration 029, where event keys were
-- result-based, so those students cannot earn a second award for the same quiz.
WITH ranked_legacy AS (
  SELECT
    se.id,
    se.user_id,
    'quiz:' || qr.quiz_id AS canonical_key,
    row_number() OVER (
      PARTITION BY se.user_id, qr.quiz_id
      ORDER BY se.created_at, se.id
    ) AS quiz_event_number
  FROM public.study_events se
  JOIN public.quiz_results qr
    ON qr.id = se.source_result_id
   AND qr.user_id = se.user_id::text
  WHERE se.event_type = 'quiz_completed'
    AND qr.quiz_id IS NOT NULL
    AND qr.quiz_id <> ''
    AND se.event_key LIKE 'quiz-result:%'
),
canonical_candidates AS (
  SELECT id, user_id, canonical_key
  FROM ranked_legacy
  WHERE quiz_event_number = 1
)
UPDATE public.study_events se
SET event_key = candidate.canonical_key
FROM canonical_candidates candidate
WHERE se.id = candidate.id
  AND NOT EXISTS (
    SELECT 1
    FROM public.study_events existing
    WHERE existing.user_id = candidate.user_id
      AND existing.event_key = candidate.canonical_key
  );

CREATE OR REPLACE FUNCTION public.award_quiz_progress(p_user_id UUID, p_result_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result RECORD;
  v_event_id UUID;
  v_xp INTEGER;
  v_today DATE := (now() AT TIME ZONE 'UTC')::date;
  v_progress public.student_progress%ROWTYPE;
  v_new_streak INTEGER;
  v_unlocked JSONB := '[]'::jsonb;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;

  SELECT id, quiz_id, correct, percentage
  INTO v_result
  FROM public.quiz_results
  WHERE id = p_result_id
    AND user_id = p_user_id::text;

  IF NOT FOUND OR v_result.quiz_id IS NULL OR v_result.quiz_id = '' THEN
    RAISE EXCEPTION 'verified quiz result with quiz ID not found for student'
      USING ERRCODE = 'P0002';
  END IF;

  -- The canonical key catches current events. The join catches any remaining
  -- legacy result-key event that could not be canonicalized during migration.
  IF EXISTS (
    SELECT 1
    FROM public.study_events se
    JOIN public.quiz_results prior_result
      ON prior_result.id = se.source_result_id
     AND prior_result.user_id = se.user_id::text
    WHERE se.user_id = p_user_id
      AND se.event_type = 'quiz_completed'
      AND prior_result.quiz_id = v_result.quiz_id
  ) THEN
    SELECT * INTO v_progress
    FROM public.student_progress
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
      'awarded', false,
      'progress', to_jsonb(v_progress),
      'unlockedAchievements', '[]'::jsonb
    );
  END IF;

  v_xp := 10 + (GREATEST(v_result.correct, 0) * 2)
    + CASE
        WHEN v_result.percentage >= 90 THEN 20
        WHEN v_result.percentage >= 75 THEN 10
        ELSE 0
      END;

  INSERT INTO public.study_events (user_id, event_key, event_type, source_result_id)
  VALUES (p_user_id, 'quiz:' || v_result.quiz_id, 'quiz_completed', p_result_id)
  ON CONFLICT (user_id, event_key) DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    SELECT * INTO v_progress
    FROM public.student_progress
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
      'awarded', false,
      'progress', to_jsonb(v_progress),
      'unlockedAchievements', '[]'::jsonb
    );
  END IF;

  INSERT INTO public.student_progress (
    user_id, total_xp, current_streak, longest_streak, last_study_date
  )
  VALUES (p_user_id, 0, 0, 0, NULL)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_progress
  FROM public.student_progress
  WHERE user_id = p_user_id
  FOR UPDATE;

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
    SELECT 'first_quiz'
    UNION ALL SELECT 'xp_100' WHERE v_progress.total_xp >= 100
    UNION ALL SELECT 'streak_7' WHERE v_progress.current_streak >= 7
    UNION ALL SELECT 'perfect_score' WHERE v_result.percentage >= 100
  ),
  inserted AS (
    INSERT INTO public.achievement_unlocks (
      user_id, achievement_key, source_event_id
    )
    SELECT p_user_id, achievement_key, v_event_id
    FROM candidates
    ON CONFLICT (user_id, achievement_key) DO NOTHING
    RETURNING achievement_key, unlocked_at
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(inserted)), '[]'::jsonb)
  INTO v_unlocked
  FROM inserted;

  RETURN jsonb_build_object(
    'awarded', true,
    'xpAwarded', v_xp,
    'progress', to_jsonb(v_progress),
    'unlockedAchievements', v_unlocked
  );
END;
$$;

REVOKE ALL ON FUNCTION public.award_quiz_progress(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_quiz_progress(UUID, TEXT)
  TO service_role;
-- Progression is earned once per student/quiz, while quiz_results remains a
-- complete attempt history. Transport retries still resolve the same result.
CREATE OR REPLACE FUNCTION public.award_quiz_progress(p_user_id UUID, p_result_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_result RECORD; v_event_id UUID; v_inserted BOOLEAN := false; v_xp INTEGER;
  v_today DATE := (now() AT TIME ZONE 'UTC')::date; v_progress public.student_progress%ROWTYPE;
  v_new_streak INTEGER; v_unlocked JSONB := '[]'::jsonb;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE = '42501'; END IF;
  SELECT id, quiz_id, correct, percentage INTO v_result FROM public.quiz_results
    WHERE id = p_result_id AND user_id = p_user_id::text;
  IF NOT FOUND OR v_result.quiz_id IS NULL OR v_result.quiz_id = '' THEN
    RAISE EXCEPTION 'verified quiz result with quiz ID not found for student' USING ERRCODE = 'P0002';
  END IF;
  v_xp := 10 + (GREATEST(v_result.correct, 0) * 2) + CASE WHEN v_result.percentage >= 90 THEN 20 WHEN v_result.percentage >= 75 THEN 10 ELSE 0 END;
  -- The existing unique (user_id,event_key) serializes simultaneous first attempts.
  INSERT INTO public.study_events (user_id,event_key,event_type,source_result_id)
    VALUES (p_user_id, 'quiz:' || v_result.quiz_id, 'quiz_completed', p_result_id)
    ON CONFLICT (user_id,event_key) DO NOTHING RETURNING id INTO v_event_id;
  v_inserted := FOUND;
  IF NOT v_inserted THEN
    SELECT * INTO v_progress FROM public.student_progress WHERE user_id=p_user_id;
    RETURN jsonb_build_object('awarded',false,'progress',to_jsonb(v_progress),'unlockedAchievements','[]'::jsonb);
  END IF;
  INSERT INTO public.student_progress (user_id,total_xp,current_streak,longest_streak,last_study_date)
    VALUES (p_user_id,0,0,0,NULL) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_progress FROM public.student_progress WHERE user_id=p_user_id FOR UPDATE;
  v_new_streak := CASE WHEN v_progress.last_study_date=v_today THEN v_progress.current_streak WHEN v_progress.last_study_date=v_today-1 THEN v_progress.current_streak+1 ELSE 1 END;
  UPDATE public.student_progress SET total_xp=total_xp+v_xp,current_streak=v_new_streak,longest_streak=GREATEST(longest_streak,v_new_streak),last_study_date=v_today,updated_at=now()
    WHERE user_id=p_user_id RETURNING * INTO v_progress;
  INSERT INTO public.xp_ledger(user_id,event_id,amount,reason) VALUES(p_user_id,v_event_id,v_xp,'quiz_completed');
  WITH candidates(achievement_key) AS (
    SELECT 'first_quiz' UNION ALL SELECT 'xp_100' WHERE v_progress.total_xp>=100 UNION ALL SELECT 'streak_7' WHERE v_progress.current_streak>=7 UNION ALL SELECT 'perfect_score' WHERE v_result.percentage>=100
  ), inserted AS (
    INSERT INTO public.achievement_unlocks(user_id,achievement_key,source_event_id) SELECT p_user_id,achievement_key,v_event_id FROM candidates
    ON CONFLICT (user_id,achievement_key) DO NOTHING RETURNING achievement_key,unlocked_at
  ) SELECT COALESCE(jsonb_agg(to_jsonb(inserted)),'[]'::jsonb) INTO v_unlocked FROM inserted;
  RETURN jsonb_build_object('awarded',true,'xpAwarded',v_xp,'progress',to_jsonb(v_progress),'unlockedAchievements',v_unlocked);
END; $$;
REVOKE ALL ON FUNCTION public.award_quiz_progress(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_quiz_progress(UUID, TEXT) TO service_role;
-- Atomic API operations for credits, favorites, downloads, quiz progression,
-- settings patches, and bounded analytics.

CREATE TABLE IF NOT EXISTS public.user_credit_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL DEFAULT 10 CHECK (credits >= 0 AND credits <= 1000000),
  is_premium BOOLEAN NOT NULL DEFAULT false,
  referral_code TEXT NOT NULL UNIQUE CHECK (referral_code ~ '^[A-Z0-9]{4,20}$'),
  referred_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_credit_accounts ENABLE ROW LEVEL SECURITY;

WITH source_accounts AS (
  SELECT
    users.id,
    users.raw_user_meta_data,
    upper(trim(users.raw_user_meta_data ->> 'referral_code')) AS requested_code
  FROM auth.users AS users
),
ranked_accounts AS (
  SELECT
    source_accounts.*,
    count(*) OVER (PARTITION BY requested_code) AS code_count
  FROM source_accounts
)
INSERT INTO public.user_credit_accounts (user_id, credits, is_premium, referral_code)
SELECT
  id,
  CASE
    WHEN raw_user_meta_data ->> 'credits' ~ '^\d{1,7}$'
      THEN least((raw_user_meta_data ->> 'credits')::INTEGER, 1000000)
    ELSE 10
  END,
  CASE
    WHEN lower(raw_user_meta_data ->> 'is_premium') IN ('true', 'false')
      THEN (raw_user_meta_data ->> 'is_premium')::BOOLEAN
    ELSE false
  END,
  CASE
    WHEN requested_code ~ '^[A-Z0-9]{4,20}$' AND code_count = 1 THEN requested_code
    ELSE 'TV' || upper(substr(replace(id::TEXT, '-', ''), 1, 10))
  END
FROM ranked_accounts
ON CONFLICT (user_id) DO NOTHING;

UPDATE public.user_credit_accounts AS account
SET referred_by_user_id = referrer.user_id,
    updated_at = now()
FROM auth.users AS users
JOIN public.user_credit_accounts AS referrer
  ON referrer.referral_code = upper(trim(users.raw_user_meta_data ->> 'referred_by'))
WHERE users.id = account.user_id
  AND account.referred_by_user_id IS NULL
  AND referrer.user_id <> account.user_id;

CREATE OR REPLACE FUNCTION public.ensure_user_credit_account(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_meta JSONB;
  v_code TEXT;
  v_credits INTEGER := 10;
  v_is_premium BOOLEAN := false;
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_credit_accounts WHERE user_id = p_user_id) THEN
    RETURN;
  END IF;

  SELECT COALESCE(raw_user_meta_data, '{}'::JSONB)
  INTO v_meta
  FROM auth.users
  WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_meta ->> 'credits' ~ '^\d{1,7}$' THEN
    v_credits := least((v_meta ->> 'credits')::INTEGER, 1000000);
  END IF;
  IF lower(v_meta ->> 'is_premium') IN ('true', 'false') THEN
    v_is_premium := (v_meta ->> 'is_premium')::BOOLEAN;
  END IF;
  v_code := upper(trim(v_meta ->> 'referral_code'));
  IF v_code !~ '^[A-Z0-9]{4,20}$'
    OR EXISTS (SELECT 1 FROM public.user_credit_accounts WHERE referral_code = v_code) THEN
    v_code := NULL;
  END IF;

  LOOP
    IF v_code IS NULL THEN
      v_code := upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 10));
    END IF;
    BEGIN
      INSERT INTO public.user_credit_accounts (user_id, credits, is_premium, referral_code)
      VALUES (p_user_id, v_credits, v_is_premium, v_code);
      RETURN;
    EXCEPTION WHEN unique_violation THEN
      IF EXISTS (SELECT 1 FROM public.user_credit_accounts WHERE user_id = p_user_id) THEN
        RETURN;
      END IF;
      v_code := NULL;
    END;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_user_credit_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.ensure_user_credit_account(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_user_credit_account_after_signup ON auth.users;
CREATE TRIGGER create_user_credit_account_after_signup
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.create_user_credit_account();

CREATE OR REPLACE FUNCTION public.get_user_credit_account(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account public.user_credit_accounts%ROWTYPE;
  v_referred_by TEXT;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  PERFORM public.ensure_user_credit_account(p_user_id);
  SELECT * INTO STRICT v_account
  FROM public.user_credit_accounts
  WHERE user_id = p_user_id;
  SELECT referral_code INTO v_referred_by
  FROM public.user_credit_accounts
  WHERE user_id = v_account.referred_by_user_id;
  RETURN jsonb_build_object(
    'credits', v_account.credits,
    'is_premium', v_account.is_premium,
    'referral_code', v_account.referral_code,
    'referred_by', v_referred_by
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.spend_user_credit(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account public.user_credit_accounts%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  PERFORM public.ensure_user_credit_account(p_user_id);
  SELECT * INTO STRICT v_account
  FROM public.user_credit_accounts
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT v_account.is_premium AND v_account.credits <= 0 THEN
    RETURN jsonb_build_object('status', 'no_credits', 'credits', 0);
  END IF;
  IF NOT v_account.is_premium THEN
    UPDATE public.user_credit_accounts
    SET credits = credits - 1, updated_at = now()
    WHERE user_id = p_user_id
    RETURNING * INTO v_account;
  END IF;
  RETURN jsonb_build_object(
    'status', 'ok',
    'credits', v_account.credits,
    'is_premium', v_account.is_premium,
    'referral_code', v_account.referral_code
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_user_referral(p_user_id UUID, p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account public.user_credit_accounts%ROWTYPE;
  v_referrer public.user_credit_accounts%ROWTYPE;
  v_code TEXT := upper(trim(p_code));
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  IF v_code !~ '^[A-Z0-9]{4,20}$' THEN
    RETURN jsonb_build_object('status', 'invalid_code');
  END IF;

  PERFORM public.ensure_user_credit_account(p_user_id);
  SELECT * INTO v_referrer
  FROM public.user_credit_accounts
  WHERE referral_code = v_code;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'invalid_code');
  END IF;
  IF v_referrer.user_id = p_user_id THEN
    RETURN jsonb_build_object('status', 'own_code');
  END IF;

  PERFORM 1
  FROM public.user_credit_accounts
  WHERE user_id IN (p_user_id, v_referrer.user_id)
  ORDER BY user_id
  FOR UPDATE;

  SELECT * INTO STRICT v_account
  FROM public.user_credit_accounts
  WHERE user_id = p_user_id;
  IF v_account.referred_by_user_id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'already_redeemed');
  END IF;

  UPDATE public.user_credit_accounts
  SET credits = least(credits + 5, 1000000), updated_at = now()
  WHERE user_id = v_referrer.user_id;
  UPDATE public.user_credit_accounts
  SET credits = least(credits + 5, 1000000),
      referred_by_user_id = v_referrer.user_id,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO v_account;

  RETURN jsonb_build_object(
    'status', 'ok',
    'bonusEarned', 5,
    'credits', v_account.credits,
    'is_premium', v_account.is_premium,
    'referral_code', v_account.referral_code,
    'referred_by', v_referrer.referral_code
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_pdf_favorite(
  p_user_id UUID,
  p_device_id TEXT,
  p_pdf_id UUID
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
  v_identity TEXT;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL AND (p_device_id IS NULL OR p_device_id !~ '^[0-9a-fA-F-]{36}$') THEN
    RAISE EXCEPTION 'valid user or device is required' USING ERRCODE = '22023';
  END IF;
  v_identity := COALESCE(p_user_id::TEXT, p_device_id);
  PERFORM pg_advisory_xact_lock(hashtextextended(v_identity || ':' || p_pdf_id::TEXT, 0));

  IF p_user_id IS NOT NULL THEN
    SELECT id INTO v_id
    FROM public.pdf_favorites
    WHERE user_id = p_user_id::TEXT AND pdf_id = p_pdf_id
    LIMIT 1;
  ELSE
    SELECT id INTO v_id
    FROM public.pdf_favorites
    WHERE user_id IS NULL AND device_id = p_device_id AND pdf_id = p_pdf_id
    LIMIT 1;
  END IF;

  IF v_id IS NOT NULL THEN
    DELETE FROM public.pdf_favorites WHERE id = v_id;
    RETURN 'removed';
  END IF;

  INSERT INTO public.pdf_favorites (device_id, user_id, pdf_id)
  VALUES (CASE WHEN p_user_id IS NULL THEN p_device_id END, p_user_id::TEXT, p_pdf_id);
  RETURN 'added';
END;
$$;

CREATE OR REPLACE FUNCTION public.record_pdf_download(
  p_pdf_id UUID,
  p_event_key TEXT,
  p_user_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event_id BIGINT;
  v_count INTEGER;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.analytics_events(pdf_id, event_type, event_key)
  VALUES (p_pdf_id, 'download', NULLIF(p_event_key, ''))
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    SELECT COALESCE(download_count, 0) INTO v_count
    FROM public.pdfs
    WHERE id = p_pdf_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'PDF not found' USING ERRCODE = 'P0002'; END IF;
    RETURN jsonb_build_object('recorded', false, 'download_count', v_count);
  END IF;

  UPDATE public.pdfs
  SET download_count = COALESCE(download_count, 0) + 1
  WHERE id = p_pdf_id
  RETURNING download_count INTO v_count;
  IF v_count IS NULL THEN RAISE EXCEPTION 'PDF not found' USING ERRCODE = 'P0002'; END IF;

  IF p_user_id IS NOT NULL THEN
    PERFORM public.record_user_pdf_activity(p_user_id, p_pdf_id, 'download');
  END IF;
  RETURN jsonb_build_object('recorded', true, 'download_count', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.patch_site_setting_json(p_key TEXT, p_patch JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_value JSONB;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  IF p_key IS NULL OR p_key = '' OR p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
    RAISE EXCEPTION 'setting key and object patch are required' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.site_settings (key, value, updated_at)
  VALUES (p_key, p_patch, now())
  ON CONFLICT (key) DO UPDATE
  SET value = COALESCE(public.site_settings.value, '{}'::JSONB) || EXCLUDED.value,
      updated_at = now()
  RETURNING value INTO v_value;
  RETURN v_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_quiz_result_and_award_progress(
  p_result_id TEXT,
  p_user_id UUID,
  p_client_attempt_id UUID,
  p_name TEXT,
  p_score NUMERIC,
  p_percentage NUMERIC,
  p_correct INTEGER,
  p_wrong INTEGER,
  p_skipped INTEGER,
  p_total_time INTEGER,
  p_quiz_id TEXT,
  p_quiz_title TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result public.quiz_results%ROWTYPE;
  v_progression JSONB;
  v_duplicate BOOLEAN := false;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.quiz_results (
    id, name, score, percentage, correct, wrong, skipped, total_time,
    quiz_id, quiz_title, user_id, client_attempt_id
  ) VALUES (
    p_result_id, p_name, p_score, p_percentage, p_correct, p_wrong, p_skipped,
    p_total_time, p_quiz_id, p_quiz_title, p_user_id::TEXT, p_client_attempt_id
  )
  ON CONFLICT (user_id, client_attempt_id) WHERE client_attempt_id IS NOT NULL
  DO NOTHING
  RETURNING * INTO v_result;

  IF v_result.id IS NULL THEN
    v_duplicate := true;
    SELECT * INTO STRICT v_result
    FROM public.quiz_results
    WHERE user_id = p_user_id::TEXT
      AND client_attempt_id = p_client_attempt_id;
  END IF;

  v_progression := public.award_quiz_progress(p_user_id, v_result.id);
  RETURN jsonb_build_object(
    'result', to_jsonb(v_result) - 'user_id' - 'client_attempt_id',
    'progression', v_progression,
    'duplicate', v_duplicate
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_analytics_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  WITH totals AS (
    SELECT
      count(*)::BIGINT AS total_pdfs,
      COALESCE(sum(view_count), 0)::BIGINT AS total_views,
      COALESCE(sum(download_count), 0)::BIGINT AS total_downloads,
      COALESCE(sum(review_count), 0)::BIGINT AS total_reviews,
      COALESCE(sum(file_size), 0)::BIGINT AS total_storage,
      count(*) FILTER (WHERE COALESCE(review_count, 0) > 0)::BIGINT AS reviewed_pdfs,
      count(*) FILTER (WHERE COALESCE(average_rating, 0) >= 4)::BIGINT AS high_rated,
      count(*) FILTER (WHERE COALESCE(average_rating, 0) >= 2 AND average_rating < 4)::BIGINT AS medium_rated,
      count(*) FILTER (WHERE COALESCE(average_rating, 0) > 0 AND average_rating < 2)::BIGINT AS low_rated,
      count(*) FILTER (WHERE COALESCE(average_rating, 0) = 0)::BIGINT AS unrated,
      count(*) FILTER (WHERE COALESCE(download_count, 0) >= 10 AND COALESCE(average_rating, 0) >= 4)::BIGINT AS top_performers,
      count(*) FILTER (WHERE COALESCE(view_count, 0) < 10 AND COALESCE(download_count, 0) = 0)::BIGINT AS underperformers,
      CASE WHEN COALESCE(sum(review_count), 0) > 0
        THEN sum(COALESCE(average_rating, 0) * COALESCE(review_count, 0)) / sum(review_count)
        ELSE 0 END AS avg_rating
    FROM public.pdfs
  ),
  top_views AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', ranked.id, 'title', ranked.title,
      'views', ranked.view_count, 'downloads', ranked.download_count
    ) ORDER BY ranked.view_count DESC, ranked.id), '[]'::JSONB) AS value
    FROM (
      SELECT id, title, COALESCE(view_count, 0) AS view_count,
        COALESCE(download_count, 0) AS download_count
      FROM public.pdfs ORDER BY COALESCE(view_count, 0) DESC, id LIMIT 5
    ) AS ranked
  ),
  top_downloads AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', ranked.id, 'title', ranked.title,
      'views', ranked.view_count, 'downloads', ranked.download_count
    ) ORDER BY ranked.download_count DESC, ranked.id), '[]'::JSONB) AS value
    FROM (
      SELECT id, title, COALESCE(view_count, 0) AS view_count,
        COALESCE(download_count, 0) AS download_count
      FROM public.pdfs ORDER BY COALESCE(download_count, 0) DESC, id LIMIT 5
    ) AS ranked
  ),
  category_summary AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', grouped.id, 'name', grouped.name, 'color', grouped.color,
      'count', grouped.pdf_count, 'views', grouped.views, 'downloads', grouped.downloads
    ) ORDER BY grouped.pdf_count DESC, grouped.name), '[]'::JSONB) AS value
    FROM (
      SELECT category.id, category.name, category.color, count(pdf.id)::BIGINT AS pdf_count,
        COALESCE(sum(pdf.view_count), 0)::BIGINT AS views,
        COALESCE(sum(pdf.download_count), 0)::BIGINT AS downloads
      FROM public.categories AS category
      JOIN public.pdfs AS pdf ON pdf.category_id = category.id
      GROUP BY category.id, category.name, category.color
    ) AS grouped
  )
  SELECT jsonb_build_object(
    'stats', jsonb_build_object(
      'totalViews', totals.total_views,
      'totalDownloads', totals.total_downloads,
      'totalReviews', totals.total_reviews,
      'totalPdfs', totals.total_pdfs,
      'totalStorage', totals.total_storage,
      'avgRating', totals.avg_rating,
      'reviewedPdfs', totals.reviewed_pdfs,
      'engagementRate', CASE WHEN totals.total_views > 0
        THEN totals.total_downloads::NUMERIC / totals.total_views * 100 ELSE 0 END,
      'avgDownloads', CASE WHEN totals.total_pdfs > 0
        THEN totals.total_downloads::NUMERIC / totals.total_pdfs ELSE 0 END
    ),
    'performance', jsonb_build_object(
      'highRated', totals.high_rated,
      'mediumRated', totals.medium_rated,
      'lowRated', totals.low_rated,
      'unrated', totals.unrated,
      'topPerformers', totals.top_performers,
      'underperformers', totals.underperformers
    ),
    'topPdfs', top_views.value,
    'topDownloads', top_downloads.value,
    'categories', category_summary.value
  ) INTO v_result
  FROM totals, top_views, top_downloads, category_summary;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_quiz_analytics(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  WITH user_results AS (
    SELECT result.*, quiz.category AS quiz_category, COALESCE(quiz.title, result.quiz_title, 'Unknown quiz') AS display_title
    FROM public.quiz_results AS result
    LEFT JOIN public.quizzes AS quiz ON quiz.id = result.quiz_id
    WHERE result.user_id = p_user_id::TEXT
  ),
  all_time AS (
    SELECT
      count(*)::BIGINT AS attempts,
      COALESCE(round(avg(percentage)), 0) AS average_score,
      COALESCE(max(percentage), 0) AS best_score,
      COALESCE(sum(correct), 0)::BIGINT AS correct,
      COALESCE(sum(wrong), 0)::BIGINT AS wrong,
      COALESCE(sum(skipped), 0)::BIGINT AS skipped
    FROM user_results
  ),
  recent_rows AS (
    SELECT created_at, percentage, quiz_id, display_title
    FROM user_results
    ORDER BY created_at DESC
    LIMIT 10
  ),
  recent AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'date', created_at,
      'percentage', COALESCE(percentage, 0),
      'quizId', quiz_id,
      'quizTitle', display_title
    ) ORDER BY created_at), '[]'::JSONB) AS value
    FROM recent_rows
  ),
  quiz_groups AS (
    SELECT
      COALESCE(quiz_id, 'unknown') AS key,
      max(display_title) AS label,
      count(*)::BIGINT AS attempts,
      COALESCE(round(avg(percentage)), 0) AS average_score,
      CASE WHEN COALESCE(sum(correct), 0) + COALESCE(sum(wrong), 0) + COALESCE(sum(skipped), 0) > 0
        THEN round(COALESCE(sum(correct), 0)::NUMERIC /
          (COALESCE(sum(correct), 0) + COALESCE(sum(wrong), 0) + COALESCE(sum(skipped), 0)) * 100)
        ELSE 0 END AS accuracy
    FROM user_results
    GROUP BY COALESCE(quiz_id, 'unknown')
  ),
  by_quiz AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'key', key, 'label', label, 'attempts', attempts,
      'averageScore', average_score, 'accuracy', accuracy
    ) ORDER BY attempts DESC, key), '[]'::JSONB) AS value
    FROM quiz_groups
  ),
  category_groups AS (
    SELECT
      COALESCE(quiz_category, 'Uncategorized') AS key,
      COALESCE(quiz_category, 'Uncategorized') AS label,
      count(*)::BIGINT AS attempts,
      COALESCE(round(avg(percentage)), 0) AS average_score,
      CASE WHEN COALESCE(sum(correct), 0) + COALESCE(sum(wrong), 0) + COALESCE(sum(skipped), 0) > 0
        THEN round(COALESCE(sum(correct), 0)::NUMERIC /
          (COALESCE(sum(correct), 0) + COALESCE(sum(wrong), 0) + COALESCE(sum(skipped), 0)) * 100)
        ELSE 0 END AS accuracy
    FROM user_results
    GROUP BY COALESCE(quiz_category, 'Uncategorized')
  ),
  by_category AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'key', key, 'label', label, 'attempts', attempts,
      'averageScore', average_score, 'accuracy', accuracy
    ) ORDER BY attempts DESC, key), '[]'::JSONB) AS value
    FROM category_groups
  ),
  weakest AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'key', ranked.key, 'label', ranked.label, 'attempts', ranked.attempts,
      'averageScore', ranked.average_score, 'accuracy', ranked.accuracy
    ) ORDER BY ranked.accuracy, ranked.attempts DESC), '[]'::JSONB) AS value
    FROM (
      SELECT * FROM category_groups ORDER BY accuracy, attempts DESC LIMIT 5
    ) AS ranked
  )
  SELECT jsonb_build_object(
    'allTime', jsonb_build_object(
      'attempts', all_time.attempts,
      'averageScore', all_time.average_score,
      'bestScore', all_time.best_score,
      'correct', all_time.correct,
      'wrong', all_time.wrong,
      'skipped', all_time.skipped,
      'accuracy', CASE WHEN all_time.correct + all_time.wrong + all_time.skipped > 0
        THEN round(all_time.correct::NUMERIC /
          (all_time.correct + all_time.wrong + all_time.skipped) * 100)
        ELSE 0 END
    ),
    'recentScoreTrend', recent.value,
    'byQuiz', by_quiz.value,
    'byCategory', by_category.value,
    'weakestAreas', weakest.value
  ) INTO v_result
  FROM all_time, recent, by_quiz, by_category, weakest;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.moderate_community_submission(
  p_submission_id UUID,
  p_action TEXT,
  p_reason TEXT,
  p_reviewed_by TEXT
) RETURNS public.community_submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.community_submissions;
  v_pdf_id UUID;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  IF p_action NOT IN ('approve', 'reject') OR nullif(btrim(p_reviewed_by), '') IS NULL THEN
    RAISE EXCEPTION 'invalid moderation input' USING ERRCODE = '22023';
  END IF;
  IF p_action = 'reject' AND nullif(btrim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'rejection reason required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_row
  FROM public.community_submissions
  WHERE id = p_submission_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'submission not found' USING ERRCODE = 'P0002'; END IF;

  IF v_row.status <> 'pending' THEN
    IF p_action = 'approve' AND v_row.status = 'approved' AND v_row.approved_pdf_id IS NOT NULL THEN
      INSERT INTO public.pdf_jobs (pdf_id, job_type, idempotency_key, status, available_at, payload, updated_at)
      VALUES (v_row.approved_pdf_id, 'process', 'process:' || v_row.approved_pdf_id, 'queued', now(), '{}'::JSONB, now())
      ON CONFLICT (idempotency_key) DO UPDATE SET
        status = CASE WHEN public.pdf_jobs.status IN ('completed', 'failed', 'dead') THEN 'queued' ELSE public.pdf_jobs.status END,
        attempts = CASE WHEN public.pdf_jobs.status IN ('completed', 'failed', 'dead') THEN 0 ELSE public.pdf_jobs.attempts END,
        last_error = CASE WHEN public.pdf_jobs.status IN ('completed', 'failed', 'dead') THEN NULL ELSE public.pdf_jobs.last_error END,
        completed_at = CASE WHEN public.pdf_jobs.status IN ('completed', 'failed', 'dead') THEN NULL ELSE public.pdf_jobs.completed_at END,
        available_at = CASE WHEN public.pdf_jobs.status IN ('completed', 'failed', 'dead') THEN now() ELSE public.pdf_jobs.available_at END,
        updated_at = now();
      RETURN v_row;
    END IF;
    IF p_action = 'reject' AND v_row.status = 'rejected' THEN RETURN v_row; END IF;
    RAISE EXCEPTION 'conflicting moderation transition' USING ERRCODE = 'P0001';
  END IF;

  IF p_action = 'approve' THEN
    IF v_row.malware_status <> 'clean' THEN
      RAISE EXCEPTION 'submission safety review prevents approval' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.pdfs (
      title, description, file_path, file_size, page_count, content_type,
      content_category, content_subcategory, subject, content_hash, contributed_by,
      category_id, structure_location, visibility, publish_status, processing_status,
      view_count, storage_bucket, malware_status, review_warnings
    ) VALUES (
      v_row.title, v_row.description, v_row.file_path, v_row.file_size, v_row.page_count,
      v_row.content_type, v_row.content_category, v_row.content_subcategory, v_row.subject,
      v_row.content_hash, v_row.submitter_name, NULL, NULL, 'public', 'published', 'queued',
      0, 'community-pdfs', 'clean', to_jsonb(v_row.review_warnings)
    ) RETURNING id INTO v_pdf_id;
    UPDATE public.community_submissions
    SET status = 'approved', reviewed_at = now(), reviewed_by = btrim(p_reviewed_by),
      approved_pdf_id = v_pdf_id, rejection_reason = NULL
    WHERE id = p_submission_id
    RETURNING * INTO v_row;
    INSERT INTO public.pdf_jobs (pdf_id, job_type, idempotency_key, status, available_at, payload, updated_at)
    VALUES (v_pdf_id, 'process', 'process:' || v_pdf_id, 'queued', now(), '{}'::JSONB, now());
  ELSE
    UPDATE public.community_submissions
    SET status = 'rejected', reviewed_at = now(), reviewed_by = btrim(p_reviewed_by),
      rejection_reason = btrim(p_reason)
    WHERE id = p_submission_id
    RETURNING * INTO v_row;
  END IF;
  RETURN v_row;
END;
$$;

REVOKE ALL ON TABLE public.user_credit_accounts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_user_credit_account(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_user_credit_account() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_credit_account(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.spend_user_credit(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.redeem_user_referral(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.toggle_pdf_favorite(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_pdf_download(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.patch_site_setting_json(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.insert_quiz_result_and_award_progress(
  TEXT, UUID, UUID, TEXT, NUMERIC, NUMERIC, INTEGER, INTEGER, INTEGER, INTEGER, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_admin_analytics_summary() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_quiz_analytics(UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_user_credit_account(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.spend_user_credit(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.redeem_user_referral(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.toggle_pdf_favorite(UUID, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_pdf_download(UUID, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.patch_site_setting_json(TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.insert_quiz_result_and_award_progress(
  TEXT, UUID, UUID, TEXT, NUMERIC, NUMERIC, INTEGER, INTEGER, INTEGER, INTEGER, TEXT, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics_summary() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_quiz_analytics(UUID) TO service_role;
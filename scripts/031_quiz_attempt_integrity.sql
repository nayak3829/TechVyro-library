-- A player-generated attempt ID makes network retries return the original
-- server-graded result rather than creating another result or XP event.
ALTER TABLE public.quiz_results
  ADD COLUMN IF NOT EXISTS client_attempt_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS quiz_results_user_client_attempt_id_key
  ON public.quiz_results (user_id, client_attempt_id)
  WHERE client_attempt_id IS NOT NULL;
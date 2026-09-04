-- Account-scoped, in-app notification inbox.  Rows are created only by
-- trusted server code using the service role; clients may only read/update
-- their own records.
DO $$ BEGIN
  CREATE TYPE public.notification_kind AS ENUM ('pdf', 'quiz', 'test');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_status AS ENUM ('unread', 'read', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_digest_mode AS ENUM ('immediate', 'daily');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pdfs BOOLEAN NOT NULL DEFAULT TRUE,
  quizzes BOOLEAN NOT NULL DEFAULT TRUE,
  tests BOOLEAN NOT NULL DEFAULT TRUE,
  digest_mode public.notification_digest_mode NOT NULL DEFAULT 'immediate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.notification_kind NOT NULL,
  event_key TEXT NOT NULL CHECK (char_length(event_key) BETWEEN 1 AND 200),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  body TEXT NOT NULL CHECK (char_length(body) <= 500),
  href TEXT NOT NULL CHECK (char_length(href) BETWEEN 1 AND 300 AND href ~ '^/[A-Za-z0-9/_-]*$'),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(payload) = 'object' AND octet_length(payload::text) <= 4096),
  status public.notification_status NOT NULL DEFAULT 'unread',
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT notifications_event_key_per_user UNIQUE (user_id, event_key),
  CONSTRAINT notifications_status_timestamps CHECK (
    (status = 'unread' AND read_at IS NULL AND dismissed_at IS NULL) OR
    (status = 'read' AND read_at IS NOT NULL AND dismissed_at IS NULL) OR
    (status = 'dismissed' AND dismissed_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS notification_preferences_opt_in_idx
  ON public.notification_preferences (user_id) WHERE pdfs OR quizzes OR tests;
CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx
  ON public.notifications (user_id, created_at DESC, id DESC) WHERE status = 'unread';

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users update own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users read own notification preferences" ON public.notification_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notification preferences" ON public.notification_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

REVOKE ALL ON public.notification_preferences, public.notifications FROM anon;
REVOKE INSERT, DELETE, UPDATE ON public.notification_preferences, public.notifications FROM authenticated;
GRANT SELECT, UPDATE (pdfs, quizzes, tests, digest_mode) ON public.notification_preferences TO authenticated;
GRANT SELECT, UPDATE (status, read_at, dismissed_at) ON public.notifications TO authenticated;
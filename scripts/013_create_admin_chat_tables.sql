-- Server-only live chat storage used by the website and Telegram webhook.
CREATE TABLE IF NOT EXISTS public.admin_chat_sessions (
  id UUID PRIMARY KEY,
  student_name TEXT NOT NULL CHECK (char_length(student_name) BETWEEN 1 AND 80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.admin_chat_sessions(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('student', 'admin')),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  telegram_message_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_chat_sessions_last_message
  ON public.admin_chat_sessions(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_chat_messages_session_created
  ON public.admin_chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_chat_messages_telegram
  ON public.admin_chat_messages(telegram_message_id)
  WHERE telegram_message_id IS NOT NULL;

ALTER TABLE public.admin_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_chat_messages ENABLE ROW LEVEL SECURITY;

-- No client policies: all chat access is mediated by rate-limited server routes.
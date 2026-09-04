-- Materialize the opt-in defaults for current accounts, then ensure each
-- future account receives exactly one preferences row at creation time.
INSERT INTO public.notification_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.provision_notification_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_notification_preferences ON auth.users;
CREATE TRIGGER on_auth_user_created_notification_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.provision_notification_preferences();

-- This routine is an auth trigger implementation, not a client RPC.
REVOKE ALL ON FUNCTION public.provision_notification_preferences() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.provision_notification_preferences() FROM anon, authenticated;
CREATE OR REPLACE FUNCTION public.grant_platform_owner_by_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(NEW.email) = 'abunnajeeh7@gmail.com' THEN
    INSERT INTO public.platform_owners(user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.grant_platform_owner_by_email() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_platform_owner ON auth.users;
CREATE TRIGGER on_auth_user_platform_owner
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_platform_owner_by_email();

INSERT INTO public.platform_owners(user_id)
SELECT id FROM auth.users WHERE lower(email) = 'abunnajeeh7@gmail.com'
ON CONFLICT DO NOTHING;
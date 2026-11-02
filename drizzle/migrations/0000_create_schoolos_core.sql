CREATE TABLE public.platform_owners (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_owners TO authenticated;
GRANT ALL ON public.platform_owners TO service_role;
ALTER TABLE public.platform_owners ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_platform_owner(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_owners WHERE user_id = _user)
$$;

CREATE POLICY "Owners read own row" ON public.platform_owners FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  school_type text NOT NULL DEFAULT 'conventional' CHECK (school_type IN ('conventional','islamic','integrated')),
  subscription_status text NOT NULL DEFAULT 'Free Trial' CHECK (subscription_status IN ('Free Trial','Active','Expired','Suspended')),
  subscription_expires_at timestamptz DEFAULT (now() + interval '30 days'),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schools TO authenticated;
GRANT ALL ON public.schools TO service_role;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.school_members (
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','teacher','bursar','parent')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (school_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_members TO authenticated;
GRANT ALL ON public.school_members TO service_role;
ALTER TABLE public.school_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_school_member(_school uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.school_members WHERE school_id = _school AND user_id = _user)
$$;
CREATE OR REPLACE FUNCTION public.is_school_admin(_school uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.school_members WHERE school_id = _school AND user_id = _user AND role = 'admin')
$$;

CREATE POLICY "View schools" ON public.schools FOR SELECT TO authenticated
  USING (public.is_platform_owner(auth.uid()) OR public.is_school_member(id, auth.uid()));
CREATE POLICY "Create school" ON public.schools FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND subscription_status = 'Free Trial');
CREATE POLICY "Owner updates schools" ON public.schools FOR UPDATE TO authenticated
  USING (public.is_platform_owner(auth.uid()));
CREATE POLICY "Owner deletes schools" ON public.schools FOR DELETE TO authenticated
  USING (public.is_platform_owner(auth.uid()));

CREATE OR REPLACE FUNCTION public.add_school_creator()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.school_members(school_id, user_id, role) VALUES (NEW.id, NEW.created_by, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_school_created AFTER INSERT ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.add_school_creator();

CREATE POLICY "View members" ON public.school_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_school_admin(school_id, auth.uid()) OR public.is_platform_owner(auth.uid()));
CREATE POLICY "Admins add members" ON public.school_members FOR INSERT TO authenticated
  WITH CHECK (public.is_school_admin(school_id, auth.uid()) OR public.is_platform_owner(auth.uid()));
CREATE POLICY "Admins edit members" ON public.school_members FOR UPDATE TO authenticated
  USING (public.is_school_admin(school_id, auth.uid()) OR public.is_platform_owner(auth.uid()));
CREATE POLICY "Admins remove members" ON public.school_members FOR DELETE TO authenticated
  USING (public.is_school_admin(school_id, auth.uid()) OR public.is_platform_owner(auth.uid()));

CREATE TABLE public.school_records (
  id text NOT NULL,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('student','class','subject','staff','score','quran','attendance','fee_structure','payroll','timetable')),
  class_id text,
  student_id text,
  session text,
  term text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (school_id, id)
);
CREATE INDEX school_records_kind_idx ON public.school_records(school_id, kind);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_records TO authenticated;
GRANT ALL ON public.school_records TO service_role;
ALTER TABLE public.school_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read records" ON public.school_records FOR SELECT TO authenticated
  USING (public.is_school_member(school_id, auth.uid()) OR public.is_platform_owner(auth.uid()));
CREATE POLICY "Members add records" ON public.school_records FOR INSERT TO authenticated
  WITH CHECK (public.is_school_member(school_id, auth.uid()));
CREATE POLICY "Members edit records" ON public.school_records FOR UPDATE TO authenticated
  USING (public.is_school_member(school_id, auth.uid()));
CREATE POLICY "Admins delete records" ON public.school_records FOR DELETE TO authenticated
  USING (public.is_school_admin(school_id, auth.uid()));

CREATE TABLE public.fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  method text NOT NULL CHECK (method IN ('Cash','Bank')),
  session text,
  term text,
  recorded_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.fee_payments TO authenticated;
GRANT ALL ON public.fee_payments TO service_role;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read payments" ON public.fee_payments FOR SELECT TO authenticated
  USING (public.is_school_member(school_id, auth.uid()) OR public.is_platform_owner(auth.uid()));
CREATE POLICY "Members record payments" ON public.fee_payments FOR INSERT TO authenticated
  WITH CHECK (public.is_school_member(school_id, auth.uid()) AND recorded_by = auth.uid());

CREATE TABLE public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.subscription_payments TO authenticated;
GRANT ALL ON public.subscription_payments TO service_role;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner and school read subs" ON public.subscription_payments FOR SELECT TO authenticated
  USING (public.is_platform_owner(auth.uid()) OR public.is_school_admin(school_id, auth.uid()));
CREATE POLICY "Owner records subs" ON public.subscription_payments FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_owner(auth.uid()));

CREATE OR REPLACE FUNCTION public.manage_subscription(target_school uuid, next_status text, renew_days integer DEFAULT 0)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_platform_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Only the platform owner can change subscriptions';
  END IF;
  UPDATE public.schools SET
    subscription_status = next_status,
    subscription_expires_at = CASE WHEN renew_days > 0
      THEN GREATEST(COALESCE(subscription_expires_at, now()), now()) + make_interval(days => renew_days)
      ELSE subscription_expires_at END
  WHERE id = target_school;
END $$;
REVOKE ALL ON FUNCTION public.manage_subscription(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_subscription(uuid, text, integer) TO authenticated;
CREATE TABLE public.school_portal_branding (
 school_id uuid PRIMARY KEY REFERENCES public.schools(id) ON DELETE CASCADE,
 name text NOT NULL, logo_url text, motto text NOT NULL DEFAULT ''
);
GRANT SELECT ON public.school_portal_branding TO anon, authenticated;
GRANT INSERT, UPDATE ON public.school_portal_branding TO authenticated;
GRANT ALL ON public.school_portal_branding TO service_role;
ALTER TABLE public.school_portal_branding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public school portal branding" ON public.school_portal_branding FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY "Admins create own branding" ON public.school_portal_branding FOR INSERT TO authenticated WITH CHECK (public.is_school_admin(school_id,auth.uid()));
CREATE POLICY "Admins update own branding" ON public.school_portal_branding FOR UPDATE TO authenticated USING (public.is_school_admin(school_id,auth.uid())) WITH CHECK (public.is_school_admin(school_id,auth.uid()));
INSERT INTO public.school_portal_branding(school_id,name,logo_url,motto) SELECT school_id,snapshot->'settings'->>'name',snapshot->'settings'->>'logoDataUrl',coalesce(snapshot->'settings'->>'motto','') FROM public.school_workspaces;
CREATE TABLE public.school_portal_accounts (
 school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
 user_id uuid NOT NULL,
 role text NOT NULL CHECK (role IN ('admin','exam_officer','class_teacher','subject_teacher','bursar','secretary','parent','muallim')),
 staff_id text,
 student_ids text[] NOT NULL DEFAULT '{}',
 PRIMARY KEY(school_id,user_id)
);
GRANT SELECT ON public.school_portal_accounts TO authenticated;
GRANT ALL ON public.school_portal_accounts TO service_role;
ALTER TABLE public.school_portal_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own portal account or school admin" ON public.school_portal_accounts FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.is_school_admin(school_id,auth.uid()));
CREATE FUNCTION public.get_school_portal_branding(target_school uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT jsonb_build_object('schoolId',school_id,'name',name,'logoUrl',logo_url,'motto',motto) FROM public.school_portal_branding WHERE school_id=target_school $$;
REVOKE ALL ON FUNCTION public.get_school_portal_branding(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_school_portal_branding(uuid) TO anon,authenticated;
CREATE FUNCTION public.save_portal_workspace(target_school uuid,expected_revision bigint,next_snapshot jsonb,invoices jsonb) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE new_revision bigint;
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role' AND coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role' IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Restricted operation' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.schools WHERE id=target_school AND subscription_status IN ('Active','Free Trial') AND (subscription_expires_at IS NULL OR subscription_expires_at>now())) THEN RAISE EXCEPTION 'School subscription is inactive'; END IF;
 PERFORM public.validate_school_snapshot(next_snapshot);
 UPDATE public.school_workspaces SET snapshot=jsonb_set(next_snapshot,'{feeInvoices}',invoices),revision=revision+1,updated_at=now() WHERE school_id=target_school AND revision=expected_revision RETURNING revision INTO new_revision;
 IF new_revision IS NULL THEN RAISE EXCEPTION 'School data changed; reload before saving.' USING ERRCODE='40001'; END IF;
 PERFORM public.project_school_workspace(target_school,next_snapshot,invoices);
 RETURN new_revision;
END $$;
REVOKE ALL ON FUNCTION public.save_portal_workspace(uuid,bigint,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_portal_workspace(uuid,bigint,jsonb,jsonb) TO service_role;
-- Additive migration: existing school tables, records, and public pages are retained.
CREATE TABLE public.school_workspaces (
  school_id uuid PRIMARY KEY REFERENCES public.schools(id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  revision bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.school_workspaces ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.school_workspaces FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.school_workspaces TO authenticated;
GRANT ALL ON public.school_workspaces TO service_role;
CREATE POLICY "School admins read own workspace" ON public.school_workspaces
  FOR SELECT TO authenticated USING (public.is_school_admin(school_id, auth.uid()));
-- No direct INSERT/UPDATE/DELETE grants: all writes use the checked, atomic RPC below.

CREATE TABLE public.school_invoices (
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  id text NOT NULL,
  student_id text NOT NULL,
  session text NOT NULL,
  term text NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (school_id, id)
);
ALTER TABLE public.school_invoices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.school_invoices FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.school_invoices TO authenticated;
GRANT ALL ON public.school_invoices TO service_role;
CREATE POLICY "School admins read own invoices" ON public.school_invoices
  FOR SELECT TO authenticated USING (public.is_school_admin(school_id, auth.uid()));

-- The previous broad member policies let parent accounts write arbitrary records.
-- Cloud workspace access is admin-only until other portals have verified Auth identities.
DROP POLICY "Members read records" ON public.school_records;
DROP POLICY "Members add records" ON public.school_records;
DROP POLICY "Members edit records" ON public.school_records;
CREATE POLICY "Admins read own records" ON public.school_records FOR SELECT TO authenticated
  USING (public.is_school_admin(school_id, auth.uid()));
CREATE POLICY "Admins add own records" ON public.school_records FOR INSERT TO authenticated
  WITH CHECK (public.is_school_admin(school_id, auth.uid()));
CREATE POLICY "Admins edit own records" ON public.school_records FOR UPDATE TO authenticated
  USING (public.is_school_admin(school_id, auth.uid()))
  WITH CHECK (public.is_school_admin(school_id, auth.uid()));

-- School subscription fields cannot be supplied by a registering client.
DROP POLICY "Create school" ON public.schools;

CREATE FUNCTION public.validate_school_snapshot(_snapshot jsonb)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE field text;
BEGIN
  IF jsonb_typeof(_snapshot) IS DISTINCT FROM 'object'
    OR _snapshot->>'version' IS DISTINCT FROM '3'
    OR jsonb_typeof(_snapshot->'settings') IS DISTINCT FROM 'object'
    OR coalesce(length(trim(_snapshot->'settings'->>'name')), 0) = 0 THEN
    RAISE EXCEPTION 'Invalid school workspace';
  END IF;
  FOREACH field IN ARRAY ARRAY['students','classes','subjects','staff','attendance','feeItems','payments','scores','auditLogs','termLocks','pendingScoreEdits','quranRecords','affective','parentNotices','payroll'] LOOP
    IF jsonb_typeof(_snapshot->field) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Invalid workspace collection: %', field;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(_snapshot->'staff') s WHERE s ? 'loginPin') THEN
    RAISE EXCEPTION 'Staff PINs must not be uploaded to the cloud';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.validate_school_snapshot(jsonb) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.project_school_workspace(_school uuid, _snapshot jsonb, _invoices jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE collection text; record_kind text; item jsonb;
BEGIN
  IF jsonb_typeof(_invoices) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid invoice collection'; END IF;
  -- Only these adapter-owned projections are replaced. Unrelated existing records remain.
  DELETE FROM public.school_records WHERE school_id = _school AND kind IN ('student','class','attendance','fee_structure');
  FOR collection, record_kind IN SELECT * FROM (VALUES ('students','student'),('classes','class'),('attendance','attendance'),('feeItems','fee_structure')) AS collections(collection,kind) LOOP
    FOR item IN SELECT value FROM jsonb_array_elements(_snapshot->collection) LOOP
      IF coalesce(item->>'id','') = '' THEN RAISE EXCEPTION 'Record ID required'; END IF;
      INSERT INTO public.school_records(school_id,id,kind,class_id,student_id,session,term,payload)
      VALUES (_school, record_kind || ':' || (item->>'id'), record_kind, item->>'classId', item->>'studentId', item->>'session', item->>'term', item);
    END LOOP;
  END LOOP;
  DELETE FROM public.school_invoices WHERE school_id = _school;
  FOR item IN SELECT value FROM jsonb_array_elements(_invoices) LOOP
    INSERT INTO public.school_invoices(school_id,id,student_id,session,term,payload)
    VALUES (_school,item->>'id',item->>'studentId',item->>'session',item->>'term',item);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.project_school_workspace(uuid,jsonb,jsonb) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.create_school_workspace(initial_snapshot jsonb, initial_invoices jsonb DEFAULT '[]')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE school uuid; result jsonb; clean jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in before creating a school'; END IF;
  -- Serialize initialization across concurrent tabs for the same verified account.
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  SELECT school_id INTO school FROM public.school_members WHERE user_id = auth.uid() AND role = 'admin' ORDER BY created_at LIMIT 1;
  IF school IS NOT NULL THEN
    SELECT jsonb_build_object('school_id',school_id,'snapshot',snapshot,'revision',revision) INTO result
    FROM public.school_workspaces WHERE school_id = school;
    IF result IS NOT NULL THEN RETURN result; END IF;
    IF EXISTS (SELECT 1 FROM public.school_records WHERE school_id = school) THEN
      RAISE EXCEPTION 'Existing cloud records require a reviewed migration before initializing this workspace. Contact NDH support.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.schools WHERE id = school AND subscription_status IN ('Free Trial','Active')
      AND (subscription_expires_at IS NULL OR subscription_expires_at > now())) THEN
      RAISE EXCEPTION 'School subscription is inactive. Contact NDH support.' USING ERRCODE = '42501';
    END IF;
  END IF;
  PERFORM public.validate_school_snapshot(initial_snapshot);
  IF school IS NULL THEN
    INSERT INTO public.schools(name, school_type, created_by)
      VALUES (trim(initial_snapshot->'settings'->>'name'),
        CASE WHEN (initial_snapshot->'settings'->>'multiProgrammeEnabled')::boolean THEN 'integrated' ELSE 'conventional' END,
        auth.uid()) RETURNING id INTO school;
  END IF;
  clean := jsonb_set(initial_snapshot,'{settings,code}',to_jsonb('SCH-' || upper(left(school::text,8))));
  clean := jsonb_set(clean,'{feeInvoices}',initial_invoices);
  INSERT INTO public.school_workspaces(school_id,snapshot) VALUES (school,clean);
  PERFORM public.project_school_workspace(school,clean,initial_invoices);
  RETURN jsonb_build_object('school_id',school,'snapshot',clean,'revision',1);
END $$;
REVOKE ALL ON FUNCTION public.create_school_workspace(jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_school_workspace(jsonb,jsonb) TO authenticated;

CREATE FUNCTION public.save_school_workspace(target_school uuid, expected_revision bigint, next_snapshot jsonb, invoices jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_revision bigint; canonical_code text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_school_admin(target_school,auth.uid()) THEN
    RAISE EXCEPTION 'School administrator access required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.schools WHERE id = target_school AND subscription_status IN ('Free Trial','Active')
    AND (subscription_expires_at IS NULL OR subscription_expires_at > now())) THEN
    RAISE EXCEPTION 'School subscription is inactive. Contact NDH support.' USING ERRCODE = '42501';
  END IF;
  PERFORM public.validate_school_snapshot(next_snapshot);
  SELECT snapshot->'settings'->>'code' INTO canonical_code FROM public.school_workspaces WHERE school_id = target_school;
  next_snapshot := jsonb_set(next_snapshot,'{settings,code}',to_jsonb(canonical_code));
  next_snapshot := jsonb_set(next_snapshot,'{feeInvoices}',invoices);
  UPDATE public.school_workspaces SET snapshot = next_snapshot, revision = revision + 1, updated_at = now()
    WHERE school_id = target_school AND revision = expected_revision RETURNING revision INTO new_revision;
  IF new_revision IS NULL THEN
    RAISE EXCEPTION 'Another session updated this school. Export unsaved work before reloading.' USING ERRCODE = '40001';
  END IF;
  UPDATE public.schools SET name = trim(next_snapshot->'settings'->>'name') WHERE id = target_school;
  PERFORM public.project_school_workspace(target_school,next_snapshot,invoices);
  RETURN new_revision;
END $$;
REVOKE ALL ON FUNCTION public.save_school_workspace(uuid,bigint,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_school_workspace(uuid,bigint,jsonb,jsonb) TO authenticated;

-- The owner screen uses this RPC, not a client-supplied role or cross-school workspace read.
CREATE FUNCTION public.list_registered_schools()
RETURNS SETOF public.schools LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_platform_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Platform owner access required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.schools ORDER BY created_at DESC;
END $$;
REVOKE ALL ON FUNCTION public.list_registered_schools() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_registered_schools() TO authenticated;

-- NDH SchoolOS / PostgreSQL 15+ (Supabase Auth)
-- No seed INSERTs. Apply using a trusted database migration account.
begin;
create extension if not exists pgcrypto;

create table public.platform_owners (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  school_type text not null check (school_type in ('conventional','islamic','integrated')),
  subscription_status text not null default 'Free Trial' check (subscription_status in ('Free Trial','Active','Expired','Suspended')),
  subscription_expires_at timestamptz default (now() + interval '14 days'),
  public_settings jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table public.school_memberships (
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','teacher','ustadh','bursar','parent')),
  assigned_class_ids text[] not null default '{}',
  primary key (school_id,user_id)
);
create table public.school_records (
  school_id uuid not null references public.schools(id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  kind text not null check (kind in ('student','class','subject','staff','score','quran','attendance','fee_structure','payroll','timetable')),
  class_id text,
  student_id text,
  session text,
  term text,
  payload jsonb not null default '{}' check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (school_id,id)
);
create index school_records_scope on public.school_records(school_id,kind,class_id);
create table public.student_guardians (
  school_id uuid not null,
  student_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (school_id,student_id,user_id),
  foreign key (school_id,student_id) references public.school_records(school_id,id) on delete cascade
);
create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  amount numeric(14,2) not null check (amount > 0),
  provider_reference text not null unique,
  created_at timestamptz not null default now()
);
-- Subscription payments are written only by a verified webhook/trusted server.
alter table public.subscription_payments enable row level security;
create sequence public.receipt_sequence;
create table public.fee_payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  student_id text not null,
  receipt_number text not null unique default ('NDH-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.receipt_sequence')::text,8,'0')),
  amount numeric(14,2) not null check (amount > 0),
  method text not null check (method in ('Cash','Bank')),
  session text not null,
  term text not null,
  recorded_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (school_id,student_id) references public.school_records(school_id,id)
);

create function public.is_platform_owner() returns boolean language sql stable security definer set search_path = public,pg_temp as $$
  select exists(select 1 from public.platform_owners where user_id = auth.uid());
$$;
create function public.school_role(target uuid) returns text language sql stable security definer set search_path = public,pg_temp as $$
  select role from public.school_memberships where school_id = target and user_id = auth.uid();
$$;
create function public.school_is_active(target uuid) returns boolean language sql stable security definer set search_path = public,pg_temp as $$
  select exists(select 1 from public.schools where id = target and subscription_status in ('Free Trial','Active') and (subscription_expires_at is null or subscription_expires_at > now()));
$$;
create function public.has_assigned_class(target uuid, target_class text) returns boolean language sql stable security definer set search_path = public,pg_temp as $$
  select exists(select 1 from public.school_memberships where school_id = target and user_id = auth.uid() and target_class = any(assigned_class_ids));
$$;
create function public.is_guardian(target uuid, target_student text) returns boolean language sql stable security definer set search_path = public,pg_temp as $$
  select exists(select 1 from public.student_guardians where school_id = target and student_id = target_student and user_id = auth.uid());
$$;

-- Accounts/role grants must be provisioned by a trusted server, not by public clients.
alter table public.platform_owners enable row level security;
alter table public.schools enable row level security;
alter table public.school_memberships enable row level security;
alter table public.school_records enable row level security;
alter table public.student_guardians enable row level security;
alter table public.fee_payments enable row level security;

create policy subscription_payments_owner_read on public.subscription_payments for select to authenticated using (public.is_platform_owner());
create policy owner_self_read on public.platform_owners for select to authenticated using (user_id = auth.uid());
create policy schools_read on public.schools for select to authenticated using (public.is_platform_owner() or public.school_role(id) is not null);
create policy schools_owner_create on public.schools for insert to authenticated with check (public.is_platform_owner());
create policy memberships_read on public.school_memberships for select to authenticated using (user_id = auth.uid() or public.is_platform_owner() or public.school_role(school_id) = 'admin');
create policy guardians_read on public.student_guardians for select to authenticated using (user_id = auth.uid() or public.school_role(school_id) = 'admin');

create policy records_read on public.school_records for select to authenticated using (
  public.is_platform_owner() or (
    public.school_is_active(school_id) and (
      public.school_role(school_id) = 'admin'
      or (public.school_role(school_id) = 'bursar' and kind in ('student','class','fee_structure','payroll'))
      or (public.school_role(school_id) in ('teacher','ustadh') and (
        kind in ('subject','timetable')
        or (kind in ('student','class','score','quran','attendance') and public.has_assigned_class(school_id,case when kind = 'class' then id else class_id end))
      ))
      or (public.school_role(school_id) = 'parent' and (
        (kind = 'student' and public.is_guardian(school_id,id))
        or (kind in ('score','quran') and public.is_guardian(school_id,student_id) and payload->>'published' = 'true')
      ))
    )
  )
);
create function public.can_write_record(target uuid, target_kind text, target_class text) returns boolean language sql stable security definer set search_path = public,pg_temp as $$
  select not public.is_platform_owner() and public.school_is_active(target) and (
    public.school_role(target) = 'admin'
    or (public.school_role(target) = 'bursar' and target_kind in ('fee_structure','payroll'))
    or (public.school_role(target) in ('teacher','ustadh') and target_kind in ('score','quran','attendance') and public.has_assigned_class(target,target_class))
  );
$$;
-- Prevent teachers from publishing their own scores or changing locked records.
create function public.guard_record_write() returns trigger language plpgsql security definer set search_path = public,pg_temp as $$
begin
  if tg_op = 'UPDATE' and (new.school_id <> old.school_id or new.id <> old.id or new.kind <> old.kind) then
    raise exception 'Record identity cannot be changed';
  end if;
  if public.school_role(new.school_id) in ('teacher','ustadh') then
    if coalesce(new.payload->>'published','false') <> 'false' or coalesce(new.payload->>'locked','false') <> 'false' then
      raise exception 'Only school administrators may publish or lock results';
    end if;
    if tg_op = 'UPDATE' and (old.payload->>'published' = 'true' or old.payload->>'locked' = 'true') then
      raise exception 'Published and locked records require administrator approval';
    end if;
    if new.student_id is null or not exists (
      select 1 from public.school_records s where s.school_id = new.school_id and s.id = new.student_id and s.kind = 'student' and s.class_id = new.class_id
    ) then raise exception 'Student must belong to the assigned class'; end if;
  end if;
  new.updated_at = now();
  return new;
end;
$$;
create trigger school_record_write before insert or update on public.school_records for each row execute function public.guard_record_write();
create policy records_insert on public.school_records for insert to authenticated with check (public.can_write_record(school_id,kind,class_id));
create policy records_update on public.school_records for update to authenticated using (public.can_write_record(school_id,kind,class_id)) with check (public.can_write_record(school_id,kind,class_id));
create policy records_delete on public.school_records for delete to authenticated using (not public.is_platform_owner() and public.school_role(school_id) = 'admin' and public.school_is_active(school_id));

create policy payments_read on public.fee_payments for select to authenticated using (public.is_platform_owner() or (public.school_is_active(school_id) and (public.school_role(school_id) in ('admin','bursar') or (public.school_role(school_id) = 'parent' and public.is_guardian(school_id,student_id)))));
create policy payments_insert on public.fee_payments for insert to authenticated with check (not public.is_platform_owner() and public.school_is_active(school_id) and public.school_role(school_id) in ('admin','bursar') and recorded_by = auth.uid() and exists (select 1 from public.school_records where school_id = fee_payments.school_id and id = fee_payments.student_id and kind = 'student'));
-- Immutable financial ledger: no client UPDATE/DELETE policies, and no receipt override.
revoke all on public.fee_payments from authenticated;
grant select on public.fee_payments to authenticated;
grant insert (school_id,student_id,amount,method,session,term) on public.fee_payments to authenticated;
grant usage on sequence public.receipt_sequence to authenticated;

create function public.manage_subscription(target_school uuid, next_status text, renew_days integer default 0) returns void language plpgsql security definer set search_path = public,pg_temp as $$
begin
  if not public.is_platform_owner() then raise exception 'Platform owner permission required'; end if;
  if next_status not in ('Free Trial','Active','Expired','Suspended') or renew_days < 0 or renew_days > 366 then raise exception 'Invalid subscription parameters'; end if;
  update public.schools set subscription_status = next_status, subscription_expires_at = case when renew_days > 0 then greatest(now(),coalesce(subscription_expires_at,now())) + make_interval(days => renew_days) else subscription_expires_at end where id = target_school;
  if not found then raise exception 'School not found'; end if;
end;
$$;
revoke all on function public.manage_subscription(uuid,text,integer) from public;
grant execute on function public.manage_subscription(uuid,text,integer) to authenticated;
-- Explicit least-privilege public API grants. RLS still applies to every query.
grant select on public.platform_owners,public.school_memberships,public.student_guardians,public.subscription_payments to authenticated;
grant select,insert on public.schools to authenticated;
grant select,insert,update,delete on public.school_records to authenticated;
commit;

-- SportMatch Admin Console (v1)
-- Run AFTER schema.sql and security_hardening.sql in Supabase SQL Editor.
-- Safe to re-run. This does NOT expose a service-role key or grant browser access
-- to the administrator tables. Promote the first administrator manually using
-- the bootstrap SQL at the end of this file.

-- 1) Server-controlled admin membership. No direct client grants or policies.
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null
);
alter table public.platform_admins enable row level security;
revoke all on table public.platform_admins from public, anon, authenticated;

-- 2) Admin audit trail. Clients cannot read or write this table directly.
create table if not exists public.platform_admin_audit_logs (
  id bigint generated always as identity primary key,
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists platform_admin_audit_created_idx
  on public.platform_admin_audit_logs(created_at desc);
alter table public.platform_admin_audit_logs enable row level security;
revoke all on table public.platform_admin_audit_logs from public, anon, authenticated;

-- 3) Directory moderation is separate from the user's own is_public preference.
--    A user can hide their own listing, but cannot override a platform restriction.
alter table public.profiles
  add column if not exists directory_status text not null default 'active';
do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'profiles_directory_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_directory_status_check
      check (directory_status in ('active', 'hidden', 'under_review')) not valid;
  end if;
end;
$$;

-- Do not permit a browser user to set directory_status on insert/update.
-- The default is active; only trusted admin RPCs can change it afterward.
revoke insert, update on table public.profiles from authenticated;
grant insert (id, full_name, role, primary_sport, current_level, target_level, location, is_public)
  on table public.profiles to authenticated;
grant update (full_name, primary_sport, current_level, target_level, location, is_public)
  on table public.profiles to authenticated;

-- Hide profiles marked by admins from public discovery. Their owner and current
-- linked coach can still see what the existing privacy rules permit.
drop policy if exists profiles_select_self_or_public_or_linked on public.profiles;
create policy profiles_select_self_or_public_or_linked
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or (is_public = true and directory_status = 'active')
  or exists (
    select 1 from public.player_profiles pp
    where pp.user_id = profiles.id and pp.coach_user_id = (select auth.uid())
  )
);

drop policy if exists coach_profiles_select_owner_or_public on public.coach_profiles;
create policy coach_profiles_select_owner_or_public
on public.coach_profiles for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.profiles p
    where p.id = coach_profiles.user_id
      and p.role = 'coach'
      and p.is_public = true
      and p.directory_status = 'active'
  )
);

-- 4) The single authorization function used by the UI and privileged RPCs.
--    This is server-side truth; no user metadata or browser flag grants admin.
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_admins a
    where a.user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

-- 5) Allow the existing verification guard to permit trusted admins only.
create or replace function public.guard_coach_verification_flags()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') = 'authenticated'
     and not public.is_platform_admin() then
    if tg_op = 'INSERT' then
      if coalesce(new.verification_identity, false)
        or coalesce(new.verification_certificate, false)
        or coalesce(new.verification_organization, false) then
        raise exception 'Verification flags can only be set by platform administrators.'
          using errcode = '42501';
      end if;
    elsif new.verification_identity is distinct from old.verification_identity
      or new.verification_certificate is distinct from old.verification_certificate
      or new.verification_organization is distinct from old.verification_organization then
      raise exception 'Verification flags can only be changed by platform administrators.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_coach_verification_flags() from public, anon, authenticated;
drop trigger if exists coach_profiles_guard_verification_flags on public.coach_profiles;
create trigger coach_profiles_guard_verification_flags
before insert or update on public.coach_profiles
for each row execute function public.guard_coach_verification_flags();

-- 6) Overview RPC: returns aggregate counts only, never private player activity.
create or replace function public.admin_get_overview()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;

  select pg_catalog.jsonb_build_object(
    'total_users', (select count(*) from public.profiles),
    'players', (select count(*) from public.profiles where role = 'player'),
    'coaches', (select count(*) from public.profiles where role = 'coach'),
    'visible_profiles', (select count(*) from public.profiles where is_public and directory_status = 'active'),
    'restricted_profiles', (select count(*) from public.profiles where directory_status <> 'active'),
    'coaches_pending_verification', (
      select count(*) from public.coach_profiles cp
      join public.profiles p on p.id = cp.user_id
      where p.role = 'coach'
        and not (cp.verification_identity and cp.verification_certificate and cp.verification_organization)
    ),
    'training_sessions', (select count(*) from public.training_logs),
    'skill_assessments', (select count(*) from public.skill_assessments),
    'platform_admins', (select count(*) from public.platform_admins)
  ) into v_result;

  return v_result;
end;
$$;

-- 7) User directory for administrators. Email is retrieved only inside this
--    gated RPC; the auth.users table is never exposed directly to the browser.
create or replace function public.admin_list_users(
  p_search text default '',
  p_role text default 'all',
  p_limit integer default 100
)
returns table (
  user_id uuid,
  email text,
  full_name text,
  role text,
  primary_sport text,
  current_level text,
  target_level text,
  location text,
  is_public boolean,
  directory_status text,
  created_at timestamptz,
  verification_identity boolean,
  verification_certificate boolean,
  verification_organization boolean,
  qualifications text,
  certificates text,
  academy_name text,
  workplace text,
  experience_years integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_search text := pg_catalog.btrim(coalesce(p_search, ''));
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;
  if coalesce(p_role, 'all') not in ('all', 'player', 'coach') then
    raise exception 'Invalid role filter.' using errcode = '22023';
  end if;

  return query
  select
    p.id,
    coalesce(u.email, '')::text,
    p.full_name,
    p.role,
    p.primary_sport,
    p.current_level,
    p.target_level,
    p.location,
    p.is_public,
    p.directory_status,
    p.created_at,
    coalesce(cp.verification_identity, false),
    coalesce(cp.verification_certificate, false),
    coalesce(cp.verification_organization, false),
    coalesce(cp.qualifications, ''),
    coalesce(cp.certificates, ''),
    coalesce(cp.academy_name, ''),
    coalesce(cp.workplace, ''),
    coalesce(cp.experience_years, 0)
  from public.profiles p
  left join auth.users u on u.id = p.id
  left join public.coach_profiles cp on cp.user_id = p.id
  where (coalesce(p_role, 'all') = 'all' or p.role = p_role)
    and (
      v_search = ''
      or p.full_name ilike '%' || v_search || '%'
      or coalesce(u.email, '') ilike '%' || v_search || '%'
      or p.location ilike '%' || v_search || '%'
    )
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
end;
$$;

-- 8) Change a user's directory visibility. This does not disable their login.
create or replace function public.admin_set_directory_status(
  p_target_user_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('active', 'hidden', 'under_review') then
    raise exception 'Invalid directory status.' using errcode = '22023';
  end if;

  update public.profiles
  set directory_status = p_status
  where id = p_target_user_id;
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'Profile not found.' using errcode = 'P0002';
  end if;

  insert into public.platform_admin_audit_logs(admin_user_id, action, target_user_id, details)
  values (
    (select auth.uid()), 'directory_status_changed', p_target_user_id,
    pg_catalog.jsonb_build_object('status', p_status)
  );
end;
$$;

-- 9) Set coach verification flags after the administrator has reviewed evidence.
--    The app currently stores declared text fields, not uploaded identity documents.
--    The admin must verify evidence through an approved process before setting flags.
create or replace function public.admin_set_coach_verification(
  p_target_user_id uuid,
  p_identity boolean,
  p_certificate boolean,
  p_organization boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.profiles p where p.id = p_target_user_id and p.role = 'coach'
  ) then
    raise exception 'Coach account not found.' using errcode = 'P0002';
  end if;

  update public.coach_profiles
  set verification_identity = coalesce(p_identity, false),
      verification_certificate = coalesce(p_certificate, false),
      verification_organization = coalesce(p_organization, false)
  where user_id = p_target_user_id;
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'Coach profile not found.' using errcode = 'P0002';
  end if;

  insert into public.platform_admin_audit_logs(admin_user_id, action, target_user_id, details)
  values (
    (select auth.uid()), 'coach_verification_changed', p_target_user_id,
    pg_catalog.jsonb_build_object(
      'identity', coalesce(p_identity, false),
      'certificate', coalesce(p_certificate, false),
      'organization', coalesce(p_organization, false)
    )
  );
end;
$$;

-- 10) Read recent admin actions through a separately gated RPC.
create or replace function public.admin_get_recent_actions(p_limit integer default 10)
returns table (
  audit_id bigint,
  admin_user_id uuid,
  admin_name text,
  action text,
  target_user_id uuid,
  details jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;

  return query
  select
    a.id,
    a.admin_user_id,
    coalesce(ap.full_name, au.email, 'مسؤول'),
    a.action,
    a.target_user_id,
    a.details,
    a.created_at
  from public.platform_admin_audit_logs a
  left join public.profiles ap on ap.id = a.admin_user_id
  left join auth.users au on au.id = a.admin_user_id
  order by a.created_at desc
  limit least(greatest(coalesce(p_limit, 10), 1), 25);
end;
$$;

-- 11) Tight function grants: no anonymous access and no default PUBLIC execute.
revoke all on function public.admin_get_overview() from public, anon;
revoke all on function public.admin_list_users(text, text, integer) from public, anon;
revoke all on function public.admin_set_directory_status(uuid, text) from public, anon;
revoke all on function public.admin_set_coach_verification(uuid, boolean, boolean, boolean) from public, anon;
revoke all on function public.admin_get_recent_actions(integer) from public, anon;
grant execute on function public.admin_get_overview() to authenticated;
grant execute on function public.admin_list_users(text, text, integer) to authenticated;
grant execute on function public.admin_set_directory_status(uuid, text) to authenticated;
grant execute on function public.admin_set_coach_verification(uuid, boolean, boolean, boolean) to authenticated;
grant execute on function public.admin_get_recent_actions(integer) to authenticated;

-- 12) First administrator bootstrap (run manually in SQL Editor after replacing
--     the email with the exact email used for your own confirmed SportMatch account):
--
-- insert into public.platform_admins (user_id)
-- select id from auth.users where lower(email) = lower('YOUR_ACCOUNT_EMAIL')
-- on conflict (user_id) do nothing;
--
-- Then refresh SportMatch or sign out and sign in again. Never add an admin
-- option to public signup and never store an admin role in user-editable metadata.

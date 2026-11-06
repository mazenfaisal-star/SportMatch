-- SportMatch MVP schema
-- Run the whole file once in Supabase Dashboard > SQL Editor.
-- IMPORTANT: Review/adjust RLS before exposing the app to real users.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null check (role in ('player', 'coach')),
  primary_sport text not null default 'كرة القدم',
  current_level text not null default 'مبتدئ',
  target_level text not null default 'متوسط',
  location text not null default '',
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Role is chosen during onboarding and is not user-editable afterwards in this MVP.
create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
as $$
begin
  if old.role is distinct from new.role then
    raise exception 'Account type cannot be changed directly after onboarding.';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_change
before update on public.profiles
for each row execute function public.prevent_profile_role_change();

create table if not exists public.player_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  goal_description text not null default '',
  short_term_goal text not null default '',
  has_current_coach boolean not null default false,
  coach_type text not null default 'none' check (coach_type in ('none', 'on_platform', 'not_on_platform')),
  coach_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_coach_type_consistency check (
    (has_current_coach = false and coach_type = 'none' and coach_user_id is null)
    or (has_current_coach = true and coach_type = 'not_on_platform' and coach_user_id is null)
    or (has_current_coach = true and coach_type = 'on_platform')
  )
);
create index if not exists player_profiles_coach_user_id_idx on public.player_profiles(coach_user_id);
create trigger player_profiles_set_updated_at
before update on public.player_profiles
for each row execute function public.set_updated_at();

create table if not exists public.coach_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  specialties text[] not null default '{}',
  age_groups text[] not null default '{}',
  experience_years integer not null default 0 check (experience_years >= 0 and experience_years <= 70),
  qualifications text not null default '',
  certificates text not null default '',
  workplace text not null default '',
  academy_name text not null default '',
  location text not null default '',
  price numeric(10,2) check (price is null or price >= 0),
  training_type text not null default 'فردي وجماعي',
  available_days text[] not null default '{}',
  bio text not null default '',
  verification_identity boolean not null default false,
  verification_certificate boolean not null default false,
  verification_organization boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger coach_profiles_set_updated_at
before update on public.coach_profiles
for each row execute function public.set_updated_at();

-- Keep player/coach detail tables consistent with the selected account type.
create or replace function public.validate_profile_detail_role()
returns trigger
language plpgsql
as $$
declare
  expected_role text;
begin
  expected_role := case when tg_table_name = 'player_profiles' then 'player' else 'coach' end;
  if not exists (select 1 from public.profiles p where p.id = new.user_id and p.role = expected_role) then
    raise exception 'The account type does not match this profile details table.';
  end if;
  return new;
end;
$$;

drop trigger if exists player_profiles_validate_owner_role on public.player_profiles;
create trigger player_profiles_validate_owner_role
before insert or update on public.player_profiles
for each row execute function public.validate_profile_detail_role();

drop trigger if exists coach_profiles_validate_owner_role on public.coach_profiles;
create trigger coach_profiles_validate_owner_role
before insert or update on public.coach_profiles
for each row execute function public.validate_profile_detail_role();

create table if not exists public.training_logs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid references public.profiles(id) on delete set null,
  sport text not null,
  session_date date not null default current_date,
  focus text not null,
  notes text not null default '',
  next_steps text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists training_logs_player_date_idx on public.training_logs(player_id, session_date desc);
create index if not exists training_logs_coach_date_idx on public.training_logs(coach_id, session_date desc);

create table if not exists public.skill_assessments (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid references public.profiles(id) on delete set null,
  sport text not null,
  skill_name text not null,
  score numeric(7,2) not null check (score >= 0),
  scale_max numeric(7,2) not null default 10 check (scale_max > 0),
  notes text not null default '',
  assessed_at date not null default current_date,
  created_at timestamptz not null default now(),
  constraint assessment_score_within_scale check (score <= scale_max)
);
create index if not exists skill_assessments_player_date_idx on public.skill_assessments(player_id, assessed_at desc);
create index if not exists skill_assessments_coach_date_idx on public.skill_assessments(coach_id, assessed_at desc);

-- Verify selected coach is actually a coach with a public directory profile.
create or replace function public.validate_selected_coach()
returns trigger
language plpgsql
as $$
begin
  if new.coach_user_id is not null then
    if not exists (
      select 1 from public.profiles p
      where p.id = new.coach_user_id and p.role = 'coach' and p.is_public = true
    ) then
      raise exception 'Selected coach is not available in the public directory.';
    end if;
  end if;
  return new;
end;
$$;
create trigger player_profiles_validate_selected_coach
before insert or update of coach_user_id on public.player_profiles
for each row execute function public.validate_selected_coach();

-- Row Level Security is mandatory for all browser-accessible tables.
alter table public.profiles enable row level security;
alter table public.player_profiles enable row level security;
alter table public.coach_profiles enable row level security;
alter table public.training_logs enable row level security;
alter table public.skill_assessments enable row level security;

-- Profiles: users can always access their own profile. Other signed-in users see only public profiles.
 drop policy if exists "profiles_select_self_or_public_or_linked" on public.profiles;
create policy "profiles_select_self_or_public_or_linked"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or is_public = true
  or exists (
    select 1 from public.player_profiles pp
    where pp.user_id = profiles.id and pp.coach_user_id = (select auth.uid())
  )
);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles for insert to authenticated
with check (id = (select auth.uid()));

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- Player details: player owns these details; selected coach can read the linked player's goals/details.
drop policy if exists "player_profiles_select_owner_or_linked_coach" on public.player_profiles;
create policy "player_profiles_select_owner_or_linked_coach"
on public.player_profiles for select to authenticated
using (user_id = (select auth.uid()) or coach_user_id = (select auth.uid()));

drop policy if exists "player_profiles_insert_owner" on public.player_profiles;
create policy "player_profiles_insert_owner"
on public.player_profiles for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "player_profiles_update_owner" on public.player_profiles;
create policy "player_profiles_update_owner"
on public.player_profiles for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "player_profiles_delete_owner" on public.player_profiles;
create policy "player_profiles_delete_owner"
on public.player_profiles for delete to authenticated
using (user_id = (select auth.uid()));

-- Coach directory fields are readable only when the corresponding basic profile is public, or by the owner.
drop policy if exists "coach_profiles_select_owner_or_public" on public.coach_profiles;
create policy "coach_profiles_select_owner_or_public"
on public.coach_profiles for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.id = coach_profiles.user_id and p.role = 'coach' and p.is_public = true)
);
drop policy if exists "coach_profiles_insert_owner" on public.coach_profiles;
create policy "coach_profiles_insert_owner"
on public.coach_profiles for insert to authenticated
with check (user_id = (select auth.uid()));
drop policy if exists "coach_profiles_update_owner" on public.coach_profiles;
create policy "coach_profiles_update_owner"
on public.coach_profiles for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Logs are append-only for the MVP. Player and linked coach can read them.
drop policy if exists "training_logs_select_player_or_coach" on public.training_logs;
create policy "training_logs_select_player_or_coach"
on public.training_logs for select to authenticated
using (
  player_id = (select auth.uid())
  or coach_id = (select auth.uid())
  or exists (select 1 from public.player_profiles pp where pp.user_id = training_logs.player_id and pp.coach_user_id = (select auth.uid()))
);
drop policy if exists "training_logs_insert_player_self_or_linked_coach" on public.training_logs;
create policy "training_logs_insert_player_self_or_linked_coach"
on public.training_logs for insert to authenticated
with check (
  (player_id = (select auth.uid()) and coach_id is null)
  or (coach_id = (select auth.uid()) and exists (
    select 1 from public.player_profiles pp
    where pp.user_id = training_logs.player_id and pp.coach_user_id = (select auth.uid())
  ))
);

-- Assessments are append-only. A new assessment never overwrites a previous one.
drop policy if exists "skill_assessments_select_player_or_coach" on public.skill_assessments;
create policy "skill_assessments_select_player_or_coach"
on public.skill_assessments for select to authenticated
using (
  player_id = (select auth.uid())
  or coach_id = (select auth.uid())
  or exists (select 1 from public.player_profiles pp where pp.user_id = skill_assessments.player_id and pp.coach_user_id = (select auth.uid()))
);
drop policy if exists "skill_assessments_insert_player_self_or_linked_coach" on public.skill_assessments;
create policy "skill_assessments_insert_player_self_or_linked_coach"
on public.skill_assessments for insert to authenticated
with check (
  (player_id = (select auth.uid()) and coach_id is null)
  or (coach_id = (select auth.uid()) and exists (
    select 1 from public.player_profiles pp
    where pp.user_id = skill_assessments.player_id and pp.coach_user_id = (select auth.uid())
  ))
);

-- Tighten grants: no signed-out access. Authenticated users only receive operations covered by the policies above.
revoke all on table public.profiles from anon;
revoke all on table public.player_profiles from anon;
revoke all on table public.coach_profiles from anon;
revoke all on table public.training_logs from anon;
revoke all on table public.skill_assessments from anon;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.player_profiles to authenticated;
grant select, insert, update on public.coach_profiles to authenticated;
grant select, insert on public.training_logs to authenticated;
grant select, insert on public.skill_assessments to authenticated;

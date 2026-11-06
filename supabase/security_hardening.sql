-- SportMatch security hardening migration.
-- Run AFTER schema.sql in Supabase SQL Editor. Safe to re-run.
-- This migration does not create or expose any service-role key.

-- 1) Revoke a coach's access to a player's private activity immediately when
--    the player removes that coach from player_profiles.coach_user_id.
drop policy if exists "training_logs_select_player_or_coach" on public.training_logs;
drop policy if exists "training_logs_select_player_or_current_coach" on public.training_logs;
create policy "training_logs_select_player_or_current_coach"
on public.training_logs for select to authenticated
using (
  player_id = (select auth.uid())
  or exists (
    select 1 from public.player_profiles pp
    where pp.user_id = training_logs.player_id
      and pp.coach_user_id = (select auth.uid())
  )
);

drop policy if exists "skill_assessments_select_player_or_coach" on public.skill_assessments;
drop policy if exists "skill_assessments_select_player_or_current_coach" on public.skill_assessments;
create policy "skill_assessments_select_player_or_current_coach"
on public.skill_assessments for select to authenticated
using (
  player_id = (select auth.uid())
  or exists (
    select 1 from public.player_profiles pp
    where pp.user_id = skill_assessments.player_id
      and pp.coach_user_id = (select auth.uid())
  )
);

-- 2) Coach verification badges are controlled by a trusted administrative
--    process, not by the coach editing their own profile in the browser.
create or replace function public.guard_coach_verification_flags()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if coalesce(auth.role(), '') = 'authenticated' then
    if tg_op = 'INSERT' then
      if coalesce(new.verification_identity, false)
        or coalesce(new.verification_certificate, false)
        or coalesce(new.verification_organization, false) then
        raise exception 'Verification flags can only be set by the platform verification process.';
      end if;
    elsif new.verification_identity is distinct from old.verification_identity
      or new.verification_certificate is distinct from old.verification_certificate
      or new.verification_organization is distinct from old.verification_organization then
      raise exception 'Verification flags can only be changed by the platform verification process.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists coach_profiles_guard_verification_flags on public.coach_profiles;
create trigger coach_profiles_guard_verification_flags
before insert or update on public.coach_profiles
for each row execute function public.guard_coach_verification_flags();

-- 3) The activity tables only accept actual player and coach identities.
create or replace function public.validate_sportmatch_activity_roles()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = new.player_id and p.role = 'player'
  ) then
    raise exception 'The activity must belong to a player account.';
  end if;

  if new.coach_id is not null and not exists (
    select 1 from public.profiles p
    where p.id = new.coach_id and p.role = 'coach'
  ) then
    raise exception 'The activity author must be a coach account.';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_sportmatch_activity_roles() from public, anon, authenticated;
drop trigger if exists training_logs_validate_account_roles on public.training_logs;
create trigger training_logs_validate_account_roles
before insert on public.training_logs
for each row execute function public.validate_sportmatch_activity_roles();
drop trigger if exists skill_assessments_validate_account_roles on public.skill_assessments;
create trigger skill_assessments_validate_account_roles
before insert on public.skill_assessments
for each row execute function public.validate_sportmatch_activity_roles();

-- 4) Database-side write throttling. This complements (not replaces) Auth
--    rate limits and hosting/API abuse controls. Limit: 20 activity writes
--    per authenticated user, per table, per rolling minute.
create or replace function public.enforce_sportmatch_activity_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_recent_count integer := 0;
begin
  -- Trusted service/admin jobs are managed outside the browser and are not
  -- attributed to an end-user JWT.
  if v_user is null or coalesce(auth.role(), '') <> 'authenticated' then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user::text || ':' || tg_table_name, 0)
  );

  if tg_table_name = 'training_logs' then
    select count(*) into v_recent_count
    from public.training_logs l
    where l.created_at >= now() - interval '1 minute'
      and (l.player_id = v_user or l.coach_id = v_user);
  elsif tg_table_name = 'skill_assessments' then
    select count(*) into v_recent_count
    from public.skill_assessments a
    where a.created_at >= now() - interval '1 minute'
      and (a.player_id = v_user or a.coach_id = v_user);
  end if;

  if v_recent_count >= 20 then
    raise exception 'Too many activity entries. Please wait before trying again.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_sportmatch_activity_rate_limit() from public, anon, authenticated;
drop trigger if exists training_logs_rate_limit on public.training_logs;
create trigger training_logs_rate_limit
before insert on public.training_logs
for each row execute function public.enforce_sportmatch_activity_rate_limit();
drop trigger if exists skill_assessments_rate_limit on public.skill_assessments;
create trigger skill_assessments_rate_limit
before insert on public.skill_assessments
for each row execute function public.enforce_sportmatch_activity_rate_limit();

-- 5) Limit what a browser client may supply. In particular, clients cannot
--    forge id/created_at timestamps to evade the write-throttle trigger.
revoke insert on table public.training_logs from authenticated;
grant insert (player_id, coach_id, sport, session_date, focus, notes, next_steps)
  on table public.training_logs to authenticated;
revoke insert on table public.skill_assessments from authenticated;
grant insert (player_id, coach_id, sport, skill_name, score, scale_max, notes, assessed_at)
  on table public.skill_assessments to authenticated;

-- 6) Add database-enforced text limits for new/updated rows. NOT VALID keeps
--    the migration from failing on any historical row; new writes are checked.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_full_name_len_ck') then
    alter table public.profiles add constraint profiles_full_name_len_ck check (char_length(full_name) between 1 and 100) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_sport_level_values_ck') then
    alter table public.profiles add constraint profiles_sport_level_values_ck check (
      primary_sport in ('كرة القدم', 'السباحة', 'الملاكمة', 'كرة السلة', 'التنس', 'اللياقة البدنية', 'الكرة الطائرة', 'الجري وألعاب القوى', 'رياضات قتالية', 'ركوب الدراجات')
      and current_level in ('مبتدئ', 'مبتدئ متقدم', 'متوسط', 'متقدم', 'تنافسي')
      and target_level in ('مبتدئ', 'مبتدئ متقدم', 'متوسط', 'متقدم', 'تنافسي')
    ) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_location_len_ck') then
    alter table public.profiles add constraint profiles_location_len_ck check (char_length(location) <= 120) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'player_goal_description_len_ck') then
    alter table public.player_profiles add constraint player_goal_description_len_ck check (char_length(goal_description) <= 1000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'player_short_goal_len_ck') then
    alter table public.player_profiles add constraint player_short_goal_len_ck check (char_length(short_term_goal) <= 500) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'coach_qualifications_len_ck') then
    alter table public.coach_profiles add constraint coach_qualifications_len_ck check (char_length(qualifications) <= 1500) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'coach_certificates_len_ck') then
    alter table public.coach_profiles add constraint coach_certificates_len_ck check (char_length(certificates) <= 1500) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'coach_bio_len_ck') then
    alter table public.coach_profiles add constraint coach_bio_len_ck check (char_length(bio) <= 2000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'coach_workplace_len_ck') then
    alter table public.coach_profiles add constraint coach_workplace_len_ck check (char_length(workplace) <= 120 and char_length(academy_name) <= 120) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'coach_price_range_ck') then
    alter table public.coach_profiles add constraint coach_price_range_ck check (price is null or price between 0 and 1000000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'training_focus_len_ck') then
    alter table public.training_logs add constraint training_focus_len_ck check (char_length(focus) between 1 and 150 and char_length(notes) <= 1500 and char_length(next_steps) <= 1000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'training_sport_value_ck') then
    alter table public.training_logs add constraint training_sport_value_ck check (
      sport in ('كرة القدم', 'السباحة', 'الملاكمة', 'كرة السلة', 'التنس', 'اللياقة البدنية', 'الكرة الطائرة', 'الجري وألعاب القوى', 'رياضات قتالية', 'ركوب الدراجات')
    ) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'assessment_text_len_ck') then
    alter table public.skill_assessments add constraint assessment_text_len_ck check (char_length(skill_name) between 1 and 100 and char_length(notes) <= 1000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'assessment_sport_value_ck') then
    alter table public.skill_assessments add constraint assessment_sport_value_ck check (
      sport in ('كرة القدم', 'السباحة', 'الملاكمة', 'كرة السلة', 'التنس', 'اللياقة البدنية', 'الكرة الطائرة', 'الجري وألعاب القوى', 'رياضات قتالية', 'ركوب الدراجات')
    ) not valid;
  end if;
end;
$$;

-- 7) Explicitly keep anonymous access disabled for all application tables.
revoke all on table public.profiles from anon;
revoke all on table public.player_profiles from anon;
revoke all on table public.coach_profiles from anon;
revoke all on table public.training_logs from anon;
revoke all on table public.skill_assessments from anon;

-- Verification status must only be altered through trusted server/admin work.
-- Do not add an admin role or service key to the browser bundle.

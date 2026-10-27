-- =====================================================================
-- Health profile (conditions, food preferences, fitness) and workout log.
-- Run after 005.
--
-- Health conditions are sensitive. They live on the owner-only profiles
-- row (see 003), are saved only with explicit consent, and are never read
-- by anything in the marketplace.
-- =====================================================================

alter table public.profiles
  add column if not exists conditions text[] not null default '{}',
  add column if not exists health_consent_at timestamptz,
  add column if not exists food_preferences text[] not null default '{}',
  add column if not exists fitness_level text not null default 'beginner',
  add column if not exists workout_place text not null default 'home',
  add column if not exists workout_days int not null default 3;

do $$ begin
  alter table public.profiles add constraint profiles_conditions_known
    check (conditions <@ array['diabetes', 'hypertension', 'ibs', 'focus', 'relaxation']::text[]);
  alter table public.profiles add constraint profiles_conditions_need_consent
    check (cardinality(conditions) = 0 or health_consent_at is not null);
  alter table public.profiles add constraint profiles_food_preferences_known
    check (food_preferences <@ array['vegetarian', 'vegan', 'pescatarian', 'halal', 'kosher', 'gluten_free', 'dairy_free', 'nut_free', 'low_carb']::text[]);
  alter table public.profiles add constraint profiles_fitness_level_known
    check (fitness_level in ('beginner', 'intermediate', 'advanced'));
  alter table public.profiles add constraint profiles_workout_place_known
    check (workout_place in ('home', 'gym'));
  alter table public.profiles add constraint profiles_workout_days_range
    check (workout_days between 2 and 6);
exception when duplicate_object then null; end $$;

-- ---------- Workout log -------------------------------------------------
create table if not exists public.workout_logs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  done_on date not null default current_date,
  session_id text not null check (char_length(session_id) between 1 and 40),
  minutes int not null check (minutes between 1 and 300),
  created_at timestamptz not null default now(),
  primary key (user_id, done_on, session_id)
);

alter table public.workout_logs enable row level security;
drop policy if exists "own workout logs" on public.workout_logs;
create policy "own workout logs" on public.workout_logs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.workout_logs from anon;

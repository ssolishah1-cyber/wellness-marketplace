-- =====================================================================
-- Nutrition core: profiles & goals, food log, water, weight.
-- Run after 001 and 002.
--
-- Privacy rule: every table here is readable and writable ONLY by the
-- user who owns the row. Nothing in the marketplace (tables, functions,
-- policies) reads these tables, and there is no staff/admin read policy.
-- =====================================================================

do $$ begin
  create type public.meal_slot as enum ('breakfast', 'lunch', 'snack', 'dinner');
exception when duplicate_object then null; end $$;

-- ---------- Profiles & goals -----------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  kcal_goal int not null default 2100 check (kcal_goal between 800 and 6000),
  protein_goal_g int not null default 140 check (protein_goal_g between 0 and 400),
  carbs_goal_g int not null default 230 check (carbs_goal_g between 0 and 800),
  fat_goal_g int not null default 70 check (fat_goal_g between 0 and 300),
  water_goal_glasses int not null default 8 check (water_goal_glasses between 1 and 20),
  start_weight_kg numeric(5,1) check (start_weight_kg between 25 and 400),
  goal_weight_kg numeric(5,1) check (goal_weight_kg between 25 and 400),
  weekly_email boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, nullif(split_part(coalesce(new.email, ''), '@', 1), ''))
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Food log --------------------------------------------------
create table public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  eaten_on date not null default current_date,
  meal public.meal_slot not null,
  name text not null check (char_length(name) between 1 and 120),
  kcal int not null check (kcal between 0 and 5000),
  protein_g numeric(5,1) not null default 0 check (protein_g between 0 and 500),
  carbs_g numeric(5,1) not null default 0 check (carbs_g between 0 and 1000),
  fat_g numeric(5,1) not null default 0 check (fat_g between 0 and 500),
  created_at timestamptz not null default now()
);
create index on public.food_entries (user_id, eaten_on);

-- ---------- Water -----------------------------------------------------
create table public.water_logs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null default current_date,
  glasses int not null default 0 check (glasses between 0 and 30),
  primary key (user_id, day)
);

-- ---------- Weight ----------------------------------------------------
create table public.weight_logs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  measured_on date not null default current_date,
  weight_kg numeric(5,1) not null check (weight_kg between 25 and 400),
  primary key (user_id, measured_on)
);

-- ---------- Row Level Security: owner only ----------------------------
alter table public.profiles     enable row level security;
alter table public.food_entries enable row level security;
alter table public.water_logs   enable row level security;
alter table public.weight_logs  enable row level security;

create policy "own profile" on public.profiles
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own food entries" on public.food_entries
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own water logs" on public.water_logs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own weight logs" on public.weight_logs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Signed-out visitors get nothing.
revoke all on public.profiles, public.food_entries, public.water_logs, public.weight_logs from anon;

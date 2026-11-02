-- =====================================================================
-- Subscriptions (Nov 2 review): Starter / Visionary / Max, 1/3/6/12-month
-- terms, 7-day free trial (the store's introductory offer). Run after 011.
--
-- Purchases happen in the App Store / Google Play through RevenueCat. Its
-- webhook (supabase/functions/revenuecat-webhook) writes subscriptions with
-- the service role; users can only read their own row.
-- Payments stay switched OFF (app_settings.paywall_enabled = false) until the
-- store products are approved; while off, everything is unlocked.
-- =====================================================================

-- ---------- Settings (admin-editable switches) ----------
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
drop policy if exists "anyone reads settings" on public.app_settings;
create policy "anyone reads settings" on public.app_settings for select using (true);
drop policy if exists "admins change settings" on public.app_settings;
create policy "admins change settings" on public.app_settings for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
grant select on public.app_settings to anon, authenticated;
insert into public.app_settings (key, value) values ('paywall_enabled', 'false') on conflict (key) do nothing;

-- ---------- Subscriptions ----------
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null check (plan in ('starter_nutrition', 'starter_fitness', 'visionary', 'max')),
  term_months int not null check (term_months in (1, 3, 6, 12)),
  status text not null check (status in ('trialing', 'active', 'canceled', 'past_due', 'expired')),
  store text not null check (store in ('app_store', 'play_store', 'stripe', 'manual')),
  product_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
drop policy if exists "read own subscription" on public.subscriptions;
create policy "read own subscription" on public.subscriptions for select to authenticated using (user_id = auth.uid());
revoke all on public.subscriptions from anon;
revoke insert, update, delete on public.subscriptions from authenticated;

-- ---------- Free book for Max subscribers ----------
create table if not exists public.book_claims (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  address_line1 text not null check (char_length(address_line1) between 3 and 200),
  address_line2 text check (char_length(address_line2) <= 200),
  city text not null check (char_length(city) between 1 and 100),
  region text not null check (char_length(region) between 1 and 100),
  postal_code text not null check (char_length(postal_code) between 2 and 20),
  country text not null default 'United States' check (char_length(country) between 2 and 60),
  status text not null default 'requested' check (status in ('requested', 'shipped')),
  created_at timestamptz not null default now(),
  shipped_at timestamptz
);
alter table public.book_claims enable row level security;
drop policy if exists "max subscribers claim the book" on public.book_claims;
create policy "max subscribers claim the book" on public.book_claims for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.subscriptions s where s.user_id = auth.uid() and s.plan = 'max'
      and s.status in ('active', 'canceled', 'past_due') and s.current_period_end > now()));
drop policy if exists "read own book claim" on public.book_claims;
create policy "read own book claim" on public.book_claims for select to authenticated using (user_id = auth.uid());
drop policy if exists "admins manage book claims" on public.book_claims;
create policy "admins manage book claims" on public.book_claims for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
revoke all on public.book_claims from anon;

-- ---------- Admin numbers ----------
-- Paying = active (or canceled / past due but still inside the paid period),
-- not in a free trial. Commission per paying subscriber per month (agreement
-- with Soli, Nov 2): Starter $0.50, Visionary $0.75, Max $1.00.
create or replace function public.admin_subscription_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_admin();
  return (
    with live as (
      select plan, term_months, status from public.subscriptions
      where status in ('trialing', 'active', 'canceled', 'past_due') and current_period_end > now()
    ), paying as (select * from live where status <> 'trialing')
    select jsonb_build_object(
      'paywall_enabled', coalesce((select value from public.app_settings where key = 'paywall_enabled'), 'false'::jsonb),
      'trialing', (select count(*) from live where status = 'trialing'),
      'paying', (select count(*) from paying),
      'by_plan', coalesce((select jsonb_object_agg(plan, n) from (select plan, count(*) n from paying group by plan) x), '{}'::jsonb),
      'by_term', coalesce((select jsonb_object_agg(term_months::text, n) from (select term_months, count(*) n from paying group by term_months) x), '{}'::jsonb),
      'commission_month_usd', (select coalesce(sum(case when plan like 'starter%' then 0.50 when plan = 'visionary' then 0.75 else 1.00 end), 0) from paying),
      'book_claims_waiting', (select count(*) from public.book_claims where status = 'requested')
    )
  );
end $$;
revoke execute on function public.admin_subscription_stats() from public, anon;
grant execute on function public.admin_subscription_stats() to authenticated;

-- Admins can grant a plan by hand (testers, partners, support cases).
create or replace function public.admin_set_subscription(_user_id uuid, _plan text, _months int)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  if _plan is null then
    delete from public.subscriptions where user_id = _user_id and store = 'manual';
  else
    insert into public.subscriptions (user_id, plan, term_months, status, store, current_period_end)
    values (_user_id, _plan, 1, 'active', 'manual', now() + make_interval(months => greatest(_months, 1)))
    on conflict (user_id) do update set plan = excluded.plan, status = 'active', store = 'manual',
      current_period_end = excluded.current_period_end, updated_at = now();
  end if;
  insert into public.admin_audit_log (actor_id, action, target_user_id, details)
  values (auth.uid(), 'set_subscription', _user_id, jsonb_build_object('plan', _plan, 'months', _months));
end $$;
revoke execute on function public.admin_set_subscription(uuid, text, int) from public, anon;
grant execute on function public.admin_set_subscription(uuid, text, int) to authenticated;

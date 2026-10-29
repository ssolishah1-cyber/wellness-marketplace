-- =====================================================================
-- Market ads, admin client view, and three more health focus options.
-- Run after 007.
--
-- Client data: admins can open an individual client's profile, logs and
-- health focus to support them. Users are told this at sign-up and in the
-- Privacy Policy, and every view is recorded in admin_audit_log.
-- Reviewers (Market only) never get client data.
--
-- Ads: always labelled Sponsored in the app, placed by staff, and never
-- targeted with health data (placement and category only).
-- =====================================================================

-- ---------- Health focus: weight loss, heart health, general wellness ----------
alter table public.profiles drop constraint if exists profiles_conditions_known;
alter table public.profiles add constraint profiles_conditions_known
  check (conditions <@ array['diabetes', 'hypertension', 'ibs', 'focus', 'relaxation', 'weight_loss', 'heart_health', 'general_wellness']::text[]);

-- ---------- Ads ----------
do $$ begin
  create type public.ad_kind as enum ('featured_listing', 'home_banner', 'category_sponsor');
exception when duplicate_object then null; end $$;

create table if not exists public.marketplace_ads (
  id uuid primary key default gen_random_uuid(),
  kind public.ad_kind not null,
  title text not null check (char_length(title) between 1 and 80),
  body text check (char_length(body) <= 160),
  image_url text check (image_url is null or image_url ~* '^https?://'),
  listing_id uuid references public.marketplace_listings(id) on delete cascade,
  brand_id uuid references public.marketplace_brands(id) on delete cascade,
  category_id uuid references public.marketplace_categories(id) on delete cascade,
  link_url text check (link_url is null or link_url ~* '^https?://'),
  advertiser text not null check (char_length(advertiser) between 1 and 120),
  vendor_id uuid references public.marketplace_vendors(id) on delete set null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  priority int not null default 0,
  -- Billing (staff only; online checkout can fill these later).
  price_cents int check (price_cents is null or price_cents >= 0),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'invoiced', 'paid', 'complimentary')),
  notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  -- Every ad has somewhere to go.
  check (listing_id is not null or brand_id is not null or link_url is not null),
  check (kind <> 'featured_listing' or listing_id is not null),
  check (kind <> 'category_sponsor' or category_id is not null),
  check (kind <> 'home_banner' or image_url is not null)
);
create index if not exists marketplace_ads_live on public.marketplace_ads (kind, is_active, starts_at, ends_at);

drop trigger if exists trg_ads_updated on public.marketplace_ads;
create trigger trg_ads_updated before update on public.marketplace_ads
  for each row execute function public.set_updated_at();

create table if not exists public.marketplace_ad_stats (
  ad_id uuid not null references public.marketplace_ads(id) on delete cascade,
  day date not null default current_date,
  views int not null default 0,
  clicks int not null default 0,
  primary key (ad_id, day)
);

alter table public.marketplace_ads enable row level security;
alter table public.marketplace_ad_stats enable row level security;
drop policy if exists "staff manage ads" on public.marketplace_ads;
create policy "staff manage ads" on public.marketplace_ads for all to authenticated
  using (public.is_marketplace_staff(auth.uid())) with check (public.is_marketplace_staff(auth.uid()));
drop policy if exists "staff read ad stats" on public.marketplace_ad_stats;
create policy "staff read ad stats" on public.marketplace_ad_stats for select to authenticated
  using (public.is_marketplace_staff(auth.uid()));
revoke all on public.marketplace_ads, public.marketplace_ad_stats from anon;

-- Live ads for the app: public fields only (no price, payment or notes).
-- A featured listing only shows while its listing is published.
drop function if exists public.list_live_ads() cascade;
create or replace function public.list_live_ads()
returns table (id uuid, kind public.ad_kind, title text, body text, image_url text, listing_id uuid, listing_slug text, brand_id uuid, brand_slug text, category_id uuid, link_url text, advertiser text, priority int)
language sql stable security definer set search_path = public as $$
  select a.id, a.kind, a.title, a.body, a.image_url, a.listing_id, l.slug, a.brand_id, b.slug, a.category_id, a.link_url, a.advertiser, a.priority
  from public.marketplace_ads a
  left join public.marketplace_listings l on l.id = a.listing_id
  left join public.marketplace_brands b on b.id = a.brand_id
  where a.is_active and a.starts_at <= now() and (a.ends_at is null or a.ends_at > now())
    and (a.listing_id is null or (l.status = 'published' and (l.expires_at is null or l.expires_at > now())))
    and (a.brand_id is null or b.is_active)
  order by a.priority desc, a.starts_at desc
$$;

-- Anonymous daily totals only, and only for live ads.
create or replace function public.record_ad_event(_ad_id uuid, _event text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if _event not in ('view', 'click') then return; end if;
  if not exists (select 1 from public.list_live_ads() x where x.id = _ad_id) then return; end if;
  insert into public.marketplace_ad_stats (ad_id, day, views, clicks)
  values (_ad_id, current_date, (_event = 'view')::int, (_event = 'click')::int)
  on conflict (ad_id, day) do update set
    views = public.marketplace_ad_stats.views + (_event = 'view')::int,
    clicks = public.marketplace_ad_stats.clicks + (_event = 'click')::int;
end $$;

grant execute on function public.list_live_ads() to anon, authenticated;
grant execute on function public.record_ad_event(uuid, text) to anon, authenticated;

-- ---------- Admin: client list with activity, and a full client view ----------
drop function if exists public.admin_list_users(text, int, int);
create or replace function public.admin_list_users(_search text default '', _limit int default 50, _offset int default 0)
returns table (user_id uuid, email text, display_name text, created_at timestamptz, last_sign_in_at timestamptz,
               onboarded boolean, roles text[], vendor_status text, conditions text[], last_logged_on date, logged_days_30 int)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  perform public.require_admin();
  return query
    select u.id, u.email::text, p.display_name, u.created_at, u.last_sign_in_at, p.onboarded_at is not null,
           array(select r.role::text from public.user_roles r where r.user_id = u.id order by 1),
           (select v.status::text from public.marketplace_vendors v where v.owner_user_id = u.id order by v.created_at limit 1),
           coalesce(p.conditions, '{}'),
           (select max(f.eaten_on) from public.food_entries f where f.user_id = u.id),
           (select count(distinct f.eaten_on)::int from public.food_entries f where f.user_id = u.id and f.eaten_on > current_date - 30)
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    where coalesce(_search, '') = ''
       or u.email ilike '%' || replace(replace(_search, '%', '\%'), '_', '\_') || '%'
       or p.display_name ilike '%' || replace(replace(_search, '%', '\%'), '_', '\_') || '%'
    order by u.created_at desc
    limit least(greatest(_limit, 1), 200) offset greatest(_offset, 0);
end $$;

create or replace function public.admin_client_detail(_user_id uuid, _days int default 90)
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare since date := current_date - least(greatest(_days, 1), 365);
begin
  perform public.require_admin();
  if not exists (select 1 from auth.users where id = _user_id) then raise exception 'Client not found'; end if;
  insert into public.admin_audit_log (actor_id, action, target_user_id, details)
  values (auth.uid(), 'view_client', _user_id, jsonb_build_object('days', _days));
  return jsonb_build_object(
    'account', (select jsonb_build_object('email', u.email, 'created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at) from auth.users u where u.id = _user_id),
    'profile', (select to_jsonb(p) from public.profiles p where p.user_id = _user_id),
    'food', coalesce((select jsonb_agg(jsonb_build_object('eaten_on', f.eaten_on, 'meal', f.meal, 'name', f.name, 'kcal', f.kcal, 'protein_g', f.protein_g, 'carbs_g', f.carbs_g, 'fat_g', f.fat_g) order by f.eaten_on desc, f.created_at desc)
                      from public.food_entries f where f.user_id = _user_id and f.eaten_on >= since), '[]'::jsonb),
    'water', coalesce((select jsonb_agg(jsonb_build_object('day', w.day, 'glasses', w.glasses) order by w.day desc) from public.water_logs w where w.user_id = _user_id and w.day >= since), '[]'::jsonb),
    'weights', coalesce((select jsonb_agg(jsonb_build_object('measured_on', w.measured_on, 'weight_kg', w.weight_kg) order by w.measured_on) from public.weight_logs w where w.user_id = _user_id), '[]'::jsonb),
    'workouts', coalesce((select jsonb_agg(jsonb_build_object('done_on', w.done_on, 'session_id', w.session_id, 'minutes', w.minutes) order by w.done_on desc) from public.workout_logs w where w.user_id = _user_id and w.done_on >= since), '[]'::jsonb),
    'inquiries', coalesce((select jsonb_agg(jsonb_build_object('created_at', q.created_at, 'listing_id', q.listing_id, 'message', q.message, 'status', q.status) order by q.created_at desc) from public.marketplace_inquiries q where q.user_id = _user_id), '[]'::jsonb),
    'roles', (select coalesce(array_agg(r.role::text), '{}') from public.user_roles r where r.user_id = _user_id)
  );
end $$;

revoke execute on function public.admin_list_users(text, int, int) from public, anon;
revoke execute on function public.admin_client_detail(uuid, int) from public, anon;
grant execute on function public.admin_list_users(text, int, int) to authenticated;
grant execute on function public.admin_client_detail(uuid, int) to authenticated;

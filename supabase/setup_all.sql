-- Run this once in Supabase → SQL Editor (paste all, click Run).

-- ===== supabase/migrations/001_marketplace.sql =====
-- =====================================================================
-- Wellness Marketplace module
-- Paste into Supabase SQL editor (or add as a migration in Lovable).
-- Safe to run on an existing nutrition-app project: it only adds new
-- marketplace_* objects plus a user_roles table if you don't have one.
-- =====================================================================

-- ---------- Roles (skip this block if your project already has it) ----
do $$ begin
  create type public.app_role as enum ('admin', 'reviewer', 'user');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

drop policy if exists "users read own roles" on public.user_roles;
create policy "users read own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid());

-- Admins and reviewers are the only people who can approve/publish.
create or replace function public.is_marketplace_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_user_id, 'admin') or public.has_role(_user_id, 'reviewer')
$$;

-- ---------- Enums ------------------------------------------------------
do $$ begin
  create type public.listing_status as enum
    ('draft', 'pending_review', 'approved', 'published', 'rejected', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.vendor_status as enum ('pending', 'approved', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.listing_type as enum
    ('product', 'service', 'program', 'provider', 'education', 'event');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.review_type as enum
    ('advertising', 'regulatory', 'clinical', 'legal', 'status_change');
exception when duplicate_object then null; end $$;

-- ---------- Tables -----------------------------------------------------
create table public.marketplace_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon text,                       -- lucide icon name, e.g. 'stethoscope'
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Approved businesses that can submit listings.
create table public.marketplace_vendors (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  business_name text not null,
  contact_email text,
  website_url text,
  description text,
  credentials text,                -- licences / certifications for providers
  status public.vendor_status not null default 'pending',
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Brands shown in the marketplace (TriggerMD, XIMMD, partner brands).
create table public.marketplace_brands (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.marketplace_vendors(id) on delete set null,
  slug text not null unique,
  name text not null,
  tagline text,
  description text,
  logo_url text,
  website_url text,
  is_owned_brand boolean not null default false,   -- affiliated with app owner
  is_featured boolean not null default false,
  affiliation_disclosure text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.marketplace_vendors(id) on delete cascade,
  brand_id uuid references public.marketplace_brands(id) on delete set null,
  category_id uuid not null references public.marketplace_categories(id),
  slug text not null unique,
  title text not null,
  summary text,
  description text,
  listing_type public.listing_type not null default 'product',
  -- pricing
  price_cents int check (price_cents is null or price_cents >= 0),
  currency text not null default 'USD',
  price_note text,                 -- e.g. "from", "per consult", "price varies"
  price_verified boolean not null default false,
  -- media / outbound link
  image_urls text[] not null default '{}',
  destination_url text,
  cta_label text default 'Learn more',
  -- service details
  service_areas text[] not null default '{}',
  how_it_works text,
  eligibility text,
  min_age int check (min_age is null or min_age between 0 and 120),
  -- product details
  ingredients_specs text,
  shipping_info text,
  refund_policy text,
  -- compliance
  evidence_summary text,
  evidence_urls text[] not null default '{}',
  disclaimer text,
  is_sponsored boolean not null default false,
  is_regulated boolean not null default false,  -- telehealth / Rx-adjacent
  -- events
  event_starts_at timestamptz,
  event_location text,
  -- workflow
  status public.listing_status not null default 'draft',
  rejection_reason text,
  published_at timestamptz,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.marketplace_listings (status, category_id);
create index on public.marketplace_listings (brand_id);
create index on public.marketplace_listings (vendor_id);

-- Approval / compliance history. Status changes are logged automatically.
create table public.marketplace_reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  reviewer_id uuid references auth.users(id) on delete set null,
  review_type public.review_type not null,
  from_status public.listing_status,
  to_status public.listing_status,
  notes text,
  created_at timestamptz not null default now()
);
create index on public.marketplace_reviews (listing_id, created_at desc);

-- Aggregate click counts only: no user ids, no health data.
create table public.marketplace_clicks (
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  day date not null default current_date,
  source text not null default 'market',   -- 'market', 'brand_page', 'featured'
  click_count int not null default 0,
  primary key (listing_id, day, source)
);

-- User-initiated inquiries. Never sent without explicit consent.
create table public.marketplace_inquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  contact_name text not null,
  contact_email text not null,
  message text not null check (char_length(message) <= 2000),
  consent_to_share boolean not null check (consent_to_share),
  status text not null default 'new' check (status in ('new', 'forwarded', 'closed')),
  created_at timestamptz not null default now()
);

-- ---------- Helpers ----------------------------------------------------
create or replace function public.owns_vendor(_vendor_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.marketplace_vendors
    where id = _vendor_id and owner_user_id = auth.uid() and status = 'approved'
  )
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger trg_listings_updated before update on public.marketplace_listings
  for each row execute function public.set_updated_at();
create trigger trg_vendors_updated before update on public.marketplace_vendors
  for each row execute function public.set_updated_at();

-- Vendors can never approve/publish their own listings, flag them as
-- sponsored, or keep a live listing live after editing it.
create or replace function public.enforce_listing_workflow()
returns trigger language plpgsql security definer set search_path = public as $$
declare staff boolean := public.is_marketplace_staff(auth.uid());
begin
  -- service_role / SQL editor (no auth.uid()) is trusted
  if auth.uid() is null or staff then
    if new.status = 'published' and new.published_at is null then
      new.published_at := now();
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'pending_review') then
      new.status := 'draft';
    end if;
    new.is_sponsored := false;
    new.price_verified := false;
    new.published_at := null;
    new.rejection_reason := null;
    new.created_by := auth.uid();
    return new;
  end if;

  -- UPDATE by a vendor
  new.vendor_id := old.vendor_id;
  new.is_sponsored := old.is_sponsored;
  new.price_verified := old.price_verified;
  new.rejection_reason := old.rejection_reason;
  new.created_by := old.created_by;

  if new.status is distinct from old.status
     and not (new.status in ('draft', 'pending_review')) then
    raise exception 'Only marketplace reviewers can set status to %', new.status;
  end if;

  -- Any content edit to an approved/published listing sends it back to review.
  if old.status in ('approved', 'published')
     and (new.status = old.status) then
    new.status := 'pending_review';
    new.published_at := null;
  end if;
  if new.status <> 'published' then
    new.published_at := null;
  end if;
  return new;
end $$;

create trigger trg_listings_workflow before insert or update on public.marketplace_listings
  for each row execute function public.enforce_listing_workflow();

create or replace function public.log_listing_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.marketplace_reviews (listing_id, reviewer_id, review_type, from_status, to_status, notes)
    values (new.id, auth.uid(), 'status_change',
            case when tg_op = 'UPDATE' then old.status end, new.status,
            case when new.status = 'rejected' then new.rejection_reason end);
  end if;
  return new;
end $$;

create trigger trg_listings_log after insert or update on public.marketplace_listings
  for each row execute function public.log_listing_status_change();

-- Vendors cannot self-approve their business account.
create or replace function public.enforce_vendor_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_marketplace_staff(auth.uid()) then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.verified_at := null;
    new.owner_user_id := auth.uid();
  else
    new.status := old.status;
    new.verified_at := old.verified_at;
    new.owner_user_id := old.owner_user_id;
  end if;
  return new;
end $$;

create trigger trg_vendors_status before insert or update on public.marketplace_vendors
  for each row execute function public.enforce_vendor_status();

-- Anonymous, aggregate click tracking. Call from the client via supabase.rpc().
create or replace function public.record_marketplace_click(_listing_id uuid, _source text default 'market')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.marketplace_listings
                 where id = _listing_id and status = 'published') then
    return;
  end if;
  insert into public.marketplace_clicks (listing_id, day, source, click_count)
  values (_listing_id, current_date, left(coalesce(_source, 'market'), 32), 1)
  on conflict (listing_id, day, source)
  do update set click_count = public.marketplace_clicks.click_count + 1;
end $$;
grant execute on function public.record_marketplace_click(uuid, text) to anon, authenticated;

-- Mark listings past expires_at as expired (run daily with pg_cron, or
-- call from an admin button). Public reads also filter on expires_at.
create or replace function public.expire_marketplace_listings()
returns int language sql security definer set search_path = public as $$
  with x as (
    update public.marketplace_listings set status = 'expired'
    where status in ('approved', 'published') and expires_at is not null and expires_at <= now()
    returning 1)
  select count(*)::int from x
$$;

-- ---------- Row Level Security ----------------------------------------
alter table public.marketplace_categories enable row level security;
alter table public.marketplace_vendors    enable row level security;
alter table public.marketplace_brands     enable row level security;
alter table public.marketplace_listings   enable row level security;
alter table public.marketplace_reviews    enable row level security;
alter table public.marketplace_clicks     enable row level security;
alter table public.marketplace_inquiries  enable row level security;

-- Categories & brands: public read, staff write
create policy "public read categories" on public.marketplace_categories
  for select using (is_active);
create policy "staff manage categories" on public.marketplace_categories
  for all to authenticated using (public.is_marketplace_staff(auth.uid()))
  with check (public.is_marketplace_staff(auth.uid()));

create policy "public read brands" on public.marketplace_brands
  for select using (is_active);
create policy "staff manage brands" on public.marketplace_brands
  for all to authenticated using (public.is_marketplace_staff(auth.uid()))
  with check (public.is_marketplace_staff(auth.uid()));

-- Listings: only published & unexpired are public
create policy "public read published listings" on public.marketplace_listings
  for select using (status = 'published' and (expires_at is null or expires_at > now()));
create policy "vendors read own listings" on public.marketplace_listings
  for select to authenticated using (public.owns_vendor(vendor_id));
create policy "vendors create own listings" on public.marketplace_listings
  for insert to authenticated with check (public.owns_vendor(vendor_id));
create policy "vendors update own listings" on public.marketplace_listings
  for update to authenticated using (public.owns_vendor(vendor_id))
  with check (public.owns_vendor(vendor_id));
create policy "vendors delete own drafts" on public.marketplace_listings
  for delete to authenticated using (public.owns_vendor(vendor_id) and status in ('draft', 'rejected'));
create policy "staff manage listings" on public.marketplace_listings
  for all to authenticated using (public.is_marketplace_staff(auth.uid()))
  with check (public.is_marketplace_staff(auth.uid()));

-- Vendors
create policy "vendors read own account" on public.marketplace_vendors
  for select to authenticated using (owner_user_id = auth.uid());
create policy "users apply as vendor" on public.marketplace_vendors
  for insert to authenticated with check (owner_user_id = auth.uid());
create policy "vendors update own account" on public.marketplace_vendors
  for update to authenticated using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());
create policy "staff manage vendors" on public.marketplace_vendors
  for all to authenticated using (public.is_marketplace_staff(auth.uid()))
  with check (public.is_marketplace_staff(auth.uid()));

-- Reviews: staff read/write; vendors can read history of their own listings
create policy "staff manage reviews" on public.marketplace_reviews
  for all to authenticated using (public.is_marketplace_staff(auth.uid()))
  with check (public.is_marketplace_staff(auth.uid()));
create policy "vendors read own listing reviews" on public.marketplace_reviews
  for select to authenticated using (exists (
    select 1 from public.marketplace_listings l
    where l.id = listing_id and public.owns_vendor(l.vendor_id)));

-- Clicks: written only through record_marketplace_click(); staff read
create policy "staff read clicks" on public.marketplace_clicks
  for select to authenticated using (public.is_marketplace_staff(auth.uid()));
create policy "vendors read own clicks" on public.marketplace_clicks
  for select to authenticated using (exists (
    select 1 from public.marketplace_listings l
    where l.id = listing_id and public.owns_vendor(l.vendor_id)));

-- Inquiries
create policy "users send inquiries" on public.marketplace_inquiries
  for insert to authenticated with check (
    user_id = auth.uid() and exists (
      select 1 from public.marketplace_listings l
      where l.id = listing_id and l.status = 'published'));
create policy "users read own inquiries" on public.marketplace_inquiries
  for select to authenticated using (user_id = auth.uid());
create policy "vendors read inquiries for own listings" on public.marketplace_inquiries
  for select to authenticated using (exists (
    select 1 from public.marketplace_listings l
    where l.id = listing_id and public.owns_vendor(l.vendor_id)));
create policy "staff manage inquiries" on public.marketplace_inquiries
  for all to authenticated using (public.is_marketplace_staff(auth.uid()))
  with check (public.is_marketplace_staff(auth.uid()));

-- ---------- Seed data --------------------------------------------------
insert into public.marketplace_categories (slug, name, description, icon, display_order) values
  ('telehealth',        'Telehealth',          'Virtual consultations and approved medical programs', 'stethoscope', 1),
  ('wellness-products', 'Wellness Products',   'Eligible supplements and wellness merchandise',       'package',     2),
  ('weight-management', 'Weight Management',   'Educational programs, coaching and meal-planning',    'scale',       3),
  ('fitness',           'Fitness',             'Workout memberships, equipment and digital courses',  'dumbbell',    4),
  ('books-education',   'Books & Education',   'Nutrition guides, health books and resources',        'book-open',   5),
  ('providers',         'Wellness Providers',  'Verified dietitians, nutrition coaches and professionals', 'badge-check', 6),
  ('events',            'Events & Programs',   'Wellness seminars, online workshops and health events', 'calendar',  7)
on conflict (slug) do nothing;

-- Owned brands. Fill in logo_url / website_url / description with verified copy.
insert into public.marketplace_brands
  (slug, name, tagline, is_owned_brand, is_featured, affiliation_disclosure) values
  ('triggermd', 'TriggerMD', 'Virtual care, consultations and eligible medical services', true, true,
   'TriggerMD is affiliated with the owner of this app. We may benefit if you use its services.'),
  ('ximmd', 'XIMMD', 'Wellness products and approved offers', true, true,
   'XIMMD is affiliated with the owner of this app. We may benefit from purchases.')
on conflict (slug) do nothing;

-- ===== supabase/migrations/002_storage_links_expiry.sql =====
-- =====================================================================
-- Wellness Marketplace: images, safe links, scheduled expiry
-- Run after 001_marketplace.sql.
-- =====================================================================

-- ---------- Only http(s) links may be stored -------------------------
create or replace function public.all_http_urls(urls text[])
returns boolean language sql immutable as $$
  select coalesce(bool_and(u ~* '^https?://'), true) from unnest(urls) as u
$$;

alter table public.marketplace_listings
  add constraint listings_destination_http check (destination_url is null or destination_url ~* '^https?://'),
  add constraint listings_evidence_http check (public.all_http_urls(evidence_urls)),
  add constraint listings_images_http check (public.all_http_urls(image_urls));

alter table public.marketplace_brands
  add constraint brands_website_http check (website_url is null or website_url ~* '^https?://'),
  add constraint brands_logo_http check (logo_url is null or logo_url ~* '^https?://');

alter table public.marketplace_vendors
  add constraint vendors_website_http check (website_url is null or website_url ~* '^https?://');

-- ---------- Image storage --------------------------------------------
create or replace function public.owns_vendor_folder(_folder text)
returns boolean language sql stable security definer set search_path = public as $$
  -- CASE guarantees the uuid cast only runs on a valid uuid string
  select case when _folder ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then public.owns_vendor(_folder::uuid) else false end
$$;

-- Public bucket for listing images and brand logos.
-- Path convention: <vendor_id>/<file> for vendors, brands/<file> or staff/<file> for staff.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marketplace-images', 'marketplace-images', true, 5242880,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "marketplace images are public"
  on storage.objects for select
  using (bucket_id = 'marketplace-images');

create policy "staff upload marketplace images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'marketplace-images' and public.is_marketplace_staff(auth.uid()));

create policy "staff delete marketplace images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'marketplace-images' and public.is_marketplace_staff(auth.uid()));

create policy "vendors upload to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'marketplace-images'
    and public.owns_vendor_folder((storage.foldername(name))[1])
  );

create policy "vendors delete own images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'marketplace-images'
    and public.owns_vendor_folder((storage.foldername(name))[1])
  );

-- ---------- Nightly expiry (requires the pg_cron extension) ----------
-- Enable it under Database → Extensions → pg_cron first.
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('expire-marketplace-listings', '15 3 * * *',
                          'select public.expire_marketplace_listings()');
  else
    raise notice 'pg_cron not enabled: enable it, then run: select cron.schedule(''expire-marketplace-listings'', ''15 3 * * *'', ''select public.expire_marketplace_listings()'');';
  end if;
end $$;

-- ===== supabase/migrations/003_nutrition.sql =====
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

-- ===== supabase/migrations/004_lock_down_functions.sql =====
-- =====================================================================
-- Tighten function permissions (Supabase security advisor findings).
-- Postgres lets everyone (PUBLIC) execute new functions by default; we
-- remove that and grant only what the app needs.
-- =====================================================================

-- Trigger functions: never callable over the API.
revoke execute on function public.enforce_listing_workflow()  from public, anon, authenticated;
revoke execute on function public.enforce_vendor_status()     from public, anon, authenticated;
revoke execute on function public.log_listing_status_change() from public, anon, authenticated;
revoke execute on function public.handle_new_user()           from public, anon, authenticated;

-- Helpers used by RLS policies and the app: signed-in users only.
revoke execute on function public.has_role(uuid, public.app_role)  from public, anon;
revoke execute on function public.is_marketplace_staff(uuid)        from public, anon;
revoke execute on function public.owns_vendor(uuid)                 from public, anon;
revoke execute on function public.owns_vendor_folder(text)          from public, anon;
grant  execute on function public.has_role(uuid, public.app_role)  to authenticated;
grant  execute on function public.is_marketplace_staff(uuid)        to authenticated;
grant  execute on function public.owns_vendor(uuid)                 to authenticated;
grant  execute on function public.owns_vendor_folder(text)          to authenticated;

-- Expiring listings: staff only (also runs from pg_cron as the owner).
create or replace function public.expire_marketplace_listings()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is not null and not public.is_marketplace_staff(auth.uid()) then
    raise exception 'Only marketplace staff can expire listings';
  end if;
  with x as (
    update public.marketplace_listings set status = 'expired'
    where status in ('approved', 'published') and expires_at is not null and expires_at <= now()
    returning 1)
  select count(*)::int into n from x;
  return n;
end $$;
revoke execute on function public.expire_marketplace_listings() from public, anon;
grant  execute on function public.expire_marketplace_listings() to authenticated;

-- Click counting stays open to everyone (anonymous daily totals only).
grant execute on function public.record_marketplace_click(uuid, text) to anon, authenticated;

-- Pin search_path on the remaining helpers.
alter function public.set_updated_at() set search_path = public;
alter function public.all_http_urls(text[]) set search_path = public;

-- ===== supabase/migrations/005_onboarding_and_account_deletion.sql =====
-- =====================================================================
-- Onboarding flag and self-service account deletion.
-- =====================================================================

-- Set when the user finishes the first-run setup wizard.
alter table public.profiles add column if not exists onboarded_at timestamptz;

-- Permanently deletes the signed-in user's account. Every personal table
-- references auth.users with ON DELETE CASCADE (profile, food log, water,
-- weight, roles, inquiries); vendor accounts and listings keep existing with
-- the owner cleared (ON DELETE SET NULL) so published content isn't lost.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not signed in';
  end if;
  -- Listing images belong to the business listing, not the person, and stay
  -- with it (Supabase also blocks direct SQL deletes on storage.objects).
  delete from auth.users where id = me;
end $$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

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

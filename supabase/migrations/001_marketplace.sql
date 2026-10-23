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

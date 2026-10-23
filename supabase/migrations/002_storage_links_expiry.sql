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

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

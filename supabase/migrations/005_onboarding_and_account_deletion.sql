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

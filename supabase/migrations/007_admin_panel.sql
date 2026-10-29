-- =====================================================================
-- Admin panel: app statistics, user list and role management.
-- Run after 006.
--
-- Admins see account details (email, sign-up and last sign-in dates,
-- roles) and anonymous totals. They never see anyone's meals, weight,
-- workouts or health focus. Health-focus totals under 5 are hidden so no
-- one can be singled out.
-- =====================================================================

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
drop policy if exists "admins read audit log" on public.admin_audit_log;
create policy "admins read audit log" on public.admin_audit_log
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
revoke all on public.admin_audit_log from anon;
-- Rows are written only by the functions below.
revoke insert, update, delete on public.admin_audit_log from authenticated;

create or replace function public.require_admin()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Admins only' using errcode = '42501';
  end if;
end $$;

create or replace function public.admin_app_stats()
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'total_users',      (select count(*) from auth.users),
    'new_users_7d',     (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'new_users_30d',    (select count(*) from auth.users where created_at > now() - interval '30 days'),
    'onboarded',        (select count(*) from public.profiles where onboarded_at is not null),
    'active_7d',        (select count(distinct user_id) from public.food_entries where eaten_on > current_date - 7),
    'food_entries_7d',  (select count(*) from public.food_entries where eaten_on > current_date - 7),
    'workouts_7d',      (select count(*) from public.workout_logs where done_on > current_date - 7),
    'with_health_focus',(select count(*) from public.profiles where cardinality(conditions) > 0),
    'condition_counts', (select coalesce(jsonb_object_agg(c, case when n >= 5 then n end), '{}'::jsonb)
                           from (select unnest(conditions) c, count(*) n from public.profiles group by 1) x),
    'signups_by_day',   (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'n', n) order by d), '[]'::jsonb)
                           from (select gs::date d, (select count(*) from auth.users u where u.created_at::date = gs::date) n
                                 from generate_series(current_date - 29, current_date, interval '1 day') gs) s),
    'pending_listings', (select count(*) from public.marketplace_listings where status = 'pending_review'),
    'pending_vendors',  (select count(*) from public.marketplace_vendors where status = 'pending'),
    'inquiries_7d',     (select count(*) from public.marketplace_inquiries where created_at > now() - interval '7 days')
  );
end $$;

create or replace function public.admin_list_users(_search text default '', _limit int default 50, _offset int default 0)
returns table (user_id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, onboarded boolean, roles text[], vendor_status text)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  perform public.require_admin();
  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at, p.onboarded_at is not null,
           array(select r.role::text from public.user_roles r where r.user_id = u.id order by 1),
           (select v.status::text from public.marketplace_vendors v where v.owner_user_id = u.id order by v.created_at limit 1)
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    where coalesce(_search, '') = '' or u.email ilike '%' || replace(replace(_search, '%', '\%'), '_', '\_') || '%'
    order by u.created_at desc
    limit least(greatest(_limit, 1), 200) offset greatest(_offset, 0);
end $$;

create or replace function public.admin_set_role(_user_id uuid, _role public.app_role, _grant boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  if _grant then
    insert into public.user_roles (user_id, role) values (_user_id, _role) on conflict do nothing;
  else
    if _role = 'admin' and _user_id = auth.uid() then
      raise exception 'You can''t remove your own admin role.';
    end if;
    delete from public.user_roles where user_id = _user_id and role = _role;
  end if;
  insert into public.admin_audit_log (actor_id, action, target_user_id, details)
  values (auth.uid(), case when _grant then 'grant_role' else 'revoke_role' end, _user_id, jsonb_build_object('role', _role));
end $$;

revoke execute on function public.require_admin() from public, anon, authenticated;
revoke execute on function public.admin_app_stats() from public, anon;
revoke execute on function public.admin_list_users(text, int, int) from public, anon;
revoke execute on function public.admin_set_role(uuid, public.app_role, boolean) from public, anon;
grant execute on function public.admin_app_stats() to authenticated;
grant execute on function public.admin_list_users(text, int, int) to authenticated;
grant execute on function public.admin_set_role(uuid, public.app_role, boolean) to authenticated;

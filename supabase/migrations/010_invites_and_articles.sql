-- =====================================================================
-- Role invites and educational articles. Run after 009.
--
-- Invites: an admin pre-approves an email for a role. The role is granted
-- automatically once that person signs up AND confirms their email, so an
-- unconfirmed sign-up with someone else's address gets nothing.
--
-- Articles: staff write and schedule short educational articles (Ben's
-- plan: two a week). Published articles are public; reads are counted as
-- anonymous daily totals.
-- =====================================================================

-- ---------- Role invites ----------
create table if not exists public.role_invites (
  email text primary key check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role public.app_role not null,
  invited_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.role_invites enable row level security;
drop policy if exists "admins manage invites" on public.role_invites;
create policy "admins manage invites" on public.role_invites for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
revoke all on public.role_invites from anon;

create or replace function public.apply_role_invite()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare inv public.role_invites;
begin
  if new.email_confirmed_at is null then return new; end if;
  select * into inv from public.role_invites where email = lower(new.email);
  if found then
    insert into public.user_roles (user_id, role) values (new.id, inv.role) on conflict do nothing;
    insert into public.admin_audit_log (actor_id, action, target_user_id, details)
    values (inv.invited_by, 'grant_role', new.id, jsonb_build_object('role', inv.role, 'via', 'invite'));
    delete from public.role_invites where email = inv.email;
  end if;
  return new;
end $$;
revoke execute on function public.apply_role_invite() from public, anon, authenticated;

drop trigger if exists on_auth_user_confirmed_invite on auth.users;
create trigger on_auth_user_confirmed_invite
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.apply_role_invite();

-- Invites for people who already have a confirmed account apply at once.
create or replace function public.admin_invite(_email text, _role public.app_role)
returns text language plpgsql security definer set search_path = public, auth as $$
declare uid uuid; e text := lower(trim(_email));
begin
  perform public.require_admin();
  select id into uid from auth.users where lower(email) = e and email_confirmed_at is not null;
  if uid is not null then
    insert into public.user_roles (user_id, role) values (uid, _role) on conflict do nothing;
    insert into public.admin_audit_log (actor_id, action, target_user_id, details)
    values (auth.uid(), 'grant_role', uid, jsonb_build_object('role', _role));
    return 'granted';
  end if;
  insert into public.role_invites (email, role) values (e, _role)
  on conflict (email) do update set role = excluded.role, invited_by = auth.uid(), created_at = now();
  return 'invited';
end $$;
revoke execute on function public.admin_invite(text, public.app_role) from public, anon;
grant execute on function public.admin_invite(text, public.app_role) to authenticated;

-- Existing audit actions plus 'grant_role' via invite need no schema change.

-- ---------- Articles ----------
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  title text not null check (char_length(title) between 3 and 120),
  summary text check (char_length(summary) <= 240),
  body text not null default '' check (char_length(body) <= 20000),
  cover_image_url text check (cover_image_url is null or cover_image_url ~* '^https?://'),
  conditions text[] not null default '{}',
  author_name text check (char_length(author_name) <= 80),
  is_published boolean not null default false,
  publish_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists articles_feed on public.articles (is_published, publish_at desc);
drop trigger if exists trg_articles_updated on public.articles;
create trigger trg_articles_updated before update on public.articles
  for each row execute function public.set_updated_at();

create table if not exists public.article_stats (
  article_id uuid not null references public.articles(id) on delete cascade,
  day date not null default current_date,
  reads int not null default 0,
  primary key (article_id, day)
);

alter table public.articles enable row level security;
alter table public.article_stats enable row level security;
drop policy if exists "read published articles" on public.articles;
create policy "read published articles" on public.articles for select
  using (is_published and publish_at <= now());
drop policy if exists "staff manage articles" on public.articles;
create policy "staff manage articles" on public.articles for all to authenticated
  using (public.is_marketplace_staff(auth.uid())) with check (public.is_marketplace_staff(auth.uid()));
drop policy if exists "staff read article stats" on public.article_stats;
create policy "staff read article stats" on public.article_stats for select to authenticated
  using (public.is_marketplace_staff(auth.uid()));
grant select on public.articles to anon, authenticated;
revoke all on public.article_stats from anon;

create or replace function public.record_article_read(_article_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.articles where id = _article_id and is_published and publish_at <= now()) then return; end if;
  insert into public.article_stats (article_id, day, reads) values (_article_id, current_date, 1)
  on conflict (article_id, day) do update set reads = public.article_stats.reads + 1;
end $$;
grant execute on function public.record_article_read(uuid) to anon, authenticated;

-- ---------- Starter articles: drafts for the first two weeks ----------
-- Saved as drafts (not visible to users) so the care team can review and
-- publish them. Dates are the next Tuesdays and Fridays at 10:00 US Eastern.
insert into public.articles (slug, title, summary, body, conditions, author_name, is_published, publish_at)
values
('balanced-plate-4-steps', 'Build a balanced plate in 4 steps',
 'A simple way to put together meals that keep you full and energised, without counting every calorie.',
 E'You don''t need a complicated diet to eat well. Most healthy meals come together in four parts.\n\n## 1. Fill half the plate with vegetables\nNon-starchy vegetables such as greens, peppers, broccoli, carrots and tomatoes add fiber, vitamins and volume for very few calories. Frozen vegetables count too.\n\n## 2. A quarter: protein\nFish, chicken, eggs, tofu, beans, lentils or Greek yogurt. Protein keeps you full for longer and helps protect muscle, especially when you are losing weight.\n\n## 3. A quarter: whole-grain or starchy carbs\nBrown rice, oats, whole-wheat bread or pasta, quinoa, or potatoes with the skin on give steady energy.\n\n## 4. A little healthy fat\nA drizzle of olive oil, a few slices of avocado, or a small handful of nuts or seeds help your body absorb vitamins.\n\n## Make it easy\n- Drink water with the meal\n- Eat slowly and stop when you are comfortably full\n- Log your plate in the app to see how it fits your day',
 '{general_wellness,weight_loss,diabetes}', 'Care team', false, '2026-11-03 15:00:00+00'),
('protein-breakfast', 'Why a protein breakfast helps all day',
 'Starting the day with protein can make it easier to manage hunger, energy and focus.',
 E'Many breakfasts are mostly carbs: cereal, toast or a pastry. They are quick, but energy and fullness often fade by mid-morning.\n\n## What protein does\nProtein takes longer to digest, so it helps you stay full. Pairing it with fiber-rich carbs also leads to a steadier rise in blood sugar than carbs alone.\n\n## How much\nAim for about 20 to 30 grams at breakfast. For example:\n- Two eggs and a slice of whole-grain toast (about 20 g)\n- A cup of Greek yogurt with berries and nuts (about 22 g)\n- A tofu scramble with spinach (about 24 g)\n- Cottage cheese with fruit (about 22 g)\n\n## Short on time?\nPrepare overnight oats with Greek yogurt or soy milk, or boil a batch of eggs on Sunday for the week.\n\nIn the app, the coach on your Home screen tells you how much protein you still need today.',
 '{focus,weight_loss,diabetes,general_wellness}', 'Care team', false, '2026-11-06 15:00:00+00'),
('where-salt-hides', 'Salt: where it hides and how to cut back',
 'Most of the salt we eat comes from packaged and restaurant food, not the salt shaker.',
 E'Most adults eat more sodium than recommended. Too much can raise blood pressure, which strains the heart and blood vessels. The general advice is under 2,300 mg a day, about one teaspoon of salt, and lower for many people with high blood pressure.\n\n## Where it hides\nAbout 70% of the sodium we eat comes from packaged and restaurant food. Common sources:\n- Bread and rolls\n- Deli meats, bacon, ham and sausages\n- Pizza, burgers and sandwiches\n- Canned soups and ready meals\n- Savory snacks and sauces such as soy sauce\n\n## Easy swaps\n- Cook with herbs, garlic, citrus, vinegar and spices instead of salt\n- Look for \"low sodium\" on labels: 140 mg or less per serving\n- Rinse canned beans and vegetables\n- Ask for sauces and dressings on the side when eating out\n- Eat more potassium-rich foods such as bananas, potatoes, beans and leafy greens (check with your doctor first if you have kidney disease)\n\nTaste buds adjust: after a few weeks with less salt, food tastes saltier.',
 '{hypertension,heart_health}', 'Care team', false, '2026-11-10 15:00:00+00'),
('fiber-101', 'Fiber 101: the nutrient most of us miss',
 'Fiber helps with fullness, digestion, blood sugar and cholesterol. Here is how to get more of it.',
 E'Most people eat about half the fiber they need. Adults generally need around 25 to 34 grams a day.\n\n## Why it matters\n- Helps you feel full, which supports weight management\n- Slows the rise in blood sugar after meals\n- Soluble fiber, found in oats, beans and barley, helps lower LDL cholesterol\n- Supports regular digestion\n\n## Easy ways to add more\n- Swap white bread, rice and pasta for whole-grain versions\n- Add beans or lentils to soups, salads and stews\n- Keep the skin on potatoes and fruit\n- Snack on fruit, vegetables, nuts or seeds\n- Start the day with oats\n\n## Go slowly\nAdd fiber gradually over a couple of weeks and drink plenty of water, to avoid bloating. If you have IBS, some high-fiber foods such as beans, onions and certain fruits can trigger symptoms; oats, kiwi, carrots and chia are often easier. A dietitian can help you find what works for you.',
 '{diabetes,heart_health,weight_loss,ibs,general_wellness}', 'Care team', false, '2026-11-13 15:00:00+00')
on conflict (slug) do nothing;

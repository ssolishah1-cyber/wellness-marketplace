# Adding features safely

The app is built so new things slot in without breaking existing ones. Each change below lists every place to touch; the tests will fail if one is missed.

## Golden rules

1. **Database changes are new numbered files** in `supabase/migrations/` (`009_…sql`, `010_…sql`). Never edit a file that has already run on the live project. Write them so they can run twice safely (`if not exists`, `drop … if exists`, `on conflict do nothing`). Append them to `supabase/setup_all.sql`.
2. **Every new table gets row-level security** in the same migration: `enable row level security`, owner or staff policies, and `revoke all … from anon` unless the public must read it.
3. **Mirror the rule in demo mode** (`src/lib/demoApi.ts`, `demoNutrition.ts`, `admin.ts`) so the demo, tests and screenshots behave like production.
4. **Run the checks** before pushing: `npm test`, then `npm run build:site`, serve `dist-site` on port 5050 and run `node tests/e2e-launch.mjs` and `node tests/e2e-admin.mjs`. Test a migration on a copy first (Supabase branch, or a local Postgres).
5. **Health data never feeds ads or Market ranking.** Ads are chosen by placement and category only.

## Recipes

### A new health focus
1. Migration: drop and re-add `profiles_conditions_known` with the new id (see `008`).
2. `src/lib/nutrition/types.ts`: add the id to `ConditionId`.
3. `src/lib/nutrition/health.ts`: add a guide to `CONDITIONS`, a `case` in `conditionInsight`, and tag meal ideas in `goodFor` (at least 4).
4. `src/components/health.tsx`: icon in `ICONS` (if new) and a colour in `TINTS`.
5. Optional: ranking in `src/lib/exerciseDb.ts` (`exerciseFit`) and workout notes in `src/lib/fitness.ts` (`conditionNotes`).
6. Tests: `tests/health.test.ts` lists all ids.

### A new meal idea
Add it to `MEAL_IDEAS` in `health.ts`. Keep calories within 8% of protein×4 + carbs×4 + fat×9 (a test checks this), and list only the preferences it truly fits.

### A new ad type
1. Migration: `alter type public.ad_kind add value '…'`, plus any check constraint it needs.
2. `src/lib/types.ts`: `AdKind` and `AD_KIND_LABEL`.
3. Show it: a component in `src/components/ads.tsx`, placed on the right page.
4. Admin form: the kind's description and fields in `src/pages/admin/AdsTab.tsx`.
5. Demo: `validateAd` in `demoApi.ts`.

### A new Market category icon
Add the Lucide icon to `CATEGORY_ICONS` in `src/components/ui.tsx`; it then appears in Admin → Categories.

### Online ad payments (Stripe), later
`marketplace_ads` already has `price_cents` and `payment_status`. Add a Supabase Edge Function that creates a Stripe Checkout session for an ad, and a webhook function that sets `payment_status = 'paid'` and `is_active = true` when payment succeeds. Sell ads on the website, not inside the phone app, so Apple and Google in-app purchase rules don't apply (businesses buying advertising is a business service, but keep checkout on the web to be safe).

### A new admin statistic
Add it to `admin_app_stats()` in a new migration (keep it a total; hide anything under 5 that concerns health), to `AppStats` in `src/lib/admin.ts` (live and demo), and show it in `AdminOverview.tsx`.

### Refreshing the exercise library
Change the commit in `scripts/fetch-exercises.mjs` and `src/lib/exerciseDb.ts`, run `node scripts/fetch-exercises.mjs`, then `npm test` (it checks every plan exercise still links to a real entry).

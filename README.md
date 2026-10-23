# Wellness Marketplace module

The Market tab for the AI nutrition app. It promotes TriggerMD and XIMMD as clearly labelled sponsored partners and lets approved wellness businesses advertise. Every listing is reviewed before it goes live.

**Stack:** React 18 · Vite · TypeScript · Tailwind · React Query · Supabase. This is the same stack Lovable uses.

**Blueprint:** see `Wellness-Marketplace-Blueprint.pdf` for the 4-week plan (18 Oct to 14 Nov 2026).

## Run it

```bash
npm install
npm run dev        # http://localhost:8080/market
```

If no Supabase keys are set, the app runs in **demo mode** with sample data. Use the bar at the top to switch between the Visitor, App user, Vendor and Admin views and try every flow. Demo data resets when you reload the page.

To use a real Supabase project:

1. Run `supabase/migrations/001_marketplace.sql` in the Supabase SQL editor.
2. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Make yourself an admin:
   `insert into user_roles (user_id, role) values ('<your auth user id>', 'admin');`

## Adding it to the Lovable nutrition app

**Option A: copy the code (recommended once the Lovable project is synced to GitHub)**
1. Copy `src/lib`, `src/components`, `src/pages` and `src/pages/admin` into the Lovable repo.
2. In `src/lib/api.ts`, import the project's existing client from `@/integrations/supabase/client` and delete this repo's `src/integrations` folder.
3. Add the `/market*` and `/admin/marketplace` routes from `src/App.tsx` to the existing router, and add **Market** to the bottom navigation. `Layout.tsx` and `Placeholder.tsx` are only stand-ins here, so don't copy them.
4. Copy the `.card`, `.btn-*`, `.input`, `.label` and `.badge` classes from `src/index.css`, or swap them for shadcn components.

**Option B: let Lovable build it.** Run the migration, then paste `LOVABLE_PROMPT.md` into Lovable.

## How the rules are enforced

The database enforces the rules itself, not just the screens (see the migration):

| Rule | Where |
|---|---|
| The public sees only published listings that haven't expired | Row Level Security on `marketplace_listings` |
| Vendors can set only Draft or Pending Review, and can't mark listings as sponsored or price-verified | `enforce_listing_workflow` trigger |
| A vendor's edit to a live listing sends it back to review | `enforce_listing_workflow` trigger |
| Vendors can't approve their own business account | `enforce_vendor_status` trigger |
| Every status change is recorded | `log_listing_status_change` → `marketplace_reviews` |
| Clicks are stored as anonymous daily totals only | `record_marketplace_click()`; no direct writes to the table |
| Inquiries need consent and a published listing | Table check and RLS policy |

Health, meal and weight data are never read by this module.

## Project layout

```
supabase/migrations/001_marketplace.sql   tables, enums, RLS, triggers, seed data
src/lib/types.ts                          types that mirror the schema
src/lib/api.ts                            data-layer interface (Supabase or demo)
src/lib/supabaseApi.ts                    Supabase implementation
src/lib/demoApi.ts, demoData.ts           in-memory demo that applies the same rules
src/pages/                                Market home, category, brand, listing, vendor portal
src/pages/admin/                          review console and click chart
src/components/                           layout, listing form, shared UI
screenshots/                              screenshots from the end-to-end test
```

## Before launch

- Replace the sample TriggerMD and XIMMD copy with verified descriptions, prices, ingredients and evidence. Brand details can be edited from Admin → Brands.
- Get legal and advertising sign-off on telehealth listings and disclaimers.
- Schedule `select expire_marketplace_listings();` to run daily with pg_cron.
- Add a Supabase Storage bucket for image uploads. Image URLs work today.

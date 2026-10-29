# Admin guide (for Dr. Ben)

Open the app, sign in with an admin account, and tap **Admin** at the top. On a phone it's under **Profile → Admin panel**.

| Tab | What it's for |
|---|---|
| **Overview** | Sign-ups, setup completion, active clients, meals and workouts logged, items waiting for review, health-focus totals |
| **Clients & roles** | Every client: name, email, health focus, last logged day, days logged in the last 30. Tap a client for their full record. Make someone a reviewer or admin. Activity log |
| **Review queue** | New and edited listings waiting for approval |
| **All listings** | Every listing in every status. **New listing** adds one directly |
| **Ads** | Featured listings, Market banners, category sponsors: create, schedule, pause, see views and clicks |
| **Vendors** | Approve or suspend businesses that applied |
| **Brands** | TriggerMD, XIMMD and partner brands: edit, feature, **New brand** |
| **Categories** | Add, rename, reorder, hide Market categories |
| **Market analytics** | Clicks and questions per listing |

## Checking a client

1. **Clients & roles** → search by name or email → tap the client.
2. You'll see 30-day totals (days logged, average calories and protein, workouts, water), current/start/goal weight, health focus and food preferences, a weight chart, daily calories, the last 14 days of food, workouts and questions they sent to providers.
3. **Food log (CSV)** opens in Excel or Google Sheets; **Everything (JSON)** is the complete record.
4. **CSV** next to the search box downloads the whole client list.

Every time an admin opens a client's record it's saved in the **Activity log** (bottom of Clients & roles). Clients agreed to care-team access at sign-up, and the Privacy Policy explains it. Use client data only to support that client.

## Adding things to the Market

- **A listing (product, service, program, provider, course or event):** All listings → **New listing** → fill in → save → open it → **Publish**. Vendors can also add their own from the Vendor portal; theirs go to the Review queue first.
- **A brand:** Brands → **New brand**. Tick "Affiliated" for brands you own, and write the disclosure (shown to users).
- **A category:** Categories → **New category** → name, description, icon. Use the arrows to reorder; the eye icon hides it.
- **A business account:** businesses apply from Market → "Apply to list"; approve them in **Vendors**.

## Selling and running ads

There are three kinds, all labelled **Sponsored** in the app:

| Kind | Where it shows | Needs |
|---|---|---|
| **Featured listing** | "Featured" row at the top of the Market, and first on its category page | A published listing |
| **Market home banner** | Large rotating banner at the top of the Market | A wide image (about 1200 × 500) |
| **Category sponsor** | Card at the top of one category page | A category |

1. Agree the price and dates with the business, and invoice them (online card payment can be added later).
2. **Ads → New ad** → choose the kind → title, advertiser → where it goes (a listing, a brand page or their website) → image → start and end dates → price and payment status → **Save ad**.
3. It goes live on the start date and stops after the end date. **Pause** stops it at any time.
4. Each ad shows its views, clicks and click rate. Share these with the advertiser as their report.

Rules the app enforces: ads are never targeted using anyone's health data (only by position and category); a featured listing disappears automatically if its listing is unpublished or expires; links must start with https://.

## Roles

- **Admin:** everything above, including client records. Give this only to people who need client data.
- **Reviewer:** Market only (review queue, listings, ads, vendors, brands, categories, analytics). No client data.
- You can't remove your own admin role, so the panel can't be locked by accident.

The very first admin is set once in Supabase (see `docs/WHITE_LABEL.md`, step 6). After that, use Clients & roles.

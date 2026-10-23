# Lovable prompt — Wellness Marketplace

**Before pasting:** run `supabase/migrations/001_marketplace.sql` and then `002_storage_links_expiry.sql` in your Supabase SQL editor
(or paste it into Lovable and ask it to apply it as a migration). Then paste everything
below the line into Lovable.

---

Add a **Wellness Marketplace** module to this existing nutrition app. Do not create a new app, do not change existing nutrition, meal or progress features, and do not change existing database tables. The Supabase tables for this module already exist: `marketplace_categories`, `marketplace_brands`, `marketplace_vendors`, `marketplace_listings`, `marketplace_reviews`, `marketplace_clicks`, `marketplace_inquiries`, plus `user_roles` with the `has_role()` and `is_marketplace_staff()` functions. Use these exactly as they are and regenerate the Supabase types.

## Navigation
Update the bottom navigation (mobile) / top navigation (desktop) to: **Home, Meals, Progress, Market, Profile**. Market uses a shopping-bag icon and routes to `/market`.

## Pages

**1. `/market`: Marketplace home**
- Header "Wellness Marketplace" with a search bar (searches published listing titles and summaries).
- **"Featured Partners · Sponsored"** section at the top: cards for brands where `is_featured = true` (TriggerMD, XIMMD). Each card shows the logo, name, tagline, a small "Sponsored" badge, and the brand's `affiliation_disclosure` in small text. Clicking opens the brand page.
- Category grid from `marketplace_categories` (ordered by `display_order`, lucide icon from the `icon` column).
- "Latest listings" grid of published listings.
- Footer note: "Marketplace listings are separate from your nutrition recommendations. Your meal plans and progress data are never used to choose what you see here."

**2. `/market/category/:slug`**: listings in that category, with filters for listing type and price range and sorting by newest or price.

**3. `/market/brand/:slug`: brand page** (used for TriggerMD and XIMMD)
- Logo, description, website button ("Visit TriggerMD" / "Visit XIMMD"), and the affiliation disclosure in a highlighted box.
- All published listings for that brand.

**4. `/market/listing/:slug`: listing detail.** Show a section only if its field has a value:
- Image gallery, title, brand link, category, and a "Sponsored" badge if `is_sponsored`.
- Price: `price_cents` formatted in `currency` plus `price_note`. Show the price only if `price_verified` is true; otherwise show "See provider for current pricing".
- Services: How it works, Service areas, Eligibility, "Must be {min_age}+".
- Products: Ingredients/specifications, Shipping, Refund policy.
- "Supporting evidence" section: `evidence_summary` plus the `evidence_urls` links.
- Disclaimer box. If `is_regulated` is true, always also show: "This service is provided by a licensed third party. Eligibility is determined by a clinician. This app does not provide medical advice."
- Primary CTA button using `cta_label` that opens `destination_url` in a new tab with `rel="noopener noreferrer sponsored"`. Before opening, call `supabase.rpc('record_marketplace_click', { _listing_id, _source })`. Do not send any user id or health data.
- "Ask a question" button (signed-in users only) opens a form: name, email, message (max 2000 characters) and a **required** checkbox "I agree to share my name, email and message with this business." Insert into `marketplace_inquiries`. Never attach meal, weight or health data.

**5. `/market/vendor`: vendor portal** (signed-in users)
- If the user has no vendor row: an "Advertise your wellness business" application form (business name, contact email, website, description, credentials) that inserts into `marketplace_vendors`. Show "Application pending review".
- If the vendor is approved: a dashboard listing their listings with status badges (Draft, Pending Review, Approved, Published, Rejected, Expired), a create/edit listing form with all listing fields, a "Submit for review" button (sets status to `pending_review`), the rejection reason if rejected, inquiries received, and click counts per listing from `marketplace_clicks`.
- Vendors cannot publish or mark listings as sponsored; the database enforces this. Show a note: "Editing a live listing sends it back for review."

**6. `/admin/marketplace`: review console** (only visible when `is_marketplace_staff()` is true; hide the link otherwise)
- Tabs: **Review queue** (listings with `pending_review`), **All listings**, **Vendors**, **Brands**, **Categories**, **Analytics**.
- In the review queue, open a listing with every field visible, plus a checklist: "Claims supported by evidence", "Pricing verified", "Disclaimers present", "Legal/advertising review complete (required if regulated)". Actions: Approve, Publish, Reject (requires a reason, saved to `rejection_reason`), Request changes (sets status back to `draft`). Reviewers can add notes as rows in `marketplace_reviews` with a `review_type`. Show the full review history timeline for each listing.
- Admins can create listings directly for the owned brands, toggle `is_sponsored`, `price_verified`, `is_featured`, and set `expires_at`.
- Vendors tab: approve or suspend vendor applications.
- Analytics: clicks per listing per day (a simple chart) and inquiry counts.
- An "Expire outdated listings" button that calls `supabase.rpc('expire_marketplace_listings')`.

## Rules (do not break these)
- Only listings with status `published` appear publicly. Never filter or rank listings using the user's nutrition, weight, goals or health data.
- Never show marketplace listings inside meal plans, AI nutrition recommendations or progress screens. The AI nutrition assistant must not recommend marketplace products or TriggerMD services.
- Every affiliated or sponsored item must show a visible "Sponsored" or "Affiliated" label.
- No checkout or payments in the app. All purchases happen on the external site.
- Do not list prescription medications as products. Telehealth listings describe clinical services only.

## Design
Match the app's existing theme, fonts and components (shadcn/ui). Use mobile-first card layouts, skeleton loaders, and empty states such as "No listings in this category yet". Add the pages to the router and keep all existing routes working.

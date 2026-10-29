import type { Ad, AdStat, Brand, Category, ClickRow, Listing, Review, Vendor } from "./types";

// Sample data for demo mode only. Brand copy is placeholder text and must be
// replaced with verified descriptions, prices and evidence before launch.

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();
const dayStr = (n: number) => daysAgo(n).slice(0, 10);

export const DEMO_USERS = {
  member: { id: "user-member", email: "member@example.com" },
  vendor: { id: "user-vendor", email: "coach@greenplate.example" },
  admin: { id: "user-admin", email: "admin@example.com" },
};

export const demoCategories: Category[] = [
  ["telehealth", "Telehealth", "Virtual consultations and approved medical programs", "stethoscope"],
  ["wellness-products", "Wellness Products", "Eligible supplements and wellness merchandise", "package"],
  ["weight-management", "Weight Management", "Educational programs, coaching and meal-planning", "scale"],
  ["fitness", "Fitness", "Workout memberships, equipment and digital courses", "dumbbell"],
  ["books-education", "Books & Education", "Nutrition guides, health books and resources", "book-open"],
  ["providers", "Wellness Providers", "Verified dietitians, nutrition coaches and professionals", "badge-check"],
  ["events", "Events & Programs", "Wellness seminars, online workshops and health events", "calendar"],
].map(([slug, name, description, icon], i) => ({
  id: `cat-${slug}`, slug, name, description, icon, display_order: i + 1, is_active: true,
}));

export const demoVendors: Vendor[] = [
  {
    id: "vendor-greenplate", owner_user_id: DEMO_USERS.vendor.id, business_name: "GreenPlate Coaching",
    contact_email: DEMO_USERS.vendor.email, website_url: "https://example.com", description: "Online nutrition coaching.",
    credentials: "Registered Dietitian (sample)", status: "approved", verified_at: daysAgo(20), created_at: daysAgo(30),
  },
  {
    id: "vendor-fitloop", owner_user_id: "user-other", business_name: "FitLoop Studio",
    contact_email: "hello@fitloop.example", website_url: "https://example.com", description: "Live-streamed workout classes.",
    credentials: null, status: "pending", verified_at: null, created_at: daysAgo(2),
  },
];

export const demoBrands: Brand[] = [
  {
    id: "brand-triggermd", vendor_id: null, slug: "triggermd", name: "TriggerMD",
    tagline: "Virtual care, consultations and eligible medical services",
    description: "Sample description — replace with TriggerMD's verified service overview, service areas and clinical review information.",
    logo_url: null, website_url: "https://example.com/triggermd", is_owned_brand: true, is_featured: true,
    affiliation_disclosure: "TriggerMD is affiliated with the owner of this app. We may benefit if you use its services.", is_active: true,
  },
  {
    id: "brand-ximmd", vendor_id: null, slug: "ximmd", name: "XIMMD",
    tagline: "Wellness products and approved offers",
    description: "Sample description — replace with XIMMD's verified product information, specifications and supporting evidence.",
    logo_url: null, website_url: "https://example.com/ximmd", is_owned_brand: true, is_featured: true,
    affiliation_disclosure: "XIMMD is affiliated with the owner of this app. We may benefit from purchases.", is_active: true,
  },
  {
    id: "brand-greenplate", vendor_id: "vendor-greenplate", slug: "greenplate", name: "GreenPlate Coaching",
    tagline: "Practical nutrition coaching", description: "Independent coaching business (sample vendor).",
    logo_url: null, website_url: "https://example.com", is_owned_brand: false, is_featured: false,
    affiliation_disclosure: null, is_active: true,
  },
];

const base: Omit<Listing, "id" | "slug" | "title" | "category_id"> = {
  vendor_id: null, brand_id: null, summary: null, description: null, listing_type: "product",
  price_cents: null, currency: "USD", price_note: null, price_verified: false, image_urls: [],
  destination_url: "https://example.com", cta_label: "Learn more", service_areas: [], how_it_works: null,
  eligibility: null, min_age: null, ingredients_specs: null, shipping_info: null, refund_policy: null,
  evidence_summary: null, evidence_urls: [], disclaimer: null, is_sponsored: false, is_regulated: false,
  event_starts_at: null, event_location: null, status: "published", rejection_reason: null,
  published_at: daysAgo(5), expires_at: null, created_by: null, created_at: daysAgo(10), updated_at: daysAgo(5),
};

export const demoListings: Listing[] = [
  {
    ...base, id: "l-tmd-consult", slug: "triggermd-virtual-consultation", title: "Virtual wellness consultation",
    category_id: "cat-telehealth", brand_id: "brand-triggermd", listing_type: "service",
    summary: "Sample telehealth listing — book a virtual consultation with a licensed clinician.",
    description: "Replace with TriggerMD's verified service description.",
    how_it_works: "1. Complete an online intake form.\n2. A licensed clinician reviews your information.\n3. Meet by video at a time that suits you.",
    service_areas: ["Sample region A", "Sample region B"], eligibility: "Eligibility is determined by the clinician.", min_age: 18,
    price_cents: 4900, price_note: "per consultation (sample)", price_verified: false,
    cta_label: "Visit TriggerMD", is_sponsored: true, is_regulated: true,
    disclaimer: "Services are provided by independent licensed clinicians. Not for emergencies.",
  },
  {
    ...base, id: "l-ximmd-starter", slug: "ximmd-wellness-starter-kit", title: "Wellness starter kit",
    category_id: "cat-wellness-products", brand_id: "brand-ximmd", listing_type: "product",
    summary: "Sample product listing — replace with a verified XIMMD product.",
    ingredients_specs: "List verified ingredients / specifications here.",
    shipping_info: "Shipping details (sample).", refund_policy: "Refund policy (sample).",
    evidence_summary: "Add supporting evidence for any product claims before publishing.",
    price_cents: 3500, price_verified: true, cta_label: "View product", is_sponsored: true,
    disclaimer: "These statements have not been evaluated by a regulator. Not intended to diagnose, treat, cure or prevent any disease.",
  },
  {
    ...base, id: "l-gp-coaching", slug: "greenplate-12-week-coaching", title: "12-week nutrition coaching",
    category_id: "cat-providers", brand_id: "brand-greenplate", vendor_id: "vendor-greenplate", listing_type: "provider",
    summary: "Weekly video check-ins and a personalised meal-planning framework.",
    how_it_works: "Weekly 30-minute calls, messaging support, and a habit tracker.",
    service_areas: ["Online"], price_cents: 29900, price_note: "for 12 weeks", price_verified: true,
    created_by: DEMO_USERS.vendor.id,
  },
  {
    ...base, id: "l-gp-guide", slug: "greenplate-meal-prep-guide", title: "Meal-prep made simple (e-book)",
    category_id: "cat-books-education", brand_id: "brand-greenplate", vendor_id: "vendor-greenplate", listing_type: "education",
    summary: "A 60-page guide to batch cooking balanced meals.", price_cents: 1200, price_verified: true,
    created_by: DEMO_USERS.vendor.id,
  },
  {
    ...base, id: "l-gp-workshop", slug: "greenplate-label-reading-workshop", title: "Label-reading workshop (online)",
    category_id: "cat-events", brand_id: "brand-greenplate", vendor_id: "vendor-greenplate", listing_type: "event",
    summary: "A live 90-minute session on reading nutrition labels.",
    event_starts_at: new Date(now.getTime() + 14 * 86400000).toISOString(), event_location: "Online (Zoom)",
    price_cents: 0, price_verified: true, status: "pending_review", published_at: null, created_by: DEMO_USERS.vendor.id,
  },
  {
    ...base, id: "l-gp-draft", slug: "greenplate-family-plan", title: "Family meal-planning plan",
    category_id: "cat-weight-management", brand_id: "brand-greenplate", vendor_id: "vendor-greenplate", listing_type: "program",
    summary: "Draft listing.", status: "draft", published_at: null, created_by: DEMO_USERS.vendor.id,
  },
  {
    ...base, id: "l-fit-app", slug: "home-strength-program", title: "8-week home strength program",
    category_id: "cat-fitness", listing_type: "program",
    summary: "Video-guided workouts using only bodyweight and resistance bands.", price_cents: 4900, price_verified: true,
  },
];

export const demoReviews: Review[] = [
  { id: "r1", listing_id: "l-gp-coaching", reviewer_id: null, review_type: "status_change", from_status: null, to_status: "draft", notes: null, created_at: daysAgo(10) },
  { id: "r2", listing_id: "l-gp-coaching", reviewer_id: DEMO_USERS.vendor.id, review_type: "status_change", from_status: "draft", to_status: "pending_review", notes: null, created_at: daysAgo(8) },
  { id: "r3", listing_id: "l-gp-coaching", reviewer_id: DEMO_USERS.admin.id, review_type: "advertising", from_status: null, to_status: null, notes: "Credentials verified; claims are reasonable.", created_at: daysAgo(6) },
  { id: "r4", listing_id: "l-gp-coaching", reviewer_id: DEMO_USERS.admin.id, review_type: "status_change", from_status: "pending_review", to_status: "published", notes: null, created_at: daysAgo(5) },
];

export const demoClicks: ClickRow[] = demoListings
  .filter((l) => l.status === "published")
  .flatMap((l, i) =>
    Array.from({ length: 7 }, (_, d) => ({
      listing_id: l.id, day: dayStr(6 - d), source: "market", click_count: ((i + 2) * (d + 3)) % 17 + 2,
    })),
  );

// Sample ads. Real ads are created by staff in Admin → Ads.
const bannerSvg = (from: string, to: string) =>
  "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="1200" height="500" fill="url(#g)"/><circle cx="1020" cy="120" r="220" fill="#ffffff" opacity=".12"/><circle cx="1120" cy="430" r="140" fill="#ffffff" opacity=".1"/></svg>`);

const adBase = { body: null, image_url: null, listing_id: null, brand_id: null, category_id: null, link_url: null, vendor_id: null,
  starts_at: dayStr(10) + "T00:00:00Z", ends_at: null, is_active: true, priority: 0, price_cents: null, payment_status: "complimentary" as const, notes: null, created_at: dayStr(10) + "T00:00:00Z" };

export const demoAds: Ad[] = [
  { ...adBase, id: "ad-tmd-banner", kind: "home_banner", title: "See a clinician from home", body: "Virtual consultations with licensed clinicians. Sample banner.",
    image_url: bannerSvg("#1f62a0", "#13603a"), brand_id: "brand-triggermd", advertiser: "TriggerMD", priority: 10 },
  { ...adBase, id: "ad-gp-featured", kind: "featured_listing", title: "12-week nutrition coaching", listing_id: "l-gp-coaching",
    advertiser: "GreenPlate Coaching", vendor_id: "vendor-greenplate", price_cents: 15000, payment_status: "paid" },
  { ...adBase, id: "ad-fitness-sponsor", kind: "category_sponsor", title: "Train at home, no gym needed", body: "Sample category sponsor.",
    listing_id: "l-fit-app", category_id: "cat-fitness", advertiser: "Sample fitness partner" },
];

export const demoAdStats: AdStat[] = demoAds.flatMap((a, i) =>
  Array.from({ length: 7 }, (_, d) => ({ ad_id: a.id, day: dayStr(6 - d), views: 40 + ((i + 3) * (d + 5)) % 37, clicks: 2 + ((i + 1) * (d + 2)) % 7 })));

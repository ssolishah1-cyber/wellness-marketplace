import type { MarketApi } from "./api";
import {
  DEMO_USERS, demoAdStats, demoAds, demoBrands, demoCategories, demoClicks, demoListings, demoReviews, demoVendors,
} from "./demoData";
import { slugify } from "./supabaseApi";
import type { Ad, Inquiry, LiveAd, Listing, ListingStatus, Review, Vendor, Viewer } from "./types";

// In-memory stand-in for Supabase so the module can be previewed without a
// backend. It applies the same rules as the database triggers and RLS policies.

export type DemoPersona = "visitor" | "member" | "vendor" | "admin";

const PERSONA_KEY = "market-demo-persona";
let persona: DemoPersona = readPersona();
const listeners = new Set<() => void>();

function readPersona(): DemoPersona {
  try {
    const v = localStorage.getItem(PERSONA_KEY);
    if (v === "visitor" || v === "member" || v === "vendor" || v === "admin") return v;
  } catch { /* storage unavailable */ }
  return "member";
}

export function getDemoPersona() { return persona; }
export function setDemoPersona(p: DemoPersona) {
  persona = p;
  try { localStorage.setItem(PERSONA_KEY, p); } catch { /* ignore */ }
  listeners.forEach((fn) => fn());
}
export function onDemoPersonaChange(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

const db = {
  categories: structuredClone(demoCategories),
  vendors: structuredClone(demoVendors),
  brands: structuredClone(demoBrands),
  listings: structuredClone(demoListings),
  reviews: structuredClone(demoReviews),
  clicks: structuredClone(demoClicks),
  inquiries: [] as Inquiry[],
  ads: structuredClone(demoAds),
  adStats: structuredClone(demoAdStats),
};

/** Same rules as list_live_ads() in migration 008. */
function liveAds(): LiveAd[] {
  const now = nowIso();
  return db.ads
    .filter((a) => a.is_active && a.starts_at <= now && (!a.ends_at || a.ends_at > now))
    .map((a) => ({ a, l: db.listings.find((x) => x.id === a.listing_id), b: db.brands.find((x) => x.id === a.brand_id) }))
    .filter(({ a, l, b }) => (!a.listing_id || (l && isLive(l))) && (!a.brand_id || b?.is_active))
    .sort((x, y) => y.a.priority - x.a.priority || y.a.starts_at.localeCompare(x.a.starts_at))
    .map(({ a, l, b }) => ({
      id: a.id, kind: a.kind, title: a.title, body: a.body, image_url: a.image_url, listing_id: a.listing_id, listing_slug: l?.slug ?? null,
      brand_id: a.brand_id, brand_slug: b?.slug ?? null, category_id: a.category_id, link_url: a.link_url, advertiser: a.advertiser, priority: a.priority,
    }));
}

const httpOk = (u: string | null | undefined) => !u || /^https?:\/\//i.test(u);

function validateAd(a: Ad) {
  if (!a.title.trim() || a.title.length > 80) throw new Error("Give the ad a title (up to 80 characters).");
  if (!a.advertiser.trim()) throw new Error("Who is the advertiser?");
  if (!a.listing_id && !a.brand_id && !a.link_url) throw new Error("Choose where the ad goes: a listing, a brand or a web link.");
  if (a.kind === "featured_listing" && !a.listing_id) throw new Error("A featured listing ad needs a listing.");
  if (a.kind === "category_sponsor" && !a.category_id) throw new Error("A category sponsor ad needs a category.");
  if (a.kind === "home_banner" && !a.image_url) throw new Error("A banner ad needs an image.");
  if (!httpOk(a.link_url) || (a.image_url && !a.image_url.startsWith("data:") && !httpOk(a.image_url))) throw new Error("Links must start with https://");
  if (a.ends_at && a.ends_at <= a.starts_at) throw new Error("The end date must be after the start date.");
}

const uid = () => Math.random().toString(36).slice(2, 10);
const nowIso = () => new Date().toISOString();
const delay = <T>(v: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 120));

/** The signed-in demo user's id, or null for the Visitor persona. */
export function getDemoUserId(): string | null {
  return viewer().userId;
}

function viewer(): Viewer {
  if (persona === "visitor") return { userId: null, email: null, isStaff: false, isAdmin: false };
  const u = DEMO_USERS[persona];
  return { userId: u.id, email: u.email, isStaff: persona === "admin", isAdmin: persona === "admin" };
}

function isLive(l: Listing) {
  return l.status === "published" && (!l.expires_at || new Date(l.expires_at) > new Date());
}

function myApprovedVendorIds(): string[] {
  const v = viewer();
  return db.vendors.filter((x) => x.owner_user_id === v.userId && x.status === "approved").map((x) => x.id);
}

function canSee(l: Listing) {
  return isLive(l) || viewer().isStaff || (l.vendor_id !== null && myApprovedVendorIds().includes(l.vendor_id));
}

function logStatus(l: Listing, from: ListingStatus | null) {
  db.reviews.push({
    id: uid(), listing_id: l.id, reviewer_id: viewer().userId, review_type: "status_change",
    from_status: from, to_status: l.status, notes: l.status === "rejected" ? l.rejection_reason : null, created_at: nowIso(),
  });
}

function requireStaff() {
  if (!viewer().isStaff) throw new Error("Only marketplace reviewers can do this.");
}

export const demoApi: MarketApi = {
  getViewer: () => delay(viewer()),

  listCategories: () => delay(db.categories.filter((c) => c.is_active).sort((a, b) => a.display_order - b.display_order)),

  listBrands: (opts) => delay(db.brands.filter((b) => b.is_active && (!opts?.featuredOnly || b.is_featured))),

  getBrand: (slug) => delay(db.brands.find((b) => b.slug === slug && b.is_active) ?? null),

  listPublishedListings: (f) => {
    const q = f?.q?.toLowerCase().trim();
    return delay(
      db.listings
        .filter(isLive)
        .filter((l) => !f?.categoryId || l.category_id === f.categoryId)
        .filter((l) => !f?.brandId || l.brand_id === f.brandId)
        .filter((l) => !q || l.title.toLowerCase().includes(q) || (l.summary ?? "").toLowerCase().includes(q))
        .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? "")),
    );
  },

  getListing: (slug) => {
    const l = db.listings.find((x) => x.slug === slug);
    return delay(l && canSee(l) ? l : null);
  },

  recordClick: async (listingId, source) => {
    const l = db.listings.find((x) => x.id === listingId);
    if (!l || l.status !== "published") return;
    const day = nowIso().slice(0, 10);
    const row = db.clicks.find((c) => c.listing_id === listingId && c.day === day && c.source === source);
    if (row) row.click_count++;
    else db.clicks.push({ listing_id: listingId, day, source, click_count: 1 });
  },

  listLiveAds: async () => delay(liveAds()),

  recordAdEvent: async (adId, event) => {
    if (!liveAds().some((a) => a.id === adId)) return;
    const day = nowIso().slice(0, 10);
    let row = db.adStats.find((s) => s.ad_id === adId && s.day === day);
    if (!row) db.adStats.push(row = { ad_id: adId, day, views: 0, clicks: 0 });
    if (event === "view") row.views++; else row.clicks++;
  },

  sendInquiry: async (input) => {
    const v = viewer();
    if (!v.userId) throw new Error("Please sign in to send an inquiry.");
    if (!input.consent_to_share) throw new Error("Consent is required.");
    const l = db.listings.find((x) => x.id === input.listing_id);
    if (!l || !isLive(l)) throw new Error("This listing is not available.");
    db.inquiries.push({ ...input, id: uid(), user_id: v.userId, status: "new", created_at: nowIso() });
  },

  uploadImage: async (file) => {
    if (!viewer().userId) throw new Error("Please sign in first.");
    if (file.size > 5 * 1024 * 1024) throw new Error("Images must be 5 MB or smaller.");
    // Demo only: keep the image in memory as a data URL.
    return new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error("Could not read the image."));
      r.readAsDataURL(file);
    });
  },

  getMyVendor: () => {
    const v = viewer();
    return delay(v.userId ? db.vendors.find((x) => x.owner_user_id === v.userId) ?? null : null);
  },

  applyAsVendor: async (input) => {
    const v = viewer();
    if (!v.userId) throw new Error("Please sign in first.");
    const vendor: Vendor = {
      id: uid(), owner_user_id: v.userId, business_name: input.business_name, contact_email: input.contact_email,
      website_url: input.website_url ?? null, description: input.description ?? null, credentials: input.credentials ?? null,
      status: "pending", verified_at: null, created_at: nowIso(),
    };
    db.vendors.push(vendor);
    return delay(vendor);
  },

  listVendorListings: (vendorId) =>
    delay(db.listings.filter((l) => l.vendor_id === vendorId && canSee(l)).sort((a, b) => b.updated_at.localeCompare(a.updated_at))),

  saveListing: async (input) => {
    const v = viewer();
    const staff = v.isStaff;
    const { id, ...fields } = input;
    const existing = id ? db.listings.find((l) => l.id === id) : undefined;

    if (!staff) {
      const vendorId = existing?.vendor_id ?? fields.vendor_id ?? null;
      if (!vendorId || !myApprovedVendorIds().includes(vendorId)) throw new Error("You can only edit your own listings.");
    }

    if (!existing) {
      const l: Listing = {
        vendor_id: null, brand_id: null, summary: null, description: null, listing_type: "product", price_cents: null,
        currency: "USD", price_note: null, price_verified: false, image_urls: [], destination_url: null, cta_label: "Learn more",
        service_areas: [], how_it_works: null, eligibility: null, min_age: null, ingredients_specs: null, shipping_info: null,
        refund_policy: null, evidence_summary: null, evidence_urls: [], disclaimer: null, is_sponsored: false, is_regulated: false,
        event_starts_at: null, event_location: null, status: "draft", rejection_reason: null, published_at: null, expires_at: null,
        ...fields,
        id: uid(), slug: fields.slug || slugify(fields.title), created_by: v.userId, created_at: nowIso(), updated_at: nowIso(),
      };
      if (!staff) {
        if (l.status !== "draft" && l.status !== "pending_review") l.status = "draft";
        l.is_sponsored = false;
        l.price_verified = false;
        l.published_at = null;
      } else if (l.status === "published") {
        l.published_at = nowIso();
      }
      db.listings.push(l);
      logStatus(l, null);
      return delay(l);
    }

    const before = existing.status;
    const next: Listing = { ...existing, ...fields, id: existing.id, updated_at: nowIso() };
    if (!staff) {
      next.vendor_id = existing.vendor_id;
      next.is_sponsored = existing.is_sponsored;
      next.price_verified = existing.price_verified;
      next.rejection_reason = existing.rejection_reason;
      if (next.status !== before && next.status !== "draft" && next.status !== "pending_review") {
        throw new Error(`Only marketplace reviewers can set status to ${next.status}`);
      }
      if ((before === "approved" || before === "published") && next.status === before) next.status = "pending_review";
      if (next.status !== "published") next.published_at = null;
    } else if (next.status === "published" && !next.published_at) {
      next.published_at = nowIso();
    }
    Object.assign(existing, next);
    if (existing.status !== before) logStatus(existing, before);
    return delay(existing);
  },

  deleteListing: async (id) => {
    const l = db.listings.find((x) => x.id === id);
    if (!l) return;
    const own = l.vendor_id !== null && myApprovedVendorIds().includes(l.vendor_id);
    if (!viewer().isStaff && !(own && (l.status === "draft" || l.status === "rejected"))) {
      throw new Error("Only drafts and rejected listings can be deleted.");
    }
    db.listings = db.listings.filter((x) => x.id !== id);
  },

  listInquiries: (ids) => {
    const v = viewer();
    const mine = new Set(db.listings.filter((l) => l.vendor_id && myApprovedVendorIds().includes(l.vendor_id)).map((l) => l.id));
    return delay(
      db.inquiries
        .filter((i) => v.isStaff || mine.has(i.listing_id) || i.user_id === v.userId)
        .filter((i) => !ids || ids.includes(i.listing_id))
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    );
  },

  listClicks: (ids) => {
    const v = viewer();
    const mine = new Set(db.listings.filter((l) => l.vendor_id && myApprovedVendorIds().includes(l.vendor_id)).map((l) => l.id));
    return delay(db.clicks.filter((c) => (v.isStaff || mine.has(c.listing_id)) && (!ids || ids.includes(c.listing_id))));
  },

  listAllListings: async (status) => {
    requireStaff();
    return delay(db.listings.filter((l) => !status || l.status === status).sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
  },

  setListingStatus: async (id, status, reason) => {
    requireStaff();
    const l = db.listings.find((x) => x.id === id);
    if (!l) throw new Error("Listing not found");
    const before = l.status;
    l.status = status;
    if (status === "rejected") l.rejection_reason = reason ?? null;
    l.published_at = status === "published" ? l.published_at ?? nowIso() : null;
    l.updated_at = nowIso();
    if (before !== status) logStatus(l, before);
  },

  listReviews: (listingId) => {
    const v = viewer();
    const l = db.listings.find((x) => x.id === listingId);
    const own = l?.vendor_id ? myApprovedVendorIds().includes(l.vendor_id) : false;
    const rows: Review[] = v.isStaff || own ? db.reviews.filter((r) => r.listing_id === listingId) : [];
    return delay([...rows].sort((a, b) => b.created_at.localeCompare(a.created_at)));
  },

  addReviewNote: async (listingId, type, notes) => {
    requireStaff();
    db.reviews.push({
      id: uid(), listing_id: listingId, reviewer_id: viewer().userId, review_type: type,
      from_status: null, to_status: null, notes, created_at: nowIso(),
    });
  },

  listVendors: async () => {
    requireStaff();
    return delay([...db.vendors].sort((a, b) => b.created_at.localeCompare(a.created_at)));
  },

  setVendorStatus: async (id, status) => {
    requireStaff();
    const v = db.vendors.find((x) => x.id === id);
    if (v) { v.status = status; v.verified_at = status === "approved" ? nowIso() : null; }
  },

  updateBrand: async (id, patch) => {
    requireStaff();
    const b = db.brands.find((x) => x.id === id);
    if (b) Object.assign(b, patch, { id: b.id });
  },

  createBrand: async (input) => {
    requireStaff();
    if (!input.name.trim()) throw new Error("Give the brand a name.");
    const b = { vendor_id: null, tagline: null, description: null, logo_url: null, website_url: null, is_owned_brand: false, is_featured: false,
      affiliation_disclosure: null, is_active: true, ...input, id: uid(), slug: input.slug || slugify(input.name) };
    if (!httpOk(b.website_url)) throw new Error("Links must start with https://");
    db.brands.push(b);
    return delay(b);
  },

  listAllCategories: async () => { requireStaff(); return delay([...db.categories].sort((a, b) => a.display_order - b.display_order)); },

  saveCategory: async (input) => {
    requireStaff();
    if (!input.name.trim()) throw new Error("Give the category a name.");
    const existing = input.id ? db.categories.find((c) => c.id === input.id) : undefined;
    if (existing) { Object.assign(existing, input); return delay(existing); }
    const c = { description: null, icon: null, display_order: db.categories.length + 1, is_active: true, ...input,
      id: uid(), slug: input.slug || slugify(input.name).replace(/-[a-z0-9]{5}$/, "") };
    if (db.categories.some((x) => x.slug === c.slug)) throw new Error("A category with that name already exists.");
    db.categories.push(c);
    return delay(c);
  },

  listAds: async () => { requireStaff(); return delay([...db.ads].sort((a, b) => b.created_at.localeCompare(a.created_at))); },

  saveAd: async (input) => {
    requireStaff();
    const existing = input.id ? db.ads.find((a) => a.id === input.id) : undefined;
    const next: Ad = {
      body: null, image_url: null, listing_id: null, brand_id: null, category_id: null, link_url: null, vendor_id: null,
      starts_at: nowIso(), ends_at: null, is_active: true, priority: 0, price_cents: null, payment_status: "unpaid", notes: null,
      ...existing, ...input, id: existing?.id ?? uid(), created_at: existing?.created_at ?? nowIso(),
    } as Ad;
    validateAd(next);
    if (existing) Object.assign(existing, next); else db.ads.push(next);
    return delay(next);
  },

  deleteAd: async (id) => { requireStaff(); db.ads = db.ads.filter((a) => a.id !== id); db.adStats = db.adStats.filter((s) => s.ad_id !== id); },

  listAdStats: async () => { requireStaff(); return delay(db.adStats); },

  expireListings: async () => {
    requireStaff();
    let n = 0;
    for (const l of db.listings) {
      if ((l.status === "approved" || l.status === "published") && l.expires_at && new Date(l.expires_at) <= new Date()) {
        const before = l.status;
        l.status = "expired";
        l.published_at = null;
        logStatus(l, before);
        n++;
      }
    }
    return n;
  },
};

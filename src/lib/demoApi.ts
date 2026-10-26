import type { MarketApi } from "./api";
import {
  DEMO_USERS, demoBrands, demoCategories, demoClicks, demoListings, demoReviews, demoVendors,
} from "./demoData";
import { slugify } from "./supabaseApi";
import type { Inquiry, Listing, ListingStatus, Review, Vendor, Viewer } from "./types";

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
};

const uid = () => Math.random().toString(36).slice(2, 10);
const nowIso = () => new Date().toISOString();
const delay = <T>(v: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 120));

/** The signed-in demo user's id, or null for the Visitor persona. */
export function getDemoUserId(): string | null {
  return viewer().userId;
}

function viewer(): Viewer {
  if (persona === "visitor") return { userId: null, email: null, isStaff: false };
  const u = DEMO_USERS[persona];
  return { userId: u.id, email: u.email, isStaff: persona === "admin" };
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

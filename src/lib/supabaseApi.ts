import type { SupabaseClient } from "@supabase/supabase-js";
import type { MarketApi } from "./api";
import type { Brand, Category, ClickRow, Inquiry, Listing, Review, Vendor } from "./types";

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// Row Level Security and the triggers in 001_marketplace.sql are the real
// enforcement; this layer only shapes queries.
export function supabaseApi(sb: SupabaseClient): MarketApi {
  return {
    async getViewer() {
      const { data } = await sb.auth.getUser();
      const user = data.user;
      if (!user) return { userId: null, email: null, isStaff: false };
      const { data: isStaff } = await sb.rpc("is_marketplace_staff", { _user_id: user.id });
      return { userId: user.id, email: user.email ?? null, isStaff: Boolean(isStaff) };
    },

    async listCategories() {
      return unwrap<Category[]>(await sb.from("marketplace_categories").select("*").order("display_order"));
    },

    async listBrands(opts) {
      let q = sb.from("marketplace_brands").select("*").order("name");
      if (opts?.featuredOnly) q = q.eq("is_featured", true);
      return unwrap<Brand[]>(await q);
    },

    async getBrand(slug) {
      return unwrap<Brand | null>(await sb.from("marketplace_brands").select("*").eq("slug", slug).maybeSingle());
    },

    async listPublishedListings(filters) {
      let q = sb.from("marketplace_listings").select("*").eq("status", "published").order("published_at", { ascending: false });
      if (filters?.categoryId) q = q.eq("category_id", filters.categoryId);
      if (filters?.brandId) q = q.eq("brand_id", filters.brandId);
      if (filters?.q) {
        const term = filters.q.replace(/[%,()]/g, " ").trim();
        if (term) q = q.or(`title.ilike.%${term}%,summary.ilike.%${term}%`);
      }
      return unwrap<Listing[]>(await q);
    },

    async getListing(slug) {
      return unwrap<Listing | null>(await sb.from("marketplace_listings").select("*").eq("slug", slug).maybeSingle());
    },

    async recordClick(listingId, source) {
      await sb.rpc("record_marketplace_click", { _listing_id: listingId, _source: source });
    },

    async sendInquiry(input) {
      unwrap(await sb.from("marketplace_inquiries").insert(input));
    },

    async getMyVendor() {
      const { data } = await sb.auth.getUser();
      if (!data.user) return null;
      return unwrap<Vendor | null>(
        await sb.from("marketplace_vendors").select("*").eq("owner_user_id", data.user.id).maybeSingle(),
      );
    },

    async applyAsVendor(input) {
      const { data } = await sb.auth.getUser();
      if (!data.user) throw new Error("Please sign in first.");
      return unwrap<Vendor>(
        await sb.from("marketplace_vendors").insert({ ...input, owner_user_id: data.user.id }).select().single(),
      );
    },

    async listVendorListings(vendorId) {
      return unwrap<Listing[]>(
        await sb.from("marketplace_listings").select("*").eq("vendor_id", vendorId).order("updated_at", { ascending: false }),
      );
    },

    async saveListing(input) {
      const { id, ...fields } = input;
      if (!fields.slug) fields.slug = slugify(fields.title);
      const res = id
        ? await sb.from("marketplace_listings").update(fields).eq("id", id).select().single()
        : await sb.from("marketplace_listings").insert(fields).select().single();
      return unwrap<Listing>(res);
    },

    async deleteListing(id) {
      unwrap(await sb.from("marketplace_listings").delete().eq("id", id));
    },

    async listInquiries(listingIds) {
      let q = sb.from("marketplace_inquiries").select("*").order("created_at", { ascending: false });
      if (listingIds) q = q.in("listing_id", listingIds);
      return unwrap<Inquiry[]>(await q);
    },

    async listClicks(listingIds) {
      let q = sb.from("marketplace_clicks").select("*").order("day");
      if (listingIds) q = q.in("listing_id", listingIds);
      return unwrap<ClickRow[]>(await q);
    },

    async listAllListings(status) {
      let q = sb.from("marketplace_listings").select("*").order("updated_at", { ascending: false });
      if (status) q = q.eq("status", status);
      return unwrap<Listing[]>(await q);
    },

    async setListingStatus(id, status, rejectionReason) {
      const patch: Record<string, unknown> = { status };
      if (status === "rejected") patch.rejection_reason = rejectionReason ?? null;
      unwrap(await sb.from("marketplace_listings").update(patch).eq("id", id));
    },

    async listReviews(listingId) {
      return unwrap<Review[]>(
        await sb.from("marketplace_reviews").select("*").eq("listing_id", listingId).order("created_at", { ascending: false }),
      );
    },

    async addReviewNote(listingId, type, notes) {
      const { data } = await sb.auth.getUser();
      unwrap(
        await sb.from("marketplace_reviews").insert({ listing_id: listingId, review_type: type, notes, reviewer_id: data.user?.id }),
      );
    },

    async listVendors() {
      return unwrap<Vendor[]>(await sb.from("marketplace_vendors").select("*").order("created_at", { ascending: false }));
    },

    async setVendorStatus(id, status) {
      const patch = { status, verified_at: status === "approved" ? new Date().toISOString() : null };
      unwrap(await sb.from("marketplace_vendors").update(patch).eq("id", id));
    },

    async updateBrand(id, patch) {
      unwrap(await sb.from("marketplace_brands").update(patch).eq("id", id));
    },

    async expireListings() {
      return unwrap<number>(await sb.rpc("expire_marketplace_listings"));
    },
  };
}

export function slugify(s: string) {
  const base = s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
  return `${base || "listing"}-${Math.random().toString(36).slice(2, 7)}`;
}

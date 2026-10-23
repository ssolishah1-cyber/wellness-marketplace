// Mirrors supabase/migrations/001_marketplace.sql

export type ListingStatus = "draft" | "pending_review" | "approved" | "published" | "rejected" | "expired";
export type VendorStatus = "pending" | "approved" | "suspended";
export type ListingType = "product" | "service" | "program" | "provider" | "education" | "event";
export type ReviewType = "advertising" | "regulatory" | "clinical" | "legal" | "status_change";

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
}

export interface Vendor {
  id: string;
  owner_user_id: string | null;
  business_name: string;
  contact_email: string | null;
  website_url: string | null;
  description: string | null;
  credentials: string | null;
  status: VendorStatus;
  verified_at: string | null;
  created_at: string;
}

export interface Brand {
  id: string;
  vendor_id: string | null;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  is_owned_brand: boolean;
  is_featured: boolean;
  affiliation_disclosure: string | null;
  is_active: boolean;
}

export interface Listing {
  id: string;
  vendor_id: string | null;
  brand_id: string | null;
  category_id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  listing_type: ListingType;
  price_cents: number | null;
  currency: string;
  price_note: string | null;
  price_verified: boolean;
  image_urls: string[];
  destination_url: string | null;
  cta_label: string | null;
  service_areas: string[];
  how_it_works: string | null;
  eligibility: string | null;
  min_age: number | null;
  ingredients_specs: string | null;
  shipping_info: string | null;
  refund_policy: string | null;
  evidence_summary: string | null;
  evidence_urls: string[];
  disclaimer: string | null;
  is_sponsored: boolean;
  is_regulated: boolean;
  event_starts_at: string | null;
  event_location: string | null;
  status: ListingStatus;
  rejection_reason: string | null;
  published_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ListingInput = Partial<Omit<Listing, "id" | "created_at" | "updated_at">> & {
  id?: string;
  title: string;
  category_id: string;
};

export interface Review {
  id: string;
  listing_id: string;
  reviewer_id: string | null;
  review_type: ReviewType;
  from_status: ListingStatus | null;
  to_status: ListingStatus | null;
  notes: string | null;
  created_at: string;
}

export interface ClickRow {
  listing_id: string;
  day: string;
  source: string;
  click_count: number;
}

export interface Inquiry {
  id: string;
  listing_id: string;
  user_id: string;
  contact_name: string;
  contact_email: string;
  message: string;
  consent_to_share: boolean;
  status: "new" | "forwarded" | "closed";
  created_at: string;
}

export interface Viewer {
  userId: string | null;
  email: string | null;
  isStaff: boolean;
}

export const STATUS_LABEL: Record<ListingStatus, string> = {
  draft: "Draft",
  pending_review: "Pending Review",
  approved: "Approved",
  published: "Published",
  rejected: "Rejected",
  expired: "Expired",
};

export const LISTING_TYPES: ListingType[] = ["product", "service", "program", "provider", "education", "event"];

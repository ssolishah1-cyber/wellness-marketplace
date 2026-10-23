import { supabase } from "@/integrations/supabase/client";
import { demoApi } from "./demoApi";
import { supabaseApi } from "./supabaseApi";
import type {
  Brand, Category, ClickRow, Inquiry, Listing, ListingInput, ListingStatus, Review, ReviewType, Vendor, VendorStatus, Viewer,
} from "./types";

export interface ListingFilters {
  categoryId?: string;
  brandId?: string;
  q?: string;
}

export interface VendorApplication {
  business_name: string;
  contact_email: string;
  website_url?: string;
  description?: string;
  credentials?: string;
}

export interface InquiryInput {
  listing_id: string;
  contact_name: string;
  contact_email: string;
  message: string;
  consent_to_share: boolean;
}

export interface MarketApi {
  getViewer(): Promise<Viewer>;

  // Public
  listCategories(): Promise<Category[]>;
  listBrands(opts?: { featuredOnly?: boolean }): Promise<Brand[]>;
  getBrand(slug: string): Promise<Brand | null>;
  listPublishedListings(filters?: ListingFilters): Promise<Listing[]>;
  getListing(slug: string): Promise<Listing | null>;
  recordClick(listingId: string, source: string): Promise<void>;
  sendInquiry(input: InquiryInput): Promise<void>;

  // Images: folder is the vendor id for vendors, "brands" or "staff" for staff
  uploadImage(file: File, folder: string): Promise<string>;

  // Vendor
  getMyVendor(): Promise<Vendor | null>;
  applyAsVendor(input: VendorApplication): Promise<Vendor>;
  listVendorListings(vendorId: string): Promise<Listing[]>;
  saveListing(input: ListingInput): Promise<Listing>;
  deleteListing(id: string): Promise<void>;
  listInquiries(listingIds?: string[]): Promise<Inquiry[]>;
  listClicks(listingIds?: string[]): Promise<ClickRow[]>;

  // Staff
  listAllListings(status?: ListingStatus): Promise<Listing[]>;
  setListingStatus(id: string, status: ListingStatus, rejectionReason?: string): Promise<void>;
  listReviews(listingId: string): Promise<Review[]>;
  addReviewNote(listingId: string, type: ReviewType, notes: string): Promise<void>;
  listVendors(): Promise<Vendor[]>;
  setVendorStatus(id: string, status: VendorStatus): Promise<void>;
  updateBrand(id: string, patch: Partial<Brand>): Promise<void>;
  expireListings(): Promise<number>;
}

export const api: MarketApi = supabase ? supabaseApi(supabase) : demoApi;

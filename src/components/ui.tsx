import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Apple, Baby, BadgeCheck, BookOpen, Brain, Calendar, Dumbbell, Heart, Leaf, Loader2, Moon, Package, Scale, ShoppingBag, Sparkles, Stethoscope, type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Category, Listing, ListingStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope, package: Package, scale: Scale, dumbbell: Dumbbell,
  "book-open": BookOpen, "badge-check": BadgeCheck, calendar: Calendar,
  heart: Heart, leaf: Leaf, apple: Apple, sparkles: Sparkles, moon: Moon, baby: Baby, brain: Brain, "shopping-bag": ShoppingBag,
};

export function CategoryIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name && CATEGORY_ICONS[name]) || ShoppingBag;
  return <Icon className={className} />;
}

export function useViewer() {
  return useQuery({ queryKey: ["viewer"], queryFn: () => api.getViewer() });
}

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: () => api.listCategories(), staleTime: 5 * 60_000 });
}

export function formatPrice(l: Pick<Listing, "price_cents" | "currency" | "price_verified">) {
  if (!l.price_verified || l.price_cents === null) return null;
  if (l.price_cents === 0) return "Free";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: l.currency || "USD" }).format(l.price_cents / 100);
}

const STATUS_STYLE: Record<ListingStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  pending_review: "bg-amber-100 text-amber-800",
  approved: "bg-sky-100 text-sky-800",
  published: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  expired: "bg-zinc-200 text-zinc-700",
};

export function StatusBadge({ status }: { status: ListingStatus }) {
  return <span className={`badge ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function SponsoredBadge({ label = "Sponsored" }: { label?: string }) {
  return <span className="badge bg-amber-50 text-amber-800 ring-1 ring-amber-200">{label}</span>;
}

const GRADIENTS = [
  "from-emerald-400 to-teal-600", "from-sky-400 to-indigo-600", "from-amber-300 to-orange-500",
  "from-rose-300 to-pink-600", "from-lime-300 to-emerald-600", "from-violet-400 to-fuchsia-600",
];

export function Thumb({ listing, category, className = "" }: { listing: Listing; category?: Category; className?: string }) {
  if (listing.image_urls[0]) {
    return <img src={listing.image_urls[0]} alt="" className={`object-cover ${className}`} loading="lazy" />;
  }
  const g = GRADIENTS[[...listing.id].reduce((a, c) => a + c.charCodeAt(0), 0) % GRADIENTS.length];
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br ${g} ${className}`}>
      <CategoryIcon name={category?.icon ?? null} className="h-10 w-10 text-white/90" />
    </div>
  );
}

export function ListingCard({ listing, categories, sponsored }: { listing: Listing; categories?: Category[]; sponsored?: boolean }) {
  const category = categories?.find((c) => c.id === listing.category_id);
  const price = formatPrice(listing);
  return (
    <Link to={`/market/listing/${listing.slug}`} className="card group flex flex-col overflow-hidden transition hover:shadow-md">
      <Thumb listing={listing} category={category} className="h-32 w-full" />
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex flex-wrap items-center gap-1">
          {category && <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{category.name}</span>}
          {(listing.is_sponsored || sponsored) && <SponsoredBadge />}
        </div>
        <h3 className="line-clamp-2 font-semibold leading-snug group-hover:text-brand-700">{listing.title}</h3>
        {listing.summary && <p className="line-clamp-2 text-sm text-slate-600">{listing.summary}</p>}
        <div className="mt-auto pt-2 text-sm font-semibold text-brand-700">
          {price ?? <span className="font-normal text-slate-500">See provider for pricing</span>}
          {price && listing.price_note && <span className="ml-1 font-normal text-slate-500">{listing.price_note}</span>}
        </div>
      </div>
    </Link>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-12 text-slate-400">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

export function SkeletonGrid({ n = 4 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: n }, (_, i) => <div key={i} className="card h-56 animate-pulse bg-slate-100" />)}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 p-8 text-center">
      <ShoppingBag className="h-8 w-8 text-slate-300" />
      <p className="font-medium text-slate-700">{title}</p>
      {children && <div className="text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  return <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error instanceof Error ? error.message : String(error)}</p>;
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

export const NUTRITION_INDEPENDENCE_NOTE =
  "Marketplace listings are separate from your nutrition recommendations. Your meal plans, weight and progress data are never used to choose what you see here.";

import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { LISTING_TYPES, type ListingType } from "@/lib/types";
import { CategoryIcon, EmptyState, ListingCard, SkeletonGrid, useCategories } from "@/components/ui";
import { CategorySponsor, FeaturedSlot, useLiveAds } from "@/components/ads";

type Sort = "newest" | "price_asc" | "price_desc";

// Free features inside the app that belong in a Market category.
const IN_APP: Record<string, { to: string; title: string; text: string }[]> = {
  fitness: [
    { to: "/workouts", title: "Your weekly workout plan", text: "Home or gym, matched to your level and health focus" },
    { to: "/workouts/library", title: "Exercise library", text: "700+ exercises with photos, from the open-source Free Exercise DB" },
  ],
  "weight-management": [
    { to: "/health/weight_loss", title: "Weight loss guide", text: "What to eat more of, what to limit, daily habits and meal ideas" },
    { to: "/workouts", title: "Your weekly workout plan", text: "Extra cardio time when your goal is weight loss" },
  ],
  "books-education": [
    { to: "/health/diabetes", title: "Blood sugar guide", text: "Plate method, carbs and habits, with sources" },
    { to: "/health/hypertension", title: "Blood pressure guide", text: "The DASH pattern, salt and potassium" },
    { to: "/health/heart_health", title: "Heart health guide", text: "Fiber, healthy fats and cholesterol" },
  ],
};

export default function CategoryPage() {
  const { slug } = useParams();
  const { data: categories, isLoading: catLoading } = useCategories();
  const category = categories?.find((c) => c.slug === slug);
  const [type, setType] = useState<ListingType | "">("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<Sort>("newest");

  const listings = useQuery({
    queryKey: ["listings", "published", "category", category?.id],
    queryFn: () => api.listPublishedListings({ categoryId: category!.id }),
    enabled: !!category,
  });

  const ads = useLiveAds();
  const sponsor = (ads.data ?? []).find((a) => a.kind === "category_sponsor" && a.category_id === category?.id);
  // Featured-listing ads for this category are pinned first (labelled Sponsored) when they match the filters.
  const featuredAds = (ads.data ?? []).filter((a) => a.kind === "featured_listing");
  const shown = useMemo(() => {
    const max = maxPrice ? Number(maxPrice) * 100 : null;
    const rows = (listings.data ?? [])
      .filter((l) => !type || l.listing_type === type)
      .filter((l) => max === null || (l.price_verified && l.price_cents !== null && l.price_cents <= max));
    const price = (p: number | null) => p ?? Number.MAX_SAFE_INTEGER;
    if (sort === "price_asc") rows.sort((a, b) => price(a.price_cents) - price(b.price_cents));
    if (sort === "price_desc") rows.sort((a, b) => (b.price_cents ?? -1) - (a.price_cents ?? -1));
    return rows;
  }, [listings.data, type, maxPrice, sort]);
  const pinned = featuredAds.map((ad) => ({ ad, listing: shown.find((l) => l.id === ad.listing_id) })).filter((x) => x.listing);
  const rest = shown.filter((l) => !pinned.some((p) => p.listing!.id === l.id));

  if (!catLoading && !category) return <EmptyState title="Category not found"><Link to="/market" className="text-brand-700">Back to Market</Link></EmptyState>;

  return (
    <div className="space-y-4">
      <Link to="/market" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-700"><ArrowLeft className="h-4 w-4" /> Market</Link>
      {category && (
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-brand-50 p-2.5"><CategoryIcon name={category.icon} className="h-6 w-6 text-brand-700" /></div>
          <div>
            <h1 className="text-xl font-bold">{category.name}</h1>
            <p className="text-sm text-slate-600">{category.description}</p>
          </div>
        </div>
      )}
      {sponsor && <CategorySponsor ad={sponsor} />}
      {slug && IN_APP[slug] && (
        <section aria-label="Free in this app" className="grid gap-2">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-brand-700"><Sparkles className="h-4 w-4" /> Free in this app</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {IN_APP[slug].map((x) => (
              <Link key={x.to} to={x.to} className="card flex items-center gap-3 p-3 transition hover:border-brand-500">
                <span className="min-w-0 flex-1"><b className="block text-sm">{x.title}</b><span className="text-xs text-slate-500">{x.text}</span></span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            ))}
          </div>
        </section>
      )}
      <div className="flex flex-wrap gap-2">
        <select className="input w-auto" value={type} onChange={(e) => setType(e.target.value as ListingType | "")}>
          <option value="">All types</option>
          {LISTING_TYPES.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
        </select>
        <input className="input w-32" type="number" min={0} placeholder="Max price" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
        <select className="input w-auto" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
      </div>
      {listings.isLoading || catLoading ? <SkeletonGrid /> : shown.length ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {pinned.map(({ ad, listing }) => <FeaturedSlot key={ad.id} ad={ad}><ListingCard listing={listing!} categories={categories} sponsored /></FeaturedSlot>)}
          {rest.map((l) => <ListingCard key={l.id} listing={l} categories={categories} />)}
        </div>
      ) : <EmptyState title="No listings in this category yet" />}
    </div>
  );
}

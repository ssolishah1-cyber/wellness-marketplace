import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Info, Search, Store } from "lucide-react";
import { api } from "@/lib/api";
import {
  CategoryIcon, EmptyState, ListingCard, NUTRITION_INDEPENDENCE_NOTE, SkeletonGrid, SponsoredBadge, useCategories, useViewer,
} from "@/components/ui";
import DemoGuide from "@/components/DemoGuide";

export default function MarketHome() {
  const [q, setQ] = useState("");
  const { data: categories } = useCategories();
  const { data: viewer } = useViewer();
  const featured = useQuery({ queryKey: ["brands", "featured"], queryFn: () => api.listBrands({ featuredOnly: true }) });
  const listings = useQuery({ queryKey: ["listings", "published", q], queryFn: () => api.listPublishedListings({ q }) });

  return (
    <div className="space-y-7">
      <DemoGuide />
      <section>
        <h1 className="text-2xl font-bold">Wellness Marketplace</h1>
        <p className="text-sm text-slate-600">Telehealth, wellness products, coaching, fitness and education from reviewed partners.</p>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search the marketplace" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </section>

      {!q && (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <h2 className="font-semibold">Featured Partners</h2>
            <SponsoredBadge />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {featured.data?.map((b) => (
              <Link key={b.id} to={`/market/brand/${b.slug}`}
                className="card flex gap-4 p-4 transition hover:shadow-md">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-lg font-bold text-brand-700">
                  {b.logo_url ? <img src={b.logo_url} alt="" className="h-full w-full rounded-xl object-contain" /> : b.name.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{b.name}</h3>
                    {b.is_owned_brand && <span className="badge bg-slate-100 text-slate-600">Affiliated</span>}
                  </div>
                  <p className="text-sm text-slate-600">{b.tagline}</p>
                  {b.affiliation_disclosure && <p className="mt-1 text-[11px] text-slate-500">{b.affiliation_disclosure}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!q && (
        <section>
          <h2 className="mb-2 font-semibold">Browse categories</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {categories?.map((c) => (
              <Link key={c.id} to={`/market/category/${c.slug}`}
                className="card flex flex-col gap-1 p-3 transition hover:border-brand-500">
                <CategoryIcon name={c.icon} className="h-5 w-5 text-brand-600" />
                <span className="text-sm font-semibold">{c.name}</span>
                <span className="line-clamp-2 text-xs text-slate-500">{c.description}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-semibold">{q ? `Results for “${q}”` : "Latest listings"}</h2>
        {listings.isLoading ? <SkeletonGrid /> : listings.data?.length ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {listings.data.map((l) => <ListingCard key={l.id} listing={l} categories={categories} />)}
          </div>
        ) : <EmptyState title="No listings found">Try a different search.</EmptyState>}
      </section>

      <section className="card flex flex-col items-start gap-3 bg-brand-50 p-4 sm:flex-row sm:items-center">
        <Store className="h-6 w-6 text-brand-700" />
        <div className="flex-1">
          <h3 className="font-semibold">Advertise your wellness business</h3>
          <p className="text-sm text-slate-600">Verified dietitians, coaches, fitness and wellness brands can apply to list here.</p>
        </div>
        <Link to={viewer?.userId ? "/market/vendor" : "/profile"} className="btn-primary">Apply to list</Link>
      </section>

      <p className="flex gap-2 text-xs text-slate-500"><Info className="h-4 w-4 shrink-0" />{NUTRITION_INDEPENDENCE_NOTE}</p>
    </div>
  );
}

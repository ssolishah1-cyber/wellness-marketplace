import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Info } from "lucide-react";
import { api } from "@/lib/api";
import { EmptyState, ListingCard, SkeletonGrid, Spinner, SponsoredBadge, useCategories } from "@/components/ui";

export default function BrandPage() {
  const { slug = "" } = useParams();
  const { data: categories } = useCategories();
  const brand = useQuery({ queryKey: ["brand", slug], queryFn: () => api.getBrand(slug) });
  const listings = useQuery({
    queryKey: ["listings", "published", "brand", brand.data?.id],
    queryFn: () => api.listPublishedListings({ brandId: brand.data!.id }),
    enabled: !!brand.data,
  });

  if (brand.isLoading) return <Spinner />;
  const b = brand.data;
  if (!b) return <EmptyState title="Brand not found"><Link to="/market" className="text-brand-700">Back to Market</Link></EmptyState>;

  return (
    <div className="space-y-5">
      <Link to="/market" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-700"><ArrowLeft className="h-4 w-4" /> Market</Link>
      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-2xl font-bold text-brand-700">
          {b.logo_url ? <img src={b.logo_url} alt={`${b.name} logo`} className="h-full w-full rounded-2xl object-contain" /> : b.name.slice(0, 2)}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{b.name}</h1>
            {b.is_featured && <SponsoredBadge />}
            {b.is_owned_brand && <span className="badge bg-slate-100 text-slate-600">Affiliated</span>}
          </div>
          {b.tagline && <p className="text-slate-600">{b.tagline}</p>}
        </div>
        {b.website_url && (
          <a href={b.website_url} target="_blank" rel="noopener noreferrer sponsored" className="btn-primary">
            Visit {b.name} <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
      {b.affiliation_disclosure && (
        <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <Info className="h-4 w-4 shrink-0" /> {b.affiliation_disclosure}
        </div>
      )}
      {b.description && <p className="whitespace-pre-line text-slate-700">{b.description}</p>}
      <h2 className="font-semibold">Listings</h2>
      {listings.isLoading ? <SkeletonGrid n={2} /> : listings.data?.length ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {listings.data.map((l) => <ListingCard key={l.id} listing={l} categories={categories} />)}
        </div>
      ) : <EmptyState title="No published listings yet" />}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { isSafeHttpUrl, withUtm } from "@/lib/outbound";
import type { LiveAd } from "@/lib/types";
import { SponsoredBadge } from "./ui";

// Market ads. Every ad is labelled Sponsored, chosen only by placement and
// category (never by anything about the viewer), and counted as anonymous
// daily views and clicks.

export const useLiveAds = () => useQuery({ queryKey: ["live-ads"], queryFn: () => api.listLiveAds(), staleTime: 60_000 });

/** Counts one view per ad per browsing session. */
export function useAdView(id: string | undefined) {
  useEffect(() => {
    if (!id) return;
    const key = `ad-view-${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch { /* storage blocked: still count */ }
    void api.recordAdEvent(id, "view");
  }, [id]);
}

/** Where an ad goes: its listing, its brand page, or an outside link. */
export function adTarget(ad: LiveAd): { to: string } | { href: string } | null {
  if (ad.listing_slug) return { to: `/market/listing/${ad.listing_slug}` };
  if (ad.brand_slug) return { to: `/market/brand/${ad.brand_slug}` };
  if (isSafeHttpUrl(ad.link_url)) return { href: withUtm(ad.link_url, `ad-${ad.id}`, ad.kind) };
  return null;
}

export function AdLink({ ad, className, children }: { ad: LiveAd; className?: string; children: React.ReactNode }) {
  const target = adTarget(ad);
  const click = () => void api.recordAdEvent(ad.id, "click");
  if (!target) return <div className={className}>{children}</div>;
  if ("to" in target) return <Link to={target.to} onClick={click} className={className}>{children}</Link>;
  return <a href={target.href} target="_blank" rel="noopener noreferrer sponsored" onClick={click} className={className}>{children}</a>;
}

export function AdLabel({ ad, label = "Sponsored" }: { ad: LiveAd; label?: string }) {
  return <span className="flex items-center gap-1.5 text-[11px]"><SponsoredBadge label={label} /> <span className="truncate opacity-80">{ad.advertiser}</span></span>;
}

export function HomeBanner({ ads }: { ads: LiveAd[] }) {
  const [i, setI] = useState(0);
  const n = ads.length;
  useEffect(() => {
    if (n < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), 6000);
    return () => clearInterval(t);
  }, [n]);
  const ad = ads[i % Math.max(n, 1)];
  useAdView(ad?.id);
  if (!ad) return null;
  return (
    <section aria-label="Sponsored" className="relative">
      <AdLink ad={ad} className="relative block aspect-[12/5] max-h-64 w-full overflow-hidden rounded-2xl bg-brand-700 text-white">
        {ad.image_url && <img src={ad.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <span className="absolute inset-x-0 bottom-0 grid gap-1 p-4">
          <AdLabel ad={ad} />
          <b className="text-lg leading-tight sm:text-xl">{ad.title}</b>
          {ad.body && <span className="line-clamp-2 text-sm opacity-90">{ad.body}</span>}
        </span>
      </AdLink>
      {n > 1 && (
        <div className="mt-2 flex justify-center gap-1.5">
          {ads.map((a, j) => (
            <button key={a.id} type="button" aria-label={`Show ad ${j + 1} of ${n}`} aria-pressed={j === i % n} onClick={() => setI(j)}
              className={`h-1.5 rounded-full transition-all ${j === i % n ? "w-5 bg-brand-600" : "w-1.5 bg-slate-300"}`} />
          ))}
        </div>
      )}
    </section>
  );
}

export function CategorySponsor({ ad }: { ad: LiveAd }) {
  useAdView(ad.id);
  return (
    <AdLink ad={ad} className="card flex items-center gap-3 overflow-hidden border-amber-200 bg-amber-50/60 p-3 transition hover:shadow-md">
      {ad.image_url && <img src={ad.image_url} alt="" className="h-16 w-20 shrink-0 rounded-xl object-cover" />}
      <span className="min-w-0 flex-1">
        <AdLabel ad={ad} label="Category sponsor" />
        <b className="mt-0.5 block leading-snug">{ad.title}</b>
        {ad.body && <span className="line-clamp-2 text-sm text-slate-600">{ad.body}</span>}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
    </AdLink>
  );
}

/** Wraps a featured listing card so its view and click count toward the ad. */
export function FeaturedSlot({ ad, children }: { ad: LiveAd; children: React.ReactNode }) {
  useAdView(ad.id);
  return <div onClickCapture={() => void api.recordAdEvent(ad.id, "click")} className="contents">{children}</div>;
}

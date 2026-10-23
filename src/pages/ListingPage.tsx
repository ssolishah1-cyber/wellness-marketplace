import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Calendar, CheckCircle2, ExternalLink, MapPin, MessageSquare, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";
import type { Listing } from "@/lib/types";
import { isSafeHttpUrl, withUtm } from "@/lib/outbound";
import {
  EmptyState, ErrorNote, Field, Spinner, SponsoredBadge, StatusBadge, Thumb, formatPrice, useCategories, useViewer,
} from "@/components/ui";

const REGULATED_NOTICE =
  "This service is provided by a licensed third party. Eligibility is determined by a clinician. This app does not provide medical advice.";

export default function ListingPage() {
  const { slug = "" } = useParams();
  const { data: categories } = useCategories();
  const { data: viewer } = useViewer();
  const listing = useQuery({ queryKey: ["listing", slug], queryFn: () => api.getListing(slug) });
  const brands = useQuery({ queryKey: ["brands"], queryFn: () => api.listBrands() });
  const [asking, setAsking] = useState(false);

  if (listing.isLoading) return <Spinner />;
  const l = listing.data;
  if (!l) return <EmptyState title="Listing not available"><Link to="/market" className="text-brand-700">Back to Market</Link></EmptyState>;

  const category = categories?.find((c) => c.id === l.category_id);
  const brand = brands.data?.find((b) => b.id === l.brand_id);
  const price = formatPrice(l);
  const live = l.status === "published";

  const destination = isSafeHttpUrl(l.destination_url) ? withUtm(l.destination_url, l.slug, "listing") : null;
  const evidenceLinks = l.evidence_urls.filter(isSafeHttpUrl);

  // Aggregate, anonymous count only: no user id or health data is sent.
  const countClick = () => {
    if (live) void api.recordClick(l.id, "listing");
  };

  return (
    <div className="space-y-5">
      <Link to={category ? `/market/category/${category.slug}` : "/market"} className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-700">
        <ArrowLeft className="h-4 w-4" /> {category?.name ?? "Market"}
      </Link>

      {!live && (
        <div className="flex items-center gap-2 rounded-xl bg-slate-900 p-3 text-sm text-white">
          Preview: this listing is <StatusBadge status={l.status} /> and is not visible to the public.
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-5">
        <div className="space-y-2 md:col-span-3">
          <Thumb listing={l} category={category} className="h-56 w-full rounded-2xl md:h-72" />
          {l.image_urls.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {l.image_urls.slice(1).map((u) => <img key={u} src={u} alt="" className="h-16 w-16 rounded-lg object-cover" />)}
            </div>
          )}
        </div>

        <div className="space-y-3 md:col-span-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {category && <span className="font-medium uppercase tracking-wide">{category.name}</span>}
            {l.is_sponsored && <SponsoredBadge />}
            {brand?.is_owned_brand && <span className="badge bg-slate-100 text-slate-600">Affiliated</span>}
          </div>
          <h1 className="text-2xl font-bold leading-tight">{l.title}</h1>
          {brand && <Link to={`/market/brand/${brand.slug}`} className="text-sm font-medium text-brand-700">by {brand.name}</Link>}
          {l.summary && <p className="text-slate-700">{l.summary}</p>}
          <div className="text-xl font-bold text-brand-700">
            {price ?? <span className="text-base font-normal text-slate-500">See provider for current pricing</span>}
            {price && l.price_note && <span className="ml-1 text-sm font-normal text-slate-500">{l.price_note}</span>}
          </div>
          {l.event_starts_at && (
            <p className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-slate-400" />{new Date(l.event_starts_at).toLocaleString()}</p>
          )}
          {l.event_location && <p className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-slate-400" />{l.event_location}</p>}
          {l.min_age && <p className="text-sm font-medium text-slate-700">Must be {l.min_age}+</p>}
          <div className="flex flex-col gap-2 pt-1">
            {destination && (
              <a href={destination} target="_blank" rel="noopener noreferrer sponsored" onClick={countClick} className="btn-primary py-3">
                {l.cta_label || "Learn more"} <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {live && viewer?.userId && (
              <button onClick={() => setAsking(true)} className="btn-outline"><MessageSquare className="h-4 w-4" /> Ask a question</button>
            )}
            {live && !viewer?.userId && <p className="text-center text-xs text-slate-500">Sign in to send the provider a question.</p>}
          </div>
          {l.is_sponsored && (
            <p className="text-[11px] text-slate-500">
              Sponsored listing. {brand?.affiliation_disclosure ?? "The app may receive compensation from this business."}
            </p>
          )}
        </div>
      </div>

      {asking && <InquiryForm listing={l} defaultEmail={viewer?.email ?? ""} onClose={() => setAsking(false)} />}

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="About">{l.description}</Section>
        <Section title="How it works">{l.how_it_works}</Section>
        <Section title="Service areas">{l.service_areas.length ? l.service_areas.join(", ") : null}</Section>
        <Section title="Eligibility">{l.eligibility}</Section>
        <Section title="Ingredients / specifications">{l.ingredients_specs}</Section>
        <Section title="Shipping">{l.shipping_info}</Section>
        <Section title="Refund policy">{l.refund_policy}</Section>
        {(l.evidence_summary || evidenceLinks.length > 0) && (
          <div className="card p-4">
            <h2 className="mb-1 font-semibold">Supporting evidence</h2>
            {l.evidence_summary && <p className="whitespace-pre-line text-sm text-slate-700">{l.evidence_summary}</p>}
            <ul className="mt-2 space-y-1 text-sm">
              {evidenceLinks.map((u) => (
                <li key={u}><a href={u} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline break-all">{u}</a></li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {(l.disclaimer || l.is_regulated) && (
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-100 p-4 text-sm text-slate-700">
          {l.is_regulated && <p className="flex gap-2"><ShieldAlert className="h-4 w-4 shrink-0 text-slate-500" />{REGULATED_NOTICE}</p>}
          {l.disclaimer && <p className="flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0 text-slate-500" />{l.disclaimer}</p>}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="card p-4">
      <h2 className="mb-1 font-semibold">{title}</h2>
      <p className="whitespace-pre-line text-sm text-slate-700">{children}</p>
    </div>
  );
}

function InquiryForm({ listing, defaultEmail, onClose }: { listing: Listing; defaultEmail: string; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const send = useMutation({
    mutationFn: () => api.sendInquiry({
      listing_id: listing.id, contact_name: name.trim(), contact_email: email.trim(), message: message.trim(), consent_to_share: consent,
    }),
  });

  if (send.isSuccess) {
    return (
      <div className="card flex items-center gap-3 p-4">
        <CheckCircle2 className="h-6 w-6 text-brand-600" />
        <p className="flex-1 text-sm">Your question was sent. The provider will reply by email.</p>
        <button className="btn-outline" onClick={onClose}>Close</button>
      </div>
    );
  }

  return (
    <form className="card space-y-3 p-4" onSubmit={(e) => { e.preventDefault(); send.mutate(); }}>
      <h2 className="font-semibold">Ask {listing.title} a question</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Your name"><input className="input" required value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Email"><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      </div>
      <Field label="Message" hint={`${message.length}/2000 · Don't include health details you don't want to share.`}>
        <textarea className="input min-h-24" required maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} />
      </Field>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" required checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        I agree to share my name, email and message with this business. No meal, weight or health data from the app is included.
      </label>
      <ErrorNote error={send.error} />
      <div className="flex gap-2">
        <button className="btn-primary" disabled={send.isPending || !consent}>Send</button>
        <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

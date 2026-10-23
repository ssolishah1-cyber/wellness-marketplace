import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { LISTING_TYPES, type Brand, type Category, type Listing, type ListingInput, type ListingStatus, type ListingType } from "@/lib/types";
import { ErrorNote, Field } from "./ui";
import ImageUpload from "./ImageUpload";

interface Props {
  initial: Listing | null;
  vendorId: string | null;
  staff: boolean;
  brands: Brand[];
  categories: Category[];
  onSaved: (l: Listing) => void;
  onCancel: () => void;
}

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const orNull = (s: string) => (s.trim() ? s.trim() : null);

export default function ListingForm({ initial, vendorId, staff, brands, categories, onSaved, onCancel }: Props) {
  const i = initial;
  const [f, setF] = useState({
    title: i?.title ?? "",
    category_id: i?.category_id ?? "",
    brand_id: i?.brand_id ?? "",
    listing_type: (i?.listing_type ?? "product") as ListingType,
    summary: i?.summary ?? "",
    description: i?.description ?? "",
    price: i?.price_cents != null ? String(i.price_cents / 100) : "",
    currency: i?.currency ?? "USD",
    price_note: i?.price_note ?? "",
    destination_url: i?.destination_url ?? "",
    cta_label: i?.cta_label ?? "Learn more",
    image_urls: (i?.image_urls ?? []).join("\n"),
    how_it_works: i?.how_it_works ?? "",
    service_areas: (i?.service_areas ?? []).join("\n"),
    eligibility: i?.eligibility ?? "",
    min_age: i?.min_age != null ? String(i.min_age) : "",
    ingredients_specs: i?.ingredients_specs ?? "",
    shipping_info: i?.shipping_info ?? "",
    refund_policy: i?.refund_policy ?? "",
    evidence_summary: i?.evidence_summary ?? "",
    evidence_urls: (i?.evidence_urls ?? []).join("\n"),
    disclaimer: i?.disclaimer ?? "",
    event_starts_at: i?.event_starts_at ? i.event_starts_at.slice(0, 16) : "",
    event_location: i?.event_location ?? "",
    is_regulated: i?.is_regulated ?? false,
    is_sponsored: i?.is_sponsored ?? false,
    price_verified: i?.price_verified ?? false,
    expires_at: i?.expires_at ? i.expires_at.slice(0, 10) : "",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const text = (k: keyof typeof f) => ({
    value: f[k] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(k, e.target.value as never),
  });

  const availableBrands = staff ? brands : brands.filter((b) => b.vendor_id && b.vendor_id === vendorId);
  const isLive = i?.status === "published" || i?.status === "approved";

  const save = useMutation({
    mutationFn: (status: ListingStatus | undefined) => {
      const input: ListingInput = {
        id: i?.id,
        vendor_id: i ? i.vendor_id : vendorId,
        title: f.title.trim(),
        category_id: f.category_id,
        brand_id: f.brand_id || null,
        listing_type: f.listing_type,
        summary: orNull(f.summary),
        description: orNull(f.description),
        price_cents: f.price.trim() ? Math.round(Number(f.price) * 100) : null,
        currency: f.currency.trim().toUpperCase() || "USD",
        price_note: orNull(f.price_note),
        destination_url: orNull(f.destination_url),
        cta_label: orNull(f.cta_label),
        image_urls: lines(f.image_urls),
        how_it_works: orNull(f.how_it_works),
        service_areas: lines(f.service_areas),
        eligibility: orNull(f.eligibility),
        min_age: f.min_age ? Number(f.min_age) : null,
        ingredients_specs: orNull(f.ingredients_specs),
        shipping_info: orNull(f.shipping_info),
        refund_policy: orNull(f.refund_policy),
        evidence_summary: orNull(f.evidence_summary),
        evidence_urls: lines(f.evidence_urls),
        disclaimer: orNull(f.disclaimer),
        event_starts_at: f.event_starts_at ? new Date(f.event_starts_at).toISOString() : null,
        event_location: orNull(f.event_location),
        is_regulated: f.is_regulated,
        ...(staff ? {
          is_sponsored: f.is_sponsored,
          price_verified: f.price_verified,
          expires_at: f.expires_at ? new Date(f.expires_at + "T23:59:59").toISOString() : null,
        } : {}),
        ...(status ? { status } : {}),
      };
      return api.saveListing(input);
    },
    onSuccess: onSaved,
  });

  const showService = ["service", "program", "provider", "event"].includes(f.listing_type);
  const showProduct = ["product", "education"].includes(f.listing_type);

  return (
    <form className="card space-y-5 p-4" onSubmit={(e) => { e.preventDefault(); save.mutate(undefined); }}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{i ? "Edit listing" : "New listing"}</h2>
        <button type="button" className="text-sm text-slate-500 hover:text-slate-800" onClick={onCancel}>Close</button>
      </div>

      {!staff && isLive && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">This listing is live. Saving changes sends it back for review and hides it until it is approved again.</p>
      )}

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <Field label="Title *"><input className="input" required maxLength={120} {...text("title")} /></Field>
        <Field label="Category *">
          <select className="input" required {...text("category_id")}>
            <option value="" disabled>Select a category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Listing type">
          <select className="input" {...text("listing_type")}>
            {LISTING_TYPES.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
          </select>
        </Field>
        <Field label="Brand">
          <select className="input" {...text("brand_id")}>
            <option value="">— None —</option>
            {availableBrands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        <div className="sm:col-span-2"><Field label="Short summary"><input className="input" maxLength={200} {...text("summary")} /></Field></div>
        <div className="sm:col-span-2"><Field label="Description"><textarea className="input min-h-24" {...text("description")} /></Field></div>
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-4">
        <legend className="mb-2 text-sm font-semibold">Pricing & link</legend>
        <Field label="Price"><input className="input" type="number" min={0} step="0.01" {...text("price")} /></Field>
        <Field label="Currency"><input className="input" maxLength={3} {...text("currency")} /></Field>
        <div className="sm:col-span-2"><Field label="Price note" hint='e.g. "per consultation", "from"'><input className="input" {...text("price_note")} /></Field></div>
        <div className="sm:col-span-3"><Field label="Destination URL"><input className="input" type="url" placeholder="https://" {...text("destination_url")} /></Field></div>
        <Field label="Button label"><input className="input" maxLength={30} {...text("cta_label")} /></Field>
        <div className="space-y-2 sm:col-span-4">
          <span className="label">Images</span>
          {lines(f.image_urls).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {lines(f.image_urls).map((u, idx) => (
                <div key={u} className="relative">
                  <img src={u} alt="" className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />
                  {idx === 0 && <span className="absolute bottom-0.5 left-0.5 rounded bg-slate-900/70 px-1 text-[9px] text-white">Cover</span>}
                  <button type="button" aria-label="Remove image" className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-white text-xs shadow ring-1 ring-slate-200"
                    onClick={() => set("image_urls", lines(f.image_urls).filter((x) => x !== u).join("\n"))}>×</button>
                </div>
              ))}
            </div>
          )}
          <ImageUpload folder={staff ? "staff" : vendorId ?? "staff"} onUploaded={(url) => set("image_urls", [...lines(f.image_urls), url].join("\n"))} />
          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer">Or paste image links</summary>
            <textarea className="input mt-1" rows={2} placeholder="One https:// link per line. First image is the cover." {...text("image_urls")} />
          </details>
        </div>
      </fieldset>

      {showService && (
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-semibold">Service details</legend>
          <div className="sm:col-span-2"><Field label="How it works"><textarea className="input" rows={3} {...text("how_it_works")} /></Field></div>
          <Field label="Service areas" hint="One per line"><textarea className="input" rows={2} {...text("service_areas")} /></Field>
          <Field label="Eligibility"><textarea className="input" rows={2} {...text("eligibility")} /></Field>
          <Field label="Minimum age"><input className="input" type="number" min={0} max={120} {...text("min_age")} /></Field>
          {f.listing_type === "event" && (
            <>
              <Field label="Event starts"><input className="input" type="datetime-local" {...text("event_starts_at")} /></Field>
              <Field label="Event location"><input className="input" {...text("event_location")} /></Field>
            </>
          )}
        </fieldset>
      )}

      {showProduct && (
        <fieldset className="grid gap-3 sm:grid-cols-3">
          <legend className="mb-2 text-sm font-semibold">Product details</legend>
          <Field label="Ingredients / specifications"><textarea className="input" rows={3} {...text("ingredients_specs")} /></Field>
          <Field label="Shipping"><textarea className="input" rows={3} {...text("shipping_info")} /></Field>
          <Field label="Refund policy"><textarea className="input" rows={3} {...text("refund_policy")} /></Field>
        </fieldset>
      )}

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold">Claims & compliance</legend>
        <Field label="Supporting evidence" hint="Required for any health or product claim."><textarea className="input" rows={3} {...text("evidence_summary")} /></Field>
        <Field label="Evidence links" hint="One URL per line"><textarea className="input" rows={3} {...text("evidence_urls")} /></Field>
        <div className="sm:col-span-2"><Field label="Disclaimer"><textarea className="input" rows={2} {...text("disclaimer")} /></Field></div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={f.is_regulated} onChange={(e) => set("is_regulated", e.target.checked)} />
          Regulated / clinical service (telehealth, prescription-adjacent): requires legal and advertising review
        </label>
      </fieldset>

      {staff && (
        <fieldset className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-3">
          <legend className="text-sm font-semibold">Reviewer-only</legend>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_sponsored} onChange={(e) => set("is_sponsored", e.target.checked)} /> Sponsored</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.price_verified} onChange={(e) => set("price_verified", e.target.checked)} /> Price verified</label>
          <Field label="Expires on"><input className="input" type="date" {...text("expires_at")} /></Field>
        </fieldset>
      )}

      <ErrorNote error={save.error} />
      <div className="flex flex-wrap gap-2">
        {staff ? (
          <button className="btn-primary" disabled={save.isPending}>Save</button>
        ) : (
          <>
            <button className="btn-outline" disabled={save.isPending}>{isLive ? "Save changes" : "Save as draft"}</button>
            <button type="button" className="btn-primary" disabled={save.isPending || !f.title.trim() || !f.category_id} onClick={() => save.mutate("pending_review")}>
              Submit for review
            </button>
          </>
        )}
      </div>
    </form>
  );
}

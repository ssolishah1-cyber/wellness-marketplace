import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { AD_KIND_LABEL, type Ad, type AdInput, type AdKind, type PaymentStatus } from "@/lib/types";
import ImageUpload from "@/components/ImageUpload";
import { EmptyState, ErrorNote, Field, Spinner, SponsoredBadge, useCategories } from "@/components/ui";
import { useToast } from "@/components/Toast";

type AdState = "live" | "scheduled" | "ended" | "paused" | "not_showing";
const STATE: Record<AdState, { label: string; cls: string }> = {
  live: { label: "Live", cls: "bg-emerald-100 text-emerald-800" },
  scheduled: { label: "Scheduled", cls: "bg-sky-100 text-sky-800" },
  ended: { label: "Ended", cls: "bg-slate-100 text-slate-600" },
  paused: { label: "Paused", cls: "bg-amber-100 text-amber-800" },
  not_showing: { label: "Not showing", cls: "bg-rose-100 text-rose-800" },
};
const PAY: Record<PaymentStatus, string> = { unpaid: "Unpaid", invoiced: "Invoiced", paid: "Paid", complimentary: "Free" };

const money = (c: number | null) => (c == null ? "—" : (c / 100).toLocaleString(undefined, { style: "currency", currency: "USD" }));

export default function AdsTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const ads = useQuery({ queryKey: ["admin-ads"], queryFn: () => api.listAds() });
  const live = useQuery({ queryKey: ["live-ads"], queryFn: () => api.listLiveAds() });
  const stats = useQuery({ queryKey: ["admin-ad-stats"], queryFn: () => api.listAdStats() });
  const [editing, setEditing] = useState<Ad | "new" | null>(null);
  const refresh = () => Promise.all(["admin-ads", "live-ads", "admin-ad-stats"].map((k) => qc.invalidateQueries({ queryKey: [k] })));
  const toggle = useMutation({ mutationFn: (a: Ad) => api.saveAd({ ...a, is_active: !a.is_active }), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (a: Ad) => api.deleteAd(a.id), onSuccess: async () => { await refresh(); toast("Ad deleted"); } });

  const totals = useMemo(() => {
    const m = new Map<string, { views: number; clicks: number }>();
    for (const s of stats.data ?? []) {
      const t = m.get(s.ad_id) ?? { views: 0, clicks: 0 };
      t.views += s.views; t.clicks += s.clicks;
      m.set(s.ad_id, t);
    }
    return m;
  }, [stats.data]);

  if (editing) return <AdForm ad={editing === "new" ? null : editing} onDone={async (saved) => { setEditing(null); if (saved) { await refresh(); toast("Ad saved"); } }} />;
  if (ads.isLoading) return <Spinner />;

  const now = new Date().toISOString();
  const liveIds = new Set((live.data ?? []).map((a) => a.id));
  const stateOf = (a: Ad): AdState => !a.is_active ? "paused" : a.starts_at > now ? "scheduled" : a.ends_at && a.ends_at <= now ? "ended" : liveIds.has(a.id) ? "live" : "not_showing";
  const revenue = (ads.data ?? []).filter((a) => a.payment_status === "paid").reduce((s, a) => s + (a.price_cents ?? 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-primary" onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> New ad</button>
        <span className="text-sm text-slate-500">{(ads.data ?? []).filter((a) => stateOf(a) === "live").length} live · {money(revenue)} paid</span>
      </div>
      <p className="text-xs text-slate-500">Ads are always labelled Sponsored and placed by position and category only. They are never targeted using anyone's health data. Payment: record it here for now; online checkout can be added later.</p>
      <ErrorNote error={ads.error ?? toggle.error ?? remove.error} />
      {!ads.data?.length ? <EmptyState title="No ads yet">Create a featured listing, a Market banner or a category sponsorship.</EmptyState> : (
        <div className="card divide-y divide-slate-100">
          {ads.data.map((a) => {
            const st = STATE[stateOf(a)];
            const t = totals.get(a.id) ?? { views: 0, clicks: 0 };
            return (
              <div key={a.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                {a.image_url ? <img src={a.image_url} alt="" className="h-12 w-20 shrink-0 rounded-lg object-cover" /> : <span className="hidden h-12 w-20 shrink-0 rounded-lg bg-slate-100 sm:block" />}
                <div className="min-w-0 flex-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <b>{a.title}</b>
                    <span className={`badge ${st.cls}`}>{st.label}</span>
                    <span className="badge bg-slate-100 text-slate-600">{AD_KIND_LABEL[a.kind]}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {a.advertiser} · {new Date(a.starts_at).toLocaleDateString()} → {a.ends_at ? new Date(a.ends_at).toLocaleDateString() : "no end date"} · {money(a.price_cents)} {PAY[a.payment_status].toLowerCase()}
                  </p>
                  <p className="num text-xs text-slate-500">{t.views.toLocaleString()} views · {t.clicks.toLocaleString()} clicks · {t.views ? `${((t.clicks / t.views) * 100).toFixed(1)}%` : "—"} click rate</p>
                  {stateOf(a) === "not_showing" && <p className="text-xs text-rose-700">Hidden because its listing isn't published or its brand is inactive.</p>}
                </div>
                <div className="flex gap-1.5">
                  <button className="btn-outline px-2.5 py-1.5 text-xs" aria-label={a.is_active ? "Pause" : "Resume"} title={a.is_active ? "Pause" : "Resume"} disabled={toggle.isPending} onClick={() => toggle.mutate(a)}>{a.is_active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}</button>
                  <button className="btn-outline px-2.5 py-1.5 text-xs" aria-label="Edit" onClick={() => setEditing(a)}><Pencil className="h-3.5 w-3.5" /></button>
                  <button className="btn-outline px-2.5 py-1.5 text-xs text-rose-700" aria-label="Delete" disabled={remove.isPending}
                    onClick={() => confirm(`Delete "${a.title}" and its statistics?`) && remove.mutate(a)}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const toLocal = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");

function AdForm({ ad, onDone }: { ad: Ad | null; onDone: (saved: boolean) => void }) {
  const { data: categories = [] } = useCategories();
  const listings = useQuery({ queryKey: ["admin-listings", "published"], queryFn: () => api.listAllListings("published") });
  const brands = useQuery({ queryKey: ["brands"], queryFn: () => api.listBrands() });
  const vendors = useQuery({ queryKey: ["admin-vendors"], queryFn: () => api.listVendors() });
  const [f, setF] = useState({
    kind: (ad?.kind ?? "featured_listing") as AdKind, title: ad?.title ?? "", body: ad?.body ?? "", advertiser: ad?.advertiser ?? "",
    vendor_id: ad?.vendor_id ?? "", target: ad?.listing_id ? "listing" : ad?.brand_id ? "brand" : ad?.link_url ? "link" : "listing",
    listing_id: ad?.listing_id ?? "", brand_id: ad?.brand_id ?? "", link_url: ad?.link_url ?? "", category_id: ad?.category_id ?? "",
    image_url: ad?.image_url ?? "", starts_at: toLocal(ad?.starts_at) || new Date().toISOString().slice(0, 10), ends_at: toLocal(ad?.ends_at),
    priority: String(ad?.priority ?? 0), price: ad?.price_cents != null ? String(ad.price_cents / 100) : "", payment_status: (ad?.payment_status ?? "unpaid") as PaymentStatus,
    notes: ad?.notes ?? "", is_active: ad?.is_active ?? true,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const bind = (k: "title" | "body" | "advertiser" | "link_url" | "starts_at" | "ends_at" | "priority" | "price" | "notes") =>
    ({ value: f[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value) });
  const target = f.kind === "featured_listing" ? "listing" : f.target;

  const save = useMutation({
    mutationFn: () => {
      const input: AdInput = {
        id: ad?.id, kind: f.kind, title: f.title.trim(), body: f.body.trim() || null, advertiser: f.advertiser.trim(),
        vendor_id: f.vendor_id || null,
        listing_id: target === "listing" ? f.listing_id || null : null,
        brand_id: target === "brand" ? f.brand_id || null : null,
        link_url: target === "link" ? f.link_url.trim() || null : null,
        category_id: f.kind === "category_sponsor" ? f.category_id || null : null,
        image_url: f.image_url.trim() || null,
        starts_at: new Date(f.starts_at + "T00:00:00").toISOString(),
        ends_at: f.ends_at ? new Date(f.ends_at + "T23:59:59").toISOString() : null,
        priority: Number(f.priority) || 0, price_cents: f.price ? Math.round(Number(f.price) * 100) : null,
        payment_status: f.payment_status, notes: f.notes.trim() || null, is_active: f.is_active,
      };
      return api.saveAd(input);
    },
    onSuccess: () => onDone(true),
  });

  const pick = (on: boolean) => `rounded-xl border p-2.5 text-left text-sm ${on ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100" : "border-slate-200 bg-white"}`;
  return (
    <form className="card space-y-4 p-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <h2 className="font-semibold">{ad ? "Edit ad" : "New ad"}</h2>
      <div className="grid gap-2 sm:grid-cols-3">
        {(Object.keys(AD_KIND_LABEL) as AdKind[]).map((k) => (
          <button key={k} type="button" aria-pressed={f.kind === k} className={pick(f.kind === k)} onClick={() => set("kind", k)}>
            <b className="block">{AD_KIND_LABEL[k]}</b>
            <span className="text-xs text-slate-500">{k === "featured_listing" ? "Pins a listing at the top of the Market and its category." : k === "home_banner" ? "Large image banner at the top of the Market." : "Shown first on one category page."}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title (shown to users)"><input id="ad-title" className="input" maxLength={80} required {...bind("title")} /></Field>
        <Field label="Advertiser"><input id="ad-advertiser" className="input" maxLength={120} required {...bind("advertiser")} /></Field>
      </div>
      {f.kind !== "featured_listing" && <Field label="Short text (optional)"><textarea id="ad-body" className="input" rows={2} maxLength={160} {...bind("body")} /></Field>}

      {f.kind === "category_sponsor" && (
        <Field label="Category">
          <select id="ad-category" className="input" required value={f.category_id} onChange={(e) => set("category_id", e.target.value)}>
            <option value="">Choose a category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      )}

      <div>
        <span className="label">Where the ad goes</span>
        {f.kind !== "featured_listing" && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {([["listing", "A listing"], ["brand", "A brand page"], ["link", "A website"]] as const).map(([t, label]) => (
              <button key={t} type="button" aria-pressed={f.target === t} onClick={() => set("target", t)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${f.target === t ? "border-ink bg-ink text-white" : "border-slate-200 bg-white"}`}>{label}</button>
            ))}
          </div>
        )}
        {target === "listing" && (
          <select id="ad-listing" className="input" required value={f.listing_id} onChange={(e) => set("listing_id", e.target.value)}>
            <option value="">Choose a published listing</option>
            {listings.data?.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
        )}
        {target === "brand" && (
          <select id="ad-brand" className="input" required value={f.brand_id} onChange={(e) => set("brand_id", e.target.value)}>
            <option value="">Choose a brand</option>
            {brands.data?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        {target === "link" && <input id="ad-link" className="input" type="url" placeholder="https://" required {...bind("link_url")} />}
      </div>

      {f.kind !== "featured_listing" && (
        <div>
          <Field label={f.kind === "home_banner" ? "Banner image (wide, about 1200 × 500)" : "Image (optional)"}>
            <input id="ad-image" className="input" type="url" placeholder="https://" value={f.image_url} onChange={(e) => set("image_url", e.target.value)} required={f.kind === "home_banner"} />
          </Field>
          <div className="mt-2 flex items-center gap-2">
            {f.image_url && <img src={f.image_url} alt="" className="h-12 w-28 rounded-lg border border-slate-200 object-cover" />}
            <ImageUpload folder="staff" label="Upload image" onUploaded={(url) => set("image_url", url)} />
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Starts"><input id="ad-start" className="input" type="date" required {...bind("starts_at")} /></Field>
        <Field label="Ends (optional)"><input id="ad-end" className="input" type="date" min={f.starts_at} {...bind("ends_at")} /></Field>
        <Field label="Priority" hint="Higher shows first"><input className="input" type="number" min={0} max={100} {...bind("priority")} /></Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Price (USD)"><input id="ad-price" className="input" type="number" min={0} step="0.01" {...bind("price")} /></Field>
        <Field label="Payment">
          <select id="ad-payment" className="input" value={f.payment_status} onChange={(e) => set("payment_status", e.target.value as PaymentStatus)}>
            {(Object.keys(PAY) as PaymentStatus[]).map((p) => <option key={p} value={p}>{PAY[p]}</option>)}
          </select>
        </Field>
        <Field label="Business account (optional)">
          <select className="input" value={f.vendor_id} onChange={(e) => set("vendor_id", e.target.value)}>
            <option value="">None</option>
            {vendors.data?.map((v) => <option key={v.id} value={v.id}>{v.business_name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Internal notes (staff only)"><textarea className="input" rows={2} {...bind("notes")} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_active} onChange={(e) => set("is_active", e.target.checked)} /> Active (shows between the start and end dates)</label>

      <p className="flex items-center gap-2 text-xs text-slate-500"><SponsoredBadge /> Users always see this label on the ad.</p>
      <ErrorNote error={save.error} />
      <div className="flex gap-2">
        <button className="btn-primary" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save ad"}</button>
        <button type="button" className="btn-outline" onClick={() => onDone(false)}>Cancel</button>
      </div>
    </form>
  );
}

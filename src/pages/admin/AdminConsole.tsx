import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, History, Pencil, Plus, ShieldAlert, Timer } from "lucide-react";
import { api } from "@/lib/api";
import {
  STATUS_LABEL, type Brand, type Listing, type ListingStatus, type ReviewType, type Vendor,
} from "@/lib/types";
import ListingForm from "@/components/ListingForm";
import ClicksChart from "./ClicksChart";
import { EmptyState, ErrorNote, Field, Spinner, SponsoredBadge, StatusBadge, formatPrice, useCategories, useViewer } from "@/components/ui";

type Tab = "queue" | "listings" | "vendors" | "brands" | "analytics";
const TABS: { id: Tab; label: string }[] = [
  { id: "queue", label: "Review queue" },
  { id: "listings", label: "All listings" },
  { id: "vendors", label: "Vendors" },
  { id: "brands", label: "Brands" },
  { id: "analytics", label: "Analytics" },
];

export default function AdminConsole() {
  const { data: viewer, isLoading } = useViewer();
  const [tab, setTab] = useState<Tab>("queue");
  if (isLoading) return <Spinner />;
  if (!viewer?.isStaff) return <EmptyState title="Reviewers only">You need the admin or reviewer role to open the review console.</EmptyState>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Marketplace review console</h1>
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${tab === t.id ? "border-brand-600 font-semibold text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "queue" && <ListingsTab status="pending_review" />}
      {tab === "listings" && <ListingsTab />}
      {tab === "vendors" && <VendorsTab />}
      {tab === "brands" && <BrandsTab />}
      {tab === "analytics" && <AnalyticsTab />}
    </div>
  );
}

function ListingsTab({ status }: { status?: ListingStatus }) {
  const qc = useQueryClient();
  const { data: categories = [] } = useCategories();
  const brands = useQuery({ queryKey: ["brands"], queryFn: () => api.listBrands() });
  const [filter, setFilter] = useState<ListingStatus | "">("");
  const effective = status ?? (filter || undefined);
  const listings = useQuery({ queryKey: ["admin-listings", effective], queryFn: () => api.listAllListings(effective) });
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<Listing | "new" | null>(null);
  const expire = useMutation({ mutationFn: () => api.expireListings(), onSuccess: () => qc.invalidateQueries() });

  if (editing) {
    return (
      <ListingForm initial={editing === "new" ? null : editing} vendorId={null} staff brands={brands.data ?? []} categories={categories}
        onSaved={() => { setEditing(null); qc.invalidateQueries(); }} onCancel={() => setEditing(null)} />
    );
  }

  const current = listings.data?.find((l) => l.id === selected);

  return (
    <div className="space-y-3">
      {!status && (
        <div className="flex flex-wrap items-center gap-2">
          <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value as ListingStatus | "")}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="btn-primary" onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> New listing</button>
          <button className="btn-outline" onClick={() => expire.mutate()} disabled={expire.isPending}>
            <Timer className="h-4 w-4" /> Expire outdated listings
          </button>
          {expire.isSuccess && <span className="text-sm text-slate-600">{expire.data} expired</span>}
        </div>
      )}
      {listings.isLoading ? <Spinner /> : !listings.data?.length ? (
        <EmptyState title={status ? "Nothing waiting for review" : "No listings"} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="card divide-y divide-slate-100 lg:col-span-2">
            {listings.data.map((l) => (
              <button key={l.id} onClick={() => setSelected(l.id)}
                className={`flex w-full flex-col items-start gap-1 p-3 text-left hover:bg-slate-50 ${selected === l.id ? "bg-brand-50" : ""}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{l.title}</span>
                  <StatusBadge status={l.status} />
                  {l.is_regulated && <span className="badge bg-violet-100 text-violet-800">Regulated</span>}
                </div>
                <span className="text-xs text-slate-500">
                  {categories.find((c) => c.id === l.category_id)?.name} · {brands.data?.find((b) => b.id === l.brand_id)?.name ?? "No brand"} · updated {new Date(l.updated_at).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
          <div className="lg:col-span-3">
            {current ? <ReviewPanel key={current.id} listing={current} brands={brands.data ?? []} onEdit={() => setEditing(current)} />
              : <EmptyState title="Select a listing to review" />}
          </div>
        </div>
      )}
    </div>
  );
}

const CHECKS = [
  { id: "claims", label: "Claims supported by evidence" },
  { id: "pricing", label: "Pricing verified (or hidden)" },
  { id: "disclaimers", label: "Disclaimers and disclosures present" },
  { id: "legal", label: "Legal / advertising review complete", regulatedOnly: true },
];

function ReviewPanel({ listing: l, brands, onEdit }: { listing: Listing; brands: Brand[]; onEdit: () => void }) {
  const qc = useQueryClient();
  const { data: categories = [] } = useCategories();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState("");
  const [noteType, setNoteType] = useState<ReviewType>("advertising");
  const [note, setNote] = useState("");
  const history = useQuery({ queryKey: ["reviews", l.id], queryFn: () => api.listReviews(l.id) });

  const required = CHECKS.filter((c) => !c.regulatedOnly || l.is_regulated);
  const allChecked = required.every((c) => checked[c.id]);

  const setStatus = useMutation({
    mutationFn: ({ status, why }: { status: ListingStatus; why?: string }) => api.setListingStatus(l.id, status, why),
    onSuccess: () => qc.invalidateQueries(),
  });
  const addNote = useMutation({
    mutationFn: () => api.addReviewNote(l.id, noteType, note.trim()),
    onSuccess: () => { setNote(""); qc.invalidateQueries({ queryKey: ["reviews", l.id] }); },
  });

  const brand = brands.find((b) => b.id === l.brand_id);
  const price = formatPrice(l);
  const missing = [
    !l.destination_url && "destination URL",
    !l.summary && "summary",
    l.is_regulated && !l.disclaimer && "disclaimer (regulated)",
    l.is_regulated && !l.eligibility && "eligibility (regulated)",
    l.listing_type === "product" && !l.refund_policy && "refund policy",
  ].filter(Boolean) as string[];

  return (
    <div className="card space-y-4 p-4">
      <div className="flex flex-wrap items-start gap-2">
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{l.title}</h2>
          <p className="text-xs text-slate-500">
            {categories.find((c) => c.id === l.category_id)?.name} · {l.listing_type} · {brand?.name ?? "no brand"}
          </p>
        </div>
        <StatusBadge status={l.status} />
        {l.is_sponsored && <SponsoredBadge />}
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-slate-500">Price</dt><dd>{price ?? (l.price_cents != null ? `${(l.price_cents / 100).toFixed(2)} ${l.currency} (unverified, hidden)` : "—")}</dd>
        <dt className="text-slate-500">Destination</dt><dd className="truncate">{l.destination_url ?? "—"}</dd>
        <dt className="text-slate-500">Evidence</dt><dd>{l.evidence_summary ? "Provided" : "None"}{l.evidence_urls.length ? ` · ${l.evidence_urls.length} link(s)` : ""}</dd>
        <dt className="text-slate-500">Min age</dt><dd>{l.min_age ?? "—"}</dd>
        <dt className="text-slate-500">Expires</dt><dd>{l.expires_at ? new Date(l.expires_at).toLocaleDateString() : "—"}</dd>
      </dl>

      {l.is_regulated && (
        <p className="flex gap-2 rounded-xl bg-violet-50 p-3 text-sm text-violet-900">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          Regulated listing: confirm legal and advertising review before publishing. Do not list prescription medications as products.
        </p>
      )}
      {missing.length > 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Missing: {missing.join(", ")}</p>}

      <div className="flex flex-wrap gap-2">
        <Link to={`/market/listing/${l.slug}`} target="_blank" className="btn-outline px-3 py-1.5 text-xs"><ExternalLink className="h-3.5 w-3.5" /> Preview</Link>
        <button className="btn-outline px-3 py-1.5 text-xs" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /> Edit</button>
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Review checklist</h3>
        {required.map((c) => (
          <label key={c.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!checked[c.id]} onChange={(e) => setChecked({ ...checked, [c.id]: e.target.checked })} />
            {c.label}
          </label>
        ))}
      </div>

      <ErrorNote error={setStatus.error} />
      <div className="flex flex-wrap gap-2">
        <button className="btn-outline" disabled={!allChecked || setStatus.isPending} onClick={() => setStatus.mutate({ status: "approved" })}>
          <CheckCircle2 className="h-4 w-4" /> Approve
        </button>
        <button className="btn-primary" disabled={!allChecked || setStatus.isPending} onClick={() => setStatus.mutate({ status: "published" })}>
          Publish
        </button>
        <button className="btn-outline" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ status: "draft" })}>Request changes</button>
        {l.status === "published" && (
          <button className="btn-outline" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ status: "approved" })}>Unpublish</button>
        )}
      </div>
      <div className="flex gap-2">
        <input className="input" placeholder="Rejection reason (shown to vendor)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <button className="btn-danger" disabled={!reason.trim() || setStatus.isPending} onClick={() => setStatus.mutate({ status: "rejected", why: reason.trim() })}>
          Reject
        </button>
      </div>

      <form className="space-y-2 border-t border-slate-100 pt-3" onSubmit={(e) => { e.preventDefault(); addNote.mutate(); }}>
        <h3 className="text-sm font-semibold">Add review note</h3>
        <div className="flex gap-2">
          <select className="input w-40" value={noteType} onChange={(e) => setNoteType(e.target.value as ReviewType)}>
            <option value="advertising">Advertising</option>
            <option value="regulatory">Regulatory</option>
            <option value="clinical">Clinical</option>
            <option value="legal">Legal</option>
          </select>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" />
          <button className="btn-outline" disabled={!note.trim() || addNote.isPending}>Add</button>
        </div>
      </form>

      <div>
        <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold"><History className="h-4 w-4" /> History</h3>
        <ol className="space-y-2 border-l-2 border-slate-200 pl-3 text-sm">
          {history.data?.map((r) => (
            <li key={r.id}>
              <span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString()} · </span>
              {r.review_type === "status_change"
                ? <>Status {r.from_status ? <>{STATUS_LABEL[r.from_status]} → </> : "set to "}<b>{r.to_status && STATUS_LABEL[r.to_status]}</b></>
                : <span className="capitalize">{r.review_type} note</span>}
              {r.notes && <p className="text-slate-600">{r.notes}</p>}
            </li>
          ))}
          {!history.data?.length && <li className="text-slate-500">No history yet.</li>}
        </ol>
      </div>
    </div>
  );
}

function VendorsTab() {
  const qc = useQueryClient();
  const vendors = useQuery({ queryKey: ["admin-vendors"], queryFn: () => api.listVendors() });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Vendor["status"] }) => api.setVendorStatus(id, status),
    onSuccess: () => qc.invalidateQueries(),
  });
  if (vendors.isLoading) return <Spinner />;
  if (!vendors.data?.length) return <EmptyState title="No vendor applications yet" />;
  const style = { pending: "bg-amber-100 text-amber-800", approved: "bg-emerald-100 text-emerald-800", suspended: "bg-rose-100 text-rose-800" };
  return (
    <div className="card divide-y divide-slate-100">
      {vendors.data.map((v) => (
        <div key={v.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
          <div className="flex-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{v.business_name}</span>
              <span className={`badge ${style[v.status]}`}>{v.status}</span>
            </div>
            <p className="text-xs text-slate-500">{v.contact_email} · {v.website_url ?? "no website"} · applied {new Date(v.created_at).toLocaleDateString()}</p>
            {v.description && <p className="text-slate-600">{v.description}</p>}
            {v.credentials && <p className="text-xs text-slate-600">Credentials: {v.credentials}</p>}
          </div>
          <div className="flex gap-2">
            {v.status !== "approved" && <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => update.mutate({ id: v.id, status: "approved" })}>Approve</button>}
            {v.status !== "suspended" && <button className="btn-outline px-3 py-1.5 text-xs" onClick={() => update.mutate({ id: v.id, status: "suspended" })}>Suspend</button>}
          </div>
        </div>
      ))}
    </div>
  );
}

function BrandsTab() {
  const qc = useQueryClient();
  const brands = useQuery({ queryKey: ["brands"], queryFn: () => api.listBrands() });
  const [editing, setEditing] = useState<Brand | null>(null);
  const toggle = useMutation({
    mutationFn: (b: Brand) => api.updateBrand(b.id, { is_featured: !b.is_featured }),
    onSuccess: () => qc.invalidateQueries(),
  });
  if (brands.isLoading) return <Spinner />;
  if (editing) return <BrandForm brand={editing} onDone={() => { setEditing(null); qc.invalidateQueries(); }} />;
  return (
    <div className="card divide-y divide-slate-100">
      {brands.data?.map((b) => (
        <div key={b.id} className="flex items-center gap-3 p-3">
          <div className="flex-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{b.name}</span>
              {b.is_owned_brand && <span className="badge bg-slate-100 text-slate-600">Affiliated</span>}
              {b.is_featured && <SponsoredBadge label="Featured" />}
            </div>
            <p className="text-xs text-slate-500">{b.tagline}</p>
          </div>
          <button className="btn-outline px-3 py-1.5 text-xs" onClick={() => toggle.mutate(b)}>{b.is_featured ? "Unfeature" : "Feature"}</button>
          <button className="btn-outline px-3 py-1.5 text-xs" onClick={() => setEditing(b)}><Pencil className="h-3.5 w-3.5" /></button>
        </div>
      ))}
    </div>
  );
}

function BrandForm({ brand, onDone }: { brand: Brand; onDone: () => void }) {
  const [f, setF] = useState({
    tagline: brand.tagline ?? "", description: brand.description ?? "", logo_url: brand.logo_url ?? "",
    website_url: brand.website_url ?? "", affiliation_disclosure: brand.affiliation_disclosure ?? "",
  });
  const bind = (k: keyof typeof f) => ({ value: f[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value }) });
  const save = useMutation({
    mutationFn: () => api.updateBrand(brand.id, Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim() || null]))),
    onSuccess: onDone,
  });
  return (
    <form className="card space-y-3 p-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <h2 className="font-semibold">Edit {brand.name}</h2>
      <Field label="Tagline"><input className="input" {...bind("tagline")} /></Field>
      <Field label="Description"><textarea className="input" rows={4} {...bind("description")} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Logo URL"><input className="input" type="url" {...bind("logo_url")} /></Field>
        <Field label="Website URL"><input className="input" type="url" {...bind("website_url")} /></Field>
      </div>
      <Field label="Affiliation disclosure" hint="Required for owned or sponsored brands."><textarea className="input" rows={2} {...bind("affiliation_disclosure")} /></Field>
      <ErrorNote error={save.error} />
      <div className="flex gap-2">
        <button className="btn-primary" disabled={save.isPending}>Save</button>
        <button type="button" className="btn-outline" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}

function AnalyticsTab() {
  const listings = useQuery({ queryKey: ["admin-listings", undefined], queryFn: () => api.listAllListings() });
  const clicks = useQuery({ queryKey: ["admin-clicks"], queryFn: () => api.listClicks() });
  const inquiries = useQuery({ queryKey: ["admin-inquiries"], queryFn: () => api.listInquiries() });

  const byDay = useMemo(() => {
    const m = new Map<string, number>();
    clicks.data?.forEach((c) => m.set(c.day, (m.get(c.day) ?? 0) + c.click_count));
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([day, value]) => ({ day, value }));
  }, [clicks.data]);

  const rows = useMemo(() => (listings.data ?? []).map((l) => ({
    l,
    clicks: clicks.data?.filter((c) => c.listing_id === l.id).reduce((a, c) => a + c.click_count, 0) ?? 0,
    inquiries: inquiries.data?.filter((q) => q.listing_id === l.id).length ?? 0,
  })).sort((a, b) => b.clicks - a.clicks), [listings.data, clicks.data, inquiries.data]);

  if (clicks.isLoading || listings.isLoading) return <Spinner />;
  const total = byDay.reduce((a, d) => a + d.value, 0);

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="font-semibold">Outbound clicks per day</h2>
        <p className="mb-3 text-xs text-slate-500">Last {byDay.length} days · {total} clicks · aggregate counts only, no user identifiers</p>
        <ClicksChart data={byDay} />
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr><th className="p-3">Listing</th><th className="p-3">Status</th><th className="p-3 text-right">Clicks</th><th className="p-3 text-right">Inquiries</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ l, clicks: c, inquiries: q }) => (
              <tr key={l.id}>
                <td className="p-3">{l.title}</td>
                <td className="p-3"><StatusBadge status={l.status} /></td>
                <td className="p-3 text-right tabular-nums">{c}</td>
                <td className="p-3 text-right tabular-nums">{q}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

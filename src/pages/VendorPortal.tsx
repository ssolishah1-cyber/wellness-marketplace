import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Eye, MousePointerClick, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Listing, Vendor } from "@/lib/types";
import ListingForm from "@/components/ListingForm";
import { EmptyState, ErrorNote, Field, Spinner, StatusBadge, useCategories, useViewer } from "@/components/ui";

export default function VendorPortal() {
  const { data: viewer, isLoading } = useViewer();
  const vendor = useQuery({ queryKey: ["my-vendor"], queryFn: () => api.getMyVendor(), enabled: !!viewer?.userId });

  if (isLoading || vendor.isLoading) return <Spinner />;
  if (!viewer?.userId) return <EmptyState title="Sign in to advertise your business">Vendor accounts are linked to your app login.</EmptyState>;
  if (!vendor.data) return <ApplyForm />;
  if (vendor.data.status === "pending") {
    return (
      <EmptyState title="Application pending review">
        Thanks, {vendor.data.business_name}. We verify every business before it can list. You'll be able to create listings once approved.
      </EmptyState>
    );
  }
  if (vendor.data.status === "suspended") return <EmptyState title="Vendor account suspended">Please contact the marketplace team.</EmptyState>;
  return <Dashboard vendor={vendor.data} />;
}

function ApplyForm() {
  const qc = useQueryClient();
  const [f, setF] = useState({ business_name: "", contact_email: "", website_url: "", description: "", credentials: "" });
  const bind = (k: keyof typeof f) => ({ value: f[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value }) });
  const apply = useMutation({
    mutationFn: () => api.applyAsVendor(f),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-vendor"] }),
  });
  return (
    <form className="card mx-auto max-w-xl space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); apply.mutate(); }}>
      <h1 className="text-xl font-bold">Advertise your wellness business</h1>
      <p className="text-sm text-slate-600">
        Dietitians, nutrition coaches, fitness and wellness businesses can apply. Every business and listing is reviewed before it appears in the Market.
      </p>
      <Field label="Business name *"><input className="input" required {...bind("business_name")} /></Field>
      <Field label="Contact email *"><input className="input" type="email" required {...bind("contact_email")} /></Field>
      <Field label="Website"><input className="input" type="url" placeholder="https://" {...bind("website_url")} /></Field>
      <Field label="What do you offer?"><textarea className="input" rows={3} {...bind("description")} /></Field>
      <Field label="Credentials / licences" hint="e.g. registered dietitian number, certifications"><textarea className="input" rows={2} {...bind("credentials")} /></Field>
      <ErrorNote error={apply.error} />
      <button className="btn-primary" disabled={apply.isPending}>Submit application</button>
    </form>
  );
}

function Dashboard({ vendor }: { vendor: Vendor }) {
  const qc = useQueryClient();
  const { data: categories = [] } = useCategories();
  const brands = useQuery({ queryKey: ["brands"], queryFn: () => api.listBrands() });
  const listings = useQuery({ queryKey: ["vendor-listings", vendor.id], queryFn: () => api.listVendorListings(vendor.id) });
  const ids = listings.data?.map((l) => l.id);
  const clicks = useQuery({ queryKey: ["vendor-clicks", ids], queryFn: () => api.listClicks(ids), enabled: !!ids });
  const inquiries = useQuery({ queryKey: ["vendor-inquiries", ids], queryFn: () => api.listInquiries(ids), enabled: !!ids });
  const [editing, setEditing] = useState<Listing | "new" | null>(null);

  const refresh = () => qc.invalidateQueries();
  const submit = useMutation({ mutationFn: (l: Listing) => api.saveListing({ id: l.id, title: l.title, category_id: l.category_id, status: "pending_review" }), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (id: string) => api.deleteListing(id), onSuccess: refresh });

  const clickTotal = (id: string) => clicks.data?.filter((c) => c.listing_id === id).reduce((a, c) => a + c.click_count, 0) ?? 0;

  if (editing) {
    return (
      <ListingForm
        initial={editing === "new" ? null : editing}
        vendorId={vendor.id}
        staff={false}
        brands={brands.data ?? []}
        categories={categories}
        onSaved={() => { setEditing(null); refresh(); }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  const live = listings.data?.filter((l) => l.status === "published").length ?? 0;
  const pending = listings.data?.filter((l) => l.status === "pending_review").length ?? 0;
  const totalClicks = clicks.data?.reduce((a, c) => a + c.click_count, 0) ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold">{vendor.business_name}</h1>
          <p className="text-sm text-slate-600">Vendor portal · verified business</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> New listing</button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat icon={<Eye className="h-4 w-4" />} label="Live listings" value={live} />
        <Stat icon={<Clock className="h-4 w-4" />} label="In review" value={pending} />
        <Stat icon={<MousePointerClick className="h-4 w-4" />} label="Clicks (all time)" value={totalClicks} />
      </div>

      <p className="text-xs text-slate-500">Editing a live listing sends it back for review. Only the marketplace team can approve, publish or mark listings as sponsored.</p>

      <ErrorNote error={submit.error || remove.error} />
      {listings.isLoading ? <Spinner /> : listings.data?.length ? (
        <div className="card divide-y divide-slate-100">
          {listings.data.map((l) => (
            <div key={l.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/market/listing/${l.slug}`} className="font-medium hover:text-brand-700">{l.title}</Link>
                  <StatusBadge status={l.status} />
                </div>
                <p className="text-xs text-slate-500">
                  {categories.find((c) => c.id === l.category_id)?.name} · {clickTotal(l.id)} clicks · updated {new Date(l.updated_at).toLocaleDateString()}
                </p>
                {l.status === "rejected" && l.rejection_reason && (
                  <p className="mt-1 rounded-lg bg-rose-50 p-2 text-xs text-rose-800">Reviewer feedback: {l.rejection_reason}</p>
                )}
              </div>
              <div className="flex gap-2">
                {(l.status === "draft" || l.status === "rejected") && (
                  <button className="btn-outline px-3 py-1.5 text-xs" onClick={() => submit.mutate(l)}><Send className="h-3.5 w-3.5" /> Submit</button>
                )}
                <button className="btn-outline px-3 py-1.5 text-xs" onClick={() => setEditing(l)}><Pencil className="h-3.5 w-3.5" /> Edit</button>
                {(l.status === "draft" || l.status === "rejected") && (
                  <button className="btn-outline px-3 py-1.5 text-xs text-rose-700" onClick={() => confirm("Delete this listing?") && remove.mutate(l.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : <EmptyState title="No listings yet">Create your first listing and submit it for review.</EmptyState>}

      <section>
        <h2 className="mb-2 font-semibold">Inquiries</h2>
        {inquiries.data?.length ? (
          <div className="card divide-y divide-slate-100">
            {inquiries.data.map((q) => (
              <div key={q.id} className="p-3 text-sm">
                <p className="font-medium">{q.contact_name} · <a className="text-brand-700" href={`mailto:${q.contact_email}`}>{q.contact_email}</a></p>
                <p className="text-xs text-slate-500">{listings.data?.find((l) => l.id === q.listing_id)?.title} · {new Date(q.created_at).toLocaleString()}</p>
                <p className="mt-1 whitespace-pre-line text-slate-700">{q.message}</p>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-slate-500">No inquiries yet.</p>}
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="card p-3">
      <div className="flex items-center gap-1 text-xs text-slate-500">{icon}{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

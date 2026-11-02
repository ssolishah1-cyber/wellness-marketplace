import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, CreditCard, ExternalLink } from "lucide-react";
import { access, isLive, type BookClaim } from "@/lib/access";
import { planById } from "@/lib/plans";
import { manageSubscriptionsUrl } from "@/lib/purchases";
import { useAccess } from "./access";
import { ErrorNote, Field } from "./ui";
import { useToast } from "./Toast";

const date = (s: string | null) => (s ? new Date(s).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "");

/** Profile → Your plan. Hidden while payments are switched off. */
export function YourPlan() {
  const a = useAccess();
  if (!a.paywall) return null;
  const s = a.sub;
  const live = isLive(s);
  const plan = planById(s?.plan);
  return (
    <section className="card grid animate-rise gap-3 p-4" aria-label="Your plan">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-base font-bold"><CreditCard className="h-4 w-4 text-brand-700" /> Your plan</h2>
        <Link to="/plans" className="text-sm font-semibold text-brand-700">{live ? "Change plan" : "See plans"}</Link>
      </div>
      {live && plan ? (
        <p className="text-sm text-ink-2">
          <b className="text-ink">{plan.name}</b>{s!.term_months > 1 ? `, ${s!.term_months}-month` : ", monthly"} ·{" "}
          {s!.status === "trialing" ? `free trial until ${date(s!.current_period_end)}`
            : s!.status === "canceled" ? `cancelled, access until ${date(s!.current_period_end)}`
            : s!.status === "past_due" ? "payment problem: please update your payment method in the store"
            : `renews ${date(s!.current_period_end)}`}
        </p>
      ) : <p className="text-sm text-ink-2">No active plan. Nutrition, workouts and condition guides need a plan; the Market is free.</p>}
      {live && s!.store !== "manual" && (
        <a href={manageSubscriptionsUrl} target="_blank" rel="noopener noreferrer" className="flex w-fit items-center gap-1 text-xs font-semibold text-brand-700">
          <ExternalLink className="h-3.5 w-3.5" /> Manage or cancel in your {s!.store === "play_store" ? "Google Play" : "App Store"} account
        </a>
      )}
      {live && s!.plan === "max" && s!.status !== "trialing" && <BookClaimForm />}
    </section>
  );
}

function BookClaimForm() {
  const qc = useQueryClient();
  const toast = useToast();
  const claim = useQuery({ queryKey: ["book-claim"], queryFn: () => access.myBookClaim() });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<BookClaim>({ full_name: "", address_line1: "", address_line2: "", city: "", region: "", postal_code: "", country: "United States" });
  const send = useMutation({
    mutationFn: () => access.claimBook({ ...f, address_line2: f.address_line2?.trim() || null }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["book-claim"] }); toast("Thanks! We'll ship your book soon."); setOpen(false); },
  });
  if (claim.isLoading) return null;
  if (claim.data) return <p className="flex items-center gap-1.5 rounded-xl bg-citrus-50 p-2.5 text-xs text-citrus-600"><BookOpen className="h-3.5 w-3.5" /> Free book: {claim.data.status === "shipped" ? "shipped" : "requested, shipping soon"}</p>;
  if (!open) return <button type="button" className="btn-outline justify-start" onClick={() => setOpen(true)}><BookOpen className="h-4 w-4" /> Claim your free book</button>;
  const bind = (k: keyof BookClaim) => ({ value: (f[k] as string) ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value }) });
  return (
    <form className="grid gap-2 rounded-xl border border-[#d8e2d9] p-3" onSubmit={(e) => { e.preventDefault(); send.mutate(); }}>
      <b className="text-sm">Where should we send your book?</b>
      <Field label="Full name"><input id="book-name" className="input" required minLength={2} maxLength={120} autoComplete="name" {...bind("full_name")} /></Field>
      <Field label="Address"><input id="book-line1" className="input" required minLength={3} maxLength={200} autoComplete="address-line1" {...bind("address_line1")} /></Field>
      <Field label="Apartment, suite (optional)"><input className="input" maxLength={200} autoComplete="address-line2" {...bind("address_line2")} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="City"><input id="book-city" className="input" required maxLength={100} autoComplete="address-level2" {...bind("city")} /></Field>
        <Field label="State"><input id="book-region" className="input" required maxLength={100} autoComplete="address-level1" {...bind("region")} /></Field>
        <Field label="ZIP code"><input id="book-zip" className="input" required minLength={2} maxLength={20} autoComplete="postal-code" {...bind("postal_code")} /></Field>
        <Field label="Country"><input className="input" required maxLength={60} autoComplete="country-name" {...bind("country")} /></Field>
      </div>
      <p className="text-[11px] text-ink-muted">Used only to ship your book.</p>
      <ErrorNote error={send.error} />
      <div className="flex gap-2"><button className="btn-primary" disabled={send.isPending}>Send my book</button><button type="button" className="btn-outline" onClick={() => setOpen(false)}>Cancel</button></div>
    </form>
  );
}

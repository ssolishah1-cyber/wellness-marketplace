import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Power, Truck } from "lucide-react";
import { access } from "@/lib/access";
import { COMMISSION_USD, PLANS, TERMS, termPrice, usd, type PlanId } from "@/lib/plans";
import { purchasesAvailable } from "@/lib/purchases";
import { ErrorNote, Spinner } from "@/components/ui";
import { useToast } from "@/components/Toast";

export default function SubscriptionsTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const stats = useQuery({ queryKey: ["admin-sub-stats"], queryFn: () => access.stats() });
  const claims = useQuery({ queryKey: ["admin-book-claims"], queryFn: () => access.bookClaims() });
  const refresh = () => Promise.all(["admin-sub-stats", "paywall", "admin-book-claims"].map((k) => qc.invalidateQueries({ queryKey: [k] })));
  const toggle = useMutation({ mutationFn: (on: boolean) => access.setPaywall(on), onSuccess: async (_, on) => { await refresh(); toast(on ? "Payments switched on" : "Payments switched off: everything is free"); } });
  const ship = useMutation({ mutationFn: (id: string) => access.markShipped(id), onSuccess: refresh });

  if (stats.isLoading) return <Spinner />;
  const s = stats.data;
  if (!s) return <ErrorNote error={stats.error} />;
  const flip = () => {
    const on = !s.paywall_enabled;
    if (on && !confirm("Switch payments on? People without a plan will lose access to nutrition, workouts and guides. Only do this once the plans are approved in the App Store.")) return;
    toggle.mutate(on);
  };

  return (
    <div className="space-y-4">
      <section className={`card flex flex-wrap items-center gap-3 p-4 ${s.paywall_enabled ? "border-emerald-300" : "border-amber-300"}`}>
        <Power className={`h-6 w-6 ${s.paywall_enabled ? "text-emerald-600" : "text-amber-600"}`} />
        <div className="min-w-0 flex-1">
          <b>Payments are {s.paywall_enabled ? "ON" : "OFF"}</b>
          <p className="text-xs text-slate-500">{s.paywall_enabled ? "Nutrition, workouts and guides need a plan. The Market is free." : "Everything is free for everyone. Switch on once the plans are live in the App Store."}{!purchasesAvailable && " (Buying works in the phone app.)"}</p>
        </div>
        <button className={s.paywall_enabled ? "btn-outline" : "btn-primary"} disabled={toggle.isPending} onClick={flip}>{s.paywall_enabled ? "Switch off" : "Switch on"}</button>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile k="Paying subscribers" v={String(s.paying)} />
        <Tile k="In free trial" v={String(s.trialing)} />
        <Tile k="Commission this month" v={usd(s.commission_month_usd)} sub="Soli: $0.50 / $0.75 / $1.00 per paying subscriber" />
        <Tile k="Books to ship" v={String(s.book_claims_waiting)} />
      </div>

      <section className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr><th className="p-3">Plan</th><th className="p-3 text-right">Paying</th><th className="p-3 text-right">Monthly</th>{TERMS.slice(1).map((t) => <th key={t.months} className="p-3 text-right">{t.label} (−{t.discount * 100}%)</th>)}<th className="p-3 text-right">Commission</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {PLANS.map((p) => (
              <tr key={p.id}>
                <td className="p-3 font-medium">{p.name}</td>
                <td className="num p-3 text-right">{s.by_plan[p.id as PlanId] ?? 0}</td>
                <td className="num p-3 text-right">{usd(p.monthly)}</td>
                {TERMS.slice(1).map((t) => <td key={t.months} className="num p-3 text-right">{usd(termPrice(p.monthly, t.months))}</td>)}
                <td className="num p-3 text-right">{usd(COMMISSION_USD[p.id])}/mo</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="p-3 text-xs text-slate-500">Store prices end in .99, so discounted totals are rounded up to the next .99. Every plan starts with a 7-day free trial set in App Store Connect and Google Play.</p>
      </section>

      <section className="card p-4">
        <h2 className="flex items-center gap-1.5 font-semibold"><BookOpen className="h-4 w-4" /> Free book requests (Max plan)</h2>
        {claims.data?.length ? (
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {claims.data.map((c) => (
              <li key={c.user_id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="min-w-0 flex-1">
                  <b>{c.full_name}</b> · {c.address_line1}{c.address_line2 ? `, ${c.address_line2}` : ""}, {c.city}, {c.region} {c.postal_code}, {c.country}
                  <span className="block text-xs text-slate-500">{c.created_at && new Date(c.created_at).toLocaleDateString()} · {c.status}</span>
                </span>
                {c.status !== "shipped" && <button className="btn-outline px-3 py-1.5 text-xs" disabled={ship.isPending} onClick={() => ship.mutate(c.user_id!)}><Truck className="h-3.5 w-3.5" /> Mark shipped</button>}
              </li>
            ))}
          </ul>
        ) : <p className="mt-1 text-sm text-slate-500">No requests yet.</p>}
      </section>
      <ErrorNote error={toggle.error ?? ship.error ?? claims.error} />
      <p className="text-xs text-slate-500">To give someone a plan by hand (testers, partners), open them in Clients &amp; roles.</p>
    </div>
  );
}

function Tile({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return <div className="card p-3"><span className="text-[11px] text-slate-500">{k}</span><b className="num block font-display text-[22px]">{v}</b>{sub && <span className="text-[10.5px] text-slate-500">{sub}</span>}</div>;
}

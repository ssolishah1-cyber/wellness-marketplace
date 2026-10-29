import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { admin } from "@/lib/admin";
import { CONDITIONS } from "@/lib/nutrition";
import { ErrorNote, Spinner } from "@/components/ui";
import ClicksChart from "./ClicksChart";

export default function AdminOverview({ onOpenQueue }: { onOpenQueue: () => void }) {
  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: () => admin.stats() });
  if (stats.isLoading) return <Spinner />;
  if (!stats.data) return <ErrorNote error={stats.error} />;
  const s = stats.data;
  const pct = (n: number) => (s.total_users ? `${Math.round((n / s.total_users) * 100)}%` : "—");
  const waiting = s.pending_listings + s.pending_vendors;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile label="Users" value={s.total_users} sub={`+${s.new_users_7d} this week · +${s.new_users_30d} in 30 days`} />
        <Tile label="Finished setup" value={pct(s.onboarded)} sub={`${s.onboarded} of ${s.total_users}`} />
        <Tile label="Active this week" value={s.active_7d} sub={`${pct(s.active_7d)} logged food`} />
        <Tile label="Meals logged" value={s.food_entries_7d} sub="last 7 days" />
        <Tile label="Workouts done" value={s.workouts_7d} sub="last 7 days" />
        <button type="button" onClick={onOpenQueue} className={`card p-3 text-left transition hover:border-brand-600 ${waiting ? "border-citrus-500" : ""}`}>
          <span className="text-[11px] text-slate-500">Waiting for review</span>
          <b className="num block font-display text-[24px]">{waiting}</b>
          <span className="text-[11px] text-slate-500">{s.pending_listings} listings · {s.pending_vendors} vendors · {s.inquiries_7d} questions this week</span>
        </button>
      </div>

      <div className="card p-4">
        <h2 className="font-semibold">Sign-ups per day</h2>
        <p className="mb-3 text-xs text-slate-500">Last 30 days</p>
        <ClicksChart data={s.signups_by_day.map((d) => ({ day: d.day, value: d.n }))} empty="No sign-ups yet." unit="sign-ups" />
      </div>

      <div className="card p-4">
        <h2 className="font-semibold">Health focus chosen</h2>
        <p className="mb-3 text-xs text-slate-500">{s.with_health_focus} people chose at least one. Anonymous totals only.</p>
        <div className="grid gap-2">
          {CONDITIONS.map((c) => {
            const n = s.condition_counts[c.id];
            const max = Math.max(1, ...Object.values(s.condition_counts).map((v) => v ?? 0));
            return (
              <div key={c.id} className="grid grid-cols-[130px_1fr_70px] items-center gap-2 text-sm">
                <span>{c.name}</span>
                <span className="h-2 overflow-hidden rounded-full bg-[#e8eee7]"><i className="block h-full rounded-full bg-brand-600" style={{ width: `${((n ?? 0) / max) * 100}%` }} /></span>
                <span className="num text-right text-xs text-slate-500">{n == null ? (c.id in s.condition_counts ? "under 5" : "0") : n}</span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="flex gap-2 rounded-2xl bg-[#e8eee7] p-4 text-xs text-ink-2">
        <Lock className="h-4 w-4 shrink-0" /> Admins see totals and account details only. No one, including admins, can open another person's meals, weight, workouts or health focus. Totals under 5 are hidden so no one can be identified.
      </p>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: number | string; sub: string }) {
  return (
    <div className="card p-3">
      <span className="text-[11px] text-slate-500">{label}</span>
      <b className="num block font-display text-[24px]">{typeof value === "number" ? value.toLocaleString() : value}</b>
      <span className="text-[11px] text-slate-500">{sub}</span>
    </div>
  );
}

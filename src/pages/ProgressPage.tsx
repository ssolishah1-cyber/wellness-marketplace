import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Scale, TrendingDown, TrendingUp } from "lucide-react";
import { addDays, isoDay, nutrition, parseDay } from "@/lib/nutrition";
import { BarChart, LineChart, SignInPrompt, useProfile, useTotals, useWeights } from "@/components/nutrition";
import { ErrorNote, Field, Spinner, useViewer } from "@/components/ui";
import { useToast } from "@/components/Toast";

export default function ProgressPage() {
  const today = isoDay();
  const { data: viewer, isLoading } = useViewer();
  const signedIn = !!viewer?.userId;
  const profile = useProfile();
  const weights = useWeights(signedIn);
  // Rolling last 7 days, so the chart is never empty early in the week.
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const totals = useTotals(week[0], week[6], signedIn);
  const last28 = useTotals(addDays(today, -27), today, signedIn);
  const qc = useQueryClient();
  const toast = useToast();
  const [kg, setKg] = useState("");
  const log = useMutation({
    mutationFn: () => nutrition.logWeight(today, Number(kg)),
    onSuccess: async (w) => { setKg(""); await qc.invalidateQueries({ queryKey: ["weights"] }); toast(`Logged ${w.weight_kg} kg`); },
  });

  if (isLoading || (signedIn && profile.isLoading)) return <Spinner />;
  if (!signedIn || !profile.data) return <SignInPrompt what="see your progress" />;
  const p = profile.data;
  const w = (weights.data ?? []).slice(-12);
  const first = p.start_weight_kg ?? w[0]?.weight_kg ?? null;
  const latest = w.at(-1)?.weight_kg ?? null;
  const lost = first !== null && latest !== null ? Math.round((first - latest) * 10) / 10 : null;
  const target = first !== null && p.goal_weight_kg !== null ? Math.round((first - p.goal_weight_kg) * 10) / 10 : null;
  const pct = lost !== null && target ? Math.max(0, Math.min(100, (lost / target) * 100)) : 0;
  const logged = (last28.data ?? []).filter((d) => d.kcal > 0);
  const avg = logged.length ? Math.round(logged.reduce((a, d) => a + d.kcal, 0) / logged.length) : 0;
  const proteinDays = (totals.data ?? []).filter((d) => d.protein_g >= p.protein_goal_g).length;
  const vals = w.map((x) => x.weight_kg);
  const lo = Math.floor(Math.min(...vals, p.goal_weight_kg ?? Infinity) - 0.5), hi = Math.ceil(Math.max(...vals) + 0.5);

  return (
    <div className="mx-auto grid max-w-xl gap-4">
      <div className="animate-rise"><h1 className="text-[26px] font-extrabold">Progress</h1><p className="text-sm text-ink-muted">Your trends. Only you can see them.</p></div>

      <section className="grid animate-rise grid-cols-3 gap-2 [animation-delay:50ms]">
        <div className="card p-3"><span className="text-[11px] text-ink-muted">{lost !== null && lost < 0 ? "Gained" : "Lost"}</span><b className="num block font-display text-[22px]">{lost === null ? "—" : Math.abs(lost)}</b><span className="text-[11px] text-ink-muted">kg since start</span></div>
        <div className="card p-3"><span className="text-[11px] text-ink-muted">Avg intake</span><b className="num block font-display text-[22px]">{avg ? avg.toLocaleString() : "—"}</b><span className="text-[11px] text-ink-muted">kcal / day (28 d)</span></div>
        <div className="card p-3"><span className="text-[11px] text-ink-muted">Protein goal</span><b className="num block font-display text-[22px]">{proteinDays} / 7</b><span className="text-[11px] text-ink-muted">days hit (last 7)</span></div>
      </section>

      <section className="card animate-rise p-4 [animation-delay:100ms]">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-bold">Weight</h2>
          {lost !== null && <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${lost >= 0 ? "bg-brand-100 text-brand-700" : "bg-citrus-100 text-citrus-600"}`}>
            {lost >= 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}{lost >= 0 ? "−" : "+"}{Math.abs(lost)} kg</span>}
        </div>
        <LineChart points={w.map((x) => ({ label: parseDay(x.measured_on).toLocaleDateString(undefined, { month: "short", day: "numeric" }), value: x.weight_kg }))}
          unit="kg" min={lo} max={hi} ariaLabel={`Weight over time, latest ${latest ?? "none"} kg`} />
        <form className="mt-3 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); log.mutate(); }}>
          <Field label="Today's weight (kg)"><input id="weight" className="input num w-32" type="number" step="0.1" min={25} max={400} required inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} placeholder={latest ? String(latest) : "e.g. 80.5"} /></Field>
          <button className="btn-primary" disabled={log.isPending}><Scale className="h-4 w-4" /> Log weight</button>
        </form>
        <ErrorNote error={log.error} />
      </section>

      {target !== null && target > 0 && (
        <section className="card grid animate-rise gap-2 p-4 [animation-delay:150ms]">
          <div className="flex justify-between"><b>Goal: {p.goal_weight_kg} kg</b><span className="num text-sm text-ink-muted">{Math.max(0, lost ?? 0)} of {target} kg</span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[#e8eee7]"><i className="block h-full origin-left animate-grow rounded-full bg-gradient-to-r from-brand-600 to-brand-500" style={{ width: `${pct}%` }} /></div>
        </section>
      )}

      <section className="card animate-rise p-4 [animation-delay:200ms]">
        <div className="mb-2 flex items-center justify-between"><h2 className="text-base font-bold">Calories, last 7 days</h2><span className="text-[11px] text-ink-muted">dashed line = {p.kcal_goal.toLocaleString()} goal</span></div>
        <BarChart points={week.map((d, i) => ({ label: parseDay(d).toLocaleDateString(undefined, { weekday: "short" }), value: totals.data?.[i]?.kcal ?? 0 }))}
          goal={p.kcal_goal} highlight={week.indexOf(today)} unit="kcal" />
      </section>
    </div>
  );
}

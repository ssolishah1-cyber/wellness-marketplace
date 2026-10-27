import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Droplet, Lock, Plus, Sparkles, Utensils } from "lucide-react";
import { coachTip, isoDay, addDays, loggingStreak, sumMacros, type MealSlot } from "@/lib/nutrition";
import { AddFoodSheet, CalorieRing, MacroBar, SignInPrompt, WaterGlasses, useFood, useProfile, useTotals, useWater, useWeights } from "@/components/nutrition";
import { Spinner, useViewer } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { toDisplayWeight, useUnits, weightUnit } from "@/lib/units";

export default function HomePage() {
  const today = isoDay();
  const { data: viewer, isLoading } = useViewer();
  const signedIn = !!viewer?.userId;
  const profile = useProfile();
  const food = useFood(today, signedIn);
  const water = useWater(today, signedIn);
  const totals = useTotals(addDays(today, -60), today, signedIn);
  const weights = useWeights(signedIn);
  const [adding, setAdding] = useState<MealSlot | null>(null);
  const toast = useToast();
  const navigate = useNavigate();
  const units = useUnits();

  if (isLoading || (signedIn && profile.isLoading)) return <Spinner />;
  if (!signedIn || !profile.data) return <SignInPrompt what="track your nutrition" />;
  const p = profile.data;
  const m = sumMacros(food.data ?? []);
  const logged = new Set((food.data ?? []).map((f) => f.meal));
  const tip = coachTip(m, p, logged, new Date().getHours());
  const streak = loggingStreak(totals.data ?? [], today);
  const w = weights.data ?? [];
  const weekAgo = w.filter((x) => x.measured_on <= addDays(today, -7)).at(-1);
  const change = w.length && weekAgo ? toDisplayWeight(w[w.length - 1].weight_kg - weekAgo.weight_kg, units) : null;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const act = () => {
    if (tip.action === "view_meals") return navigate("/meals");
    setAdding(tip.action === "add_dinner" ? "dinner" : tip.action === "add_snack" ? "snack" : "breakfast");
  };
  const tipText = tip.emphasis ? tip.text.split(tip.emphasis) : [tip.text];

  return (
    <div className="mx-auto grid max-w-xl gap-4">
      <div className="animate-rise">
        <p className="text-sm text-ink-muted">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</p>
        <h1 className="text-[26px] font-extrabold">{greeting}{p.display_name ? `, ${p.display_name}` : ""}</h1>
      </div>

      <section className="card grid animate-rise grid-cols-[132px_1fr] items-center gap-4 p-4 [animation-delay:60ms]" aria-label="Today's calories and macros">
        <CalorieRing eaten={m.kcal} goal={p.kcal_goal} />
        <div className="grid gap-2">
          <MacroBar label="Protein" value={m.protein_g} goal={p.protein_goal_g} color="bg-brand-600" />
          <MacroBar label="Carbs" value={m.carbs_g} goal={p.carbs_goal_g} color="bg-citrus-500" />
          <MacroBar label="Fat" value={m.fat_g} goal={p.fat_goal_g} color="bg-sky-500" />
          <p className="num text-[11px] text-ink-muted">{m.kcal.toLocaleString()} of {p.kcal_goal.toLocaleString()} kcal eaten</p>
        </div>
      </section>

      <section className="relative animate-rise overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-4 text-white [animation-delay:120ms]" aria-label="Coach">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-bold"><Sparkles className="h-4 w-4" /> Your nutrition coach</span>
          <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10.5px] font-bold"><Lock className="h-3 w-3" /> No sponsored content</span>
        </div>
        <p className="my-2.5 text-[15px]">
          {tipText.length === 2 ? <>{tipText[0]}<b>{tip.emphasis}</b>{tipText[1]}</> : tip.text}
        </p>
        <button className="btn bg-white text-brand-700 hover:bg-brand-50" onClick={act}>
          {tip.action === "view_meals" ? <><Utensils className="h-4 w-4" /> View meals</> : <><Plus className="h-4 w-4" /> Add {tip.action.replace("add_", "")}</>}
        </button>
      </section>

      <section className="card animate-rise p-4 [animation-delay:180ms]" aria-label="Water">
        <div className="mb-2.5 flex items-center justify-between">
          <div>
            <b className="flex items-center gap-1.5"><Droplet className="h-4 w-4 text-sky-500" /> Water</b>
            <span className="num text-xs text-ink-muted">{water.data ?? 0} of {p.water_goal_glasses} glasses · tap to log</span>
          </div>
          <span className="num rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-600">{(water.data ?? 0) * 250} ml</span>
        </div>
        <WaterGlasses day={today} goal={p.water_goal_glasses} />
      </section>

      <section className="grid animate-rise grid-cols-3 gap-2 [animation-delay:240ms]">
        <Stat label="Streak" value={String(streak)} unit={streak === 1 ? "day logged" : "days logged"} />
        <Stat label="This week" value={change === null ? "—" : `${change > 0 ? "+" : change < 0 ? "−" : ""}${Math.abs(change)}`} unit={weightUnit(units)} />
        <Link to="/meals" className="card p-3 transition hover:border-brand-600"><span className="text-[11px] text-ink-muted">Meals today</span><b className="num block font-display text-[22px]">{(food.data ?? []).length}</b><span className="text-[11px] text-ink-muted">items logged</span></Link>
      </section>

      {adding && <AddFoodSheet day={today} meal={adding} onClose={() => setAdding(null)} onAdded={(n, k) => toast(`${n} added · ${k} kcal`)} />}
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return <div className="card p-3"><span className="text-[11px] text-ink-muted">{label}</span><b className="num block font-display text-[22px]">{value}</b><span className="text-[11px] text-ink-muted">{unit}</span></div>;
}

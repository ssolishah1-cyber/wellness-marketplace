import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Clock, Droplet, Lock, Plus, Sparkles, Utensils } from "lucide-react";
import { coachTip, conditionGuide, conditionInsight, isoDay, addDays, loggingStreak, mealIdeas, slotForHour, sumMacros, weekOf, type MealSlot } from "@/lib/nutrition";
import { AddFoodSheet, CalorieRing, MacroBar, SignInPrompt, WaterGlasses, useFood, useProfile, useTotals, useWater, useWeights, useWorkouts } from "@/components/nutrition";
import { ConditionIcon, MealIdeaRow } from "@/components/health";
import { weekdayOf, weeklyPlan } from "@/lib/fitness";
import { KIND_ICON } from "./WorkoutsPage";
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
  const workouts = useWorkouts(weekOf(today)[0], weekOf(today)[6], signedIn);
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
  const insightCtx = { entries: food.data ?? [], macros: m, profile: p, water: water.data ?? 0, hour };
  const todaySession = weeklyPlan(p)[weekdayOf(today)].session;
  const sessionDone = !!todaySession && (workouts.data ?? []).some((w) => w.done_on === today && w.session_id === todaySession.id);
  const ideaSlot = slotForHour(hour, logged);
  const ideas = mealIdeas({ prefs: p.food_preferences, conditions: p.conditions, meal: ideaSlot }).slice(0, 3);
  const SessionIcon = todaySession ? KIND_ICON[todaySession.kind] : null;
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

      <section className="grid animate-rise gap-2 [animation-delay:150ms]" aria-label="For you">
        <div className="flex items-center justify-between"><h2 className="text-base font-bold">For you</h2>
          <Link to="/profile" className="text-xs font-semibold text-brand-700">{p.conditions.length ? "Edit focus" : "Add a health focus"}</Link></div>
        {p.conditions.length ? (
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
            {p.conditions.map((id) => {
              const g = conditionGuide(id)!;
              const ins = conditionInsight(id, insightCtx);
              return (
                <Link key={id} to={`/health/${id}`} className="card grid w-[260px] shrink-0 snap-start content-start gap-2 p-3.5 transition hover:border-brand-600">
                  <span className="flex items-center gap-2.5"><ConditionIcon guide={g} size={32} /><b className="flex-1 text-sm">{g.name}</b><ChevronRight className="h-4 w-4 text-ink-muted" /></span>
                  <p className="text-[13px] leading-snug text-ink-2">{ins.text}</p>
                </Link>
              );
            })}
          </div>
        ) : (
          <Link to="/profile" className="card flex items-center gap-3 p-3.5 text-sm transition hover:border-brand-600">
            <Sparkles className="h-5 w-5 shrink-0 text-brand-700" />
            <span className="flex-1 text-ink-2">Get tailored nutrition for blood sugar, blood pressure, IBS, focus or stress &amp; sleep.</span>
            <ChevronRight className="h-4 w-4 text-ink-muted" />
          </Link>
        )}
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

      <Link to="/workouts" className="card flex animate-rise items-center gap-3 p-4 transition hover:border-brand-600 [animation-delay:200ms]" aria-label="Today's workout">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white ${sessionDone ? "bg-brand-600" : "bg-gradient-to-br from-citrus-500 to-rose-600"}`}>
          {SessionIcon ? <SessionIcon className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-[11px] text-ink-muted">Today's workout</span>
          <b className="block truncate">{todaySession ? todaySession.title : "Rest day"}</b>
          <span className="flex items-center gap-1 text-xs text-ink-muted">{todaySession ? <><Clock className="h-3 w-3" /> About {todaySession.minutes} min{sessionDone ? " · done" : ""}</> : "See your week's plan"}</span>
        </span>
        <ChevronRight className="h-5 w-5 text-ink-muted" />
      </Link>

      {ideas.length > 0 && (
        <section className="card animate-rise p-4 [animation-delay:220ms]" aria-label="Meal ideas">
          <h2 className="text-base font-bold">Ideas for {ideaSlot}</h2>
          <p className="text-xs text-ink-muted">{p.conditions.length || p.food_preferences.length ? "Picked for your health focus and food preferences" : "Balanced picks you can log in one tap"}</p>
          {ideas.map((i) => <MealIdeaRow key={i.id} idea={i} day={today} onAdded={(n) => toast(`${n} logged`)} />)}
        </section>
      )}

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

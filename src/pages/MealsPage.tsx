import { useState } from "react";
import { ChevronLeft, ChevronRight, Lock, Plus, Trash2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { MEAL_LABEL, MEAL_SLOTS, addDays, isoDay, nutrition, parseDay, sumMacros, weekOf, type MealSlot } from "@/lib/nutrition";
import { AddFoodSheet, FoodBadge, SignInPrompt, useFood, useProfile, useRefreshFood } from "@/components/nutrition";
import { ErrorNote, Spinner, useViewer } from "@/components/ui";
import { useToast } from "@/components/Toast";

export default function MealsPage() {
  const today = isoDay();
  const [day, setDay] = useState(today);
  const { data: viewer, isLoading } = useViewer();
  const signedIn = !!viewer?.userId;
  const profile = useProfile();
  const food = useFood(day, signedIn);
  const refresh = useRefreshFood();
  const toast = useToast();
  const [adding, setAdding] = useState<MealSlot | null>(null);
  const remove = useMutation({ mutationFn: (id: string) => nutrition.deleteFood(id), onSuccess: async () => { await refresh(); toast("Removed"); } });

  if (isLoading) return <Spinner />;
  if (!signedIn) return <SignInPrompt what="log your meals" />;
  const week = weekOf(day);
  const m = sumMacros(food.data ?? []);
  const goal = profile.data?.kcal_goal ?? 2100;
  const isFuture = day > today;

  return (
    <div className="mx-auto grid max-w-xl gap-4">
      <div className="flex animate-rise items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold">Meals</h1>
          <p className="num text-sm text-ink-muted">{m.kcal.toLocaleString()} of {goal.toLocaleString()} kcal · {Math.round(m.protein_g)} g protein</p>
        </div>
        {!isFuture && <button className="btn-primary" onClick={() => setAdding(new Date().getHours() < 11 ? "breakfast" : new Date().getHours() < 15 ? "lunch" : "dinner")}><Plus className="h-4 w-4" /> Add food</button>}
      </div>

      <div className="flex animate-rise items-center gap-1 [animation-delay:50ms]">
        <button className="rounded-lg p-1.5 hover:bg-white" aria-label="Previous week" onClick={() => setDay(addDays(day, -7))}><ChevronLeft className="h-5 w-5" /></button>
        <div className="grid flex-1 grid-cols-7 gap-1.5">
          {week.map((d) => {
            const dt = parseDay(d);
            const sel = d === day;
            return (
              <button key={d} onClick={() => setDay(d)} aria-pressed={sel} aria-label={dt.toDateString()}
                className={`grid justify-items-center rounded-2xl border py-1.5 text-[11px] transition ${sel ? "border-ink bg-ink text-white" : "border-[#d8e2d9] bg-white text-ink-muted"} ${d === today && !sel ? "ring-2 ring-brand-200" : ""}`}>
                {dt.toLocaleDateString(undefined, { weekday: "short" })}
                <b className={`font-display text-[15px] ${sel ? "text-white" : "text-ink"}`}>{dt.getDate()}</b>
              </button>
            );
          })}
        </div>
        <button className="rounded-lg p-1.5 hover:bg-white disabled:opacity-30" aria-label="Next week" disabled={addDays(week[6], 1) > today} onClick={() => setDay(addDays(day, 7) > today ? today : addDays(day, 7))}><ChevronRight className="h-5 w-5" /></button>
      </div>

      {food.isLoading ? <Spinner /> : isFuture ? (
        <div className="card p-6 text-center text-sm text-ink-muted">You can't log meals for future days yet.</div>
      ) : MEAL_SLOTS.map((slot, i) => {
        const items = (food.data ?? []).filter((f) => f.meal === slot);
        const kc = items.reduce((a, f) => a + f.kcal, 0);
        return (
          <section key={slot} className="card grid animate-rise gap-2.5 p-4" style={{ animationDelay: `${100 + i * 50}ms` }}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">{MEAL_LABEL[slot]}</h2>
              <span className="num text-xs text-ink-muted">{kc ? `${kc} kcal` : "Not logged"}</span>
            </div>
            {items.map((f) => (
              <div key={f.id} className="grid grid-cols-[42px_1fr_auto_auto] items-center gap-3">
                <FoodBadge name={f.name} />
                <div className="min-w-0"><b className="block truncate text-sm">{f.name}</b><span className="num text-[11px] text-ink-muted">P {f.protein_g} g · C {f.carbs_g} g · F {f.fat_g} g</span></div>
                <b className="num text-sm">{f.kcal}</b>
                <button className="rounded-lg p-1.5 text-ink-muted hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${f.name}`} disabled={remove.isPending} onClick={() => remove.mutate(f.id)}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <button className="flex items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-[#d8e2d9] p-2.5 text-sm font-semibold text-brand-700 hover:border-brand-600" onClick={() => setAdding(slot)}>
              <Plus className="h-4 w-4" /> Add {MEAL_LABEL[slot].toLowerCase()}
            </button>
          </section>
        );
      })}
      <ErrorNote error={remove.error} />
      <p className="flex gap-2 rounded-xl bg-[#e8eee7] p-3 text-xs text-ink-2"><Lock className="h-4 w-4 shrink-0" /> Your food log is private. Marketplace products are never placed in your meals or suggestions.</p>
      {adding && <AddFoodSheet day={day} meal={adding} onClose={() => setAdding(null)} onAdded={(n, k) => toast(`${n} added · ${k} kcal`)} />}
    </div>
  );
}

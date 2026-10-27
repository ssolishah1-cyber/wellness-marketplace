import { useMutation } from "@tanstack/react-query";
import { Brain, Check, Droplet, HeartPulse, Leaf, Lock, Moon, Plus, type LucideIcon } from "lucide-react";
import { CONDITIONS, FOOD_PREF_LABEL, MEAL_LABEL, nutrition, type ConditionGuide, type ConditionId, type FitnessLevel, type FoodPref, type MealIdea, type WorkoutPlace } from "@/lib/nutrition";
import { FoodBadge, useRefreshFood } from "./nutrition";
import { tap } from "@/lib/native";
import { LEVEL_LABEL, PLACE_LABEL } from "@/lib/fitness";

const ICONS: Record<ConditionGuide["icon"], LucideIcon> = { droplet: Droplet, heart: HeartPulse, leaf: Leaf, brain: Brain, moon: Moon };
export const TINTS: Record<ConditionId, string> = {
  diabetes: "from-sky-500 to-indigo-700",
  hypertension: "from-rose-500 to-rose-700",
  ibs: "from-brand-500 to-brand-700",
  focus: "from-citrus-500 to-amber-600",
  relaxation: "from-violet-400 to-violet-700",
};

export function ConditionIcon({ guide, size = 40 }: { guide: ConditionGuide; size?: number }) {
  const Icon = ICONS[guide.icon];
  return <span className={`grid shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white ${TINTS[guide.id]}`} style={{ width: size, height: size }}><Icon className="h-5 w-5" /></span>;
}

const chip = (on: boolean) => `rounded-2xl border p-3 text-left text-sm transition ${on ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100" : "border-[#d8e2d9] bg-white hover:border-brand-500"}`;
const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export const HEALTH_CONSENT_TEXT = "Save my health focus to my account so the app can tailor tips, meal ideas and workouts. It stays private to me, is never shared with businesses or used for ads, and I can remove it at any time.";

export function ConditionPicker({ value, onChange, consent, onConsent }: { value: ConditionId[]; onChange: (v: ConditionId[]) => void; consent: boolean; onConsent: (v: boolean) => void }) {
  return (
    <div className="grid gap-2">
      <span className="label">Anything you'd like help with? <span className="font-normal text-ink-muted">(optional, pick any)</span></span>
      <div className="grid gap-2 sm:grid-cols-2">
        {CONDITIONS.map((c) => (
          <button key={c.id} type="button" aria-pressed={value.includes(c.id)} className={`${chip(value.includes(c.id))} flex items-center gap-3`} onClick={() => onChange(toggle(value, c.id))}>
            <ConditionIcon guide={c} size={34} />
            <span><b className="block">{c.name}</b><span className="text-xs text-ink-muted">{c.short}</span></span>
          </button>
        ))}
      </div>
      {value.length > 0 && (
        <label className="flex items-start gap-2 rounded-xl bg-[#e8eee7] p-3 text-xs text-ink-2">
          <input id="health-consent" type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => onConsent(e.target.checked)} />
          <span><Lock className="mr-1 inline h-3 w-3" />{HEALTH_CONSENT_TEXT}</span>
        </label>
      )}
      <p className="text-[11px] text-ink-muted">General guidance, not medical advice. Keep following your doctor's or dietitian's plan.</p>
    </div>
  );
}

export function FoodPrefPicker({ value, onChange }: { value: FoodPref[]; onChange: (v: FoodPref[]) => void }) {
  return (
    <div className="grid gap-2">
      <span className="label">Food preferences & allergies <span className="font-normal text-ink-muted">(optional)</span></span>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(FOOD_PREF_LABEL) as FoodPref[]).map((p) => (
          <button key={p} type="button" aria-pressed={value.includes(p)} onClick={() => onChange(toggle(value, p))}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${value.includes(p) ? "border-brand-600 bg-brand-600 text-white" : "border-[#d8e2d9] bg-white text-ink-2 hover:border-brand-500"}`}>
            {FOOD_PREF_LABEL[p]}
          </button>
        ))}
      </div>
      {value.some((p) => p === "halal" || p === "kosher") && <p className="text-[11px] text-ink-muted">Meal ideas assume certified meat and no pork, shellfish or alcohol.</p>}
    </div>
  );
}

export interface FitnessValue { fitness_level: FitnessLevel; workout_place: WorkoutPlace; workout_days: number }

export function FitnessPicker({ value, onChange }: { value: FitnessValue; onChange: (v: FitnessValue) => void }) {
  return (
    <div className="grid gap-4">
      <div>
        <span className="label">Your fitness level</span>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(LEVEL_LABEL) as FitnessLevel[]).map((l) => (
            <button key={l} type="button" aria-pressed={value.fitness_level === l} className={chip(value.fitness_level === l)} onClick={() => onChange({ ...value, fitness_level: l })}>{LEVEL_LABEL[l]}</button>
          ))}
        </div>
      </div>
      <div>
        <span className="label">Where will you work out?</span>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(PLACE_LABEL) as WorkoutPlace[]).map((pl) => (
            <button key={pl} type="button" aria-pressed={value.workout_place === pl} className={chip(value.workout_place === pl)} onClick={() => onChange({ ...value, workout_place: pl })}>{PLACE_LABEL[pl]}</button>
          ))}
        </div>
      </div>
      <div>
        <span className="label">Days per week</span>
        <div className="grid grid-cols-5 gap-2">
          {[2, 3, 4, 5, 6].map((d) => (
            <button key={d} type="button" aria-pressed={value.workout_days === d} className={`${chip(value.workout_days === d)} num text-center font-bold`} onClick={() => onChange({ ...value, workout_days: d })}>{d}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- meal idea row (one-tap log) ----------
export function MealIdeaRow({ idea, day, onAdded }: { idea: MealIdea; day: string; onAdded?: (name: string) => void }) {
  const refresh = useRefreshFood();
  const add = useMutation({
    mutationFn: () => nutrition.addFood({ eaten_on: day, meal: idea.meal, name: idea.name, kcal: idea.kcal, protein_g: idea.protein_g, carbs_g: idea.carbs_g, fat_g: idea.fat_g }),
    onSuccess: async () => { tap(); await refresh(); onAdded?.(idea.name); },
  });
  return (
    <div className="flex items-center gap-3 border-b border-[#d8e2d9] py-2.5 last:border-0">
      <FoodBadge name={idea.name} size={38} />
      <div className="min-w-0 flex-1">
        <b className="block text-sm leading-snug">{idea.name}</b>
        <span className="num text-[11px] text-ink-muted">{MEAL_LABEL[idea.meal]} · {idea.kcal} kcal · {idea.protein_g} g protein · {idea.carbs_g} g carbs</span>
      </div>
      <button className="btn-outline shrink-0 px-2.5 py-1.5 text-xs" disabled={add.isPending || add.isSuccess} onClick={() => add.mutate()} aria-label={`Log ${idea.name}`}>
        {add.isSuccess ? <><Check className="h-3.5 w-3.5" /> Logged</> : <><Plus className="h-3.5 w-3.5" /> Log</>}
      </button>
    </div>
  );
}

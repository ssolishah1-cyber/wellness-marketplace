import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Info } from "lucide-react";
import {
  ACTIVITY_LABEL, isoDay, nutrition, suggestTargets, type Activity, type ConditionId, type FoodPref, type GoalKind, type Profile, type Sex, type Targets,
} from "@/lib/nutrition";
import { ConditionPicker, FitnessPicker, FoodPrefPicker, type FitnessValue } from "@/components/health";
import { SignInPrompt, useProfile } from "@/components/nutrition";
import { ErrorNote, Field, Spinner, useViewer } from "@/components/ui";
import { fromDisplayWeight, ftInToCm, useUnits, weightUnit } from "@/lib/units";

const STEPS = ["About you", "Your goal", "Health & food", "Fitness", "Daily targets"];
const LAST = STEPS.length - 1;

export default function WelcomePage() {
  const { data: viewer, isLoading } = useViewer();
  const profile = useProfile();
  if (isLoading || profile.isLoading) return <Spinner />;
  if (!viewer?.userId || !profile.data) return <SignInPrompt what="set up your goals" />;
  return <Wizard profile={profile.data} />;
}

function Wizard({ profile }: { profile: Profile }) {
  const firstRun = !profile.onboarded_at;
  const initialName = profile.display_name ?? "";
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const units = useUnits();
  const U = weightUnit(units);
  const [f, setF] = useState({ name: initialName, sex: "" as Sex | "", age: "", height: "", heightFt: "", heightIn: "", weight: "", goal: "lose" as GoalKind, goalWeight: "", activity: "light" as Activity });
  const [conditions, setConditions] = useState<ConditionId[]>(profile.conditions ?? []);
  const [consent, setConsent] = useState(!!profile.health_consent_at);
  const [prefs, setPrefs] = useState<FoodPref[]>(profile.food_preferences ?? []);
  const [fitness, setFitness] = useState<FitnessValue>({ fitness_level: profile.fitness_level ?? "beginner", workout_place: profile.workout_place ?? "home", workout_days: profile.workout_days ?? 3 });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const num = (s: string) => Number(s.replace(",", "."));

  // Everything below works in kg / cm; inputs are in the user's units.
  const heightCm = units === "imperial" ? (f.heightFt === "" ? NaN : ftInToCm(num(f.heightFt), f.heightIn === "" ? 0 : num(f.heightIn))) : num(f.height);
  const weightKg = f.weight === "" ? NaN : fromDisplayWeight(num(f.weight), units);
  const gw = f.goalWeight === "" ? NaN : fromDisplayWeight(num(f.goalWeight), units);
  const step1Ok = f.sex !== "" && num(f.age) >= 18 && num(f.age) <= 100 && heightCm >= 120 && heightCm <= 230 && weightKg >= 30 && weightKg <= 300;
  const step2Ok = f.goal === "maintain" || (gw >= 30 && gw <= 300 && (f.goal === "lose" ? gw < weightKg : gw > weightKg));
  const healthOk = conditions.length === 0 || consent;
  const stepOk = [step1Ok, step2Ok, healthOk, true][step] ?? true;
  const lowerCarb = conditions.includes("diabetes") || prefs.includes("low_carb");

  const suggested = useMemo<Targets | null>(() => (step1Ok ? suggestTargets({
    sex: f.sex as Sex, age: num(f.age), heightCm, weightKg, activity: f.activity, goal: f.goal, lowerCarb,
  }) : null), [step1Ok, f.sex, f.age, heightCm, weightKg, f.activity, f.goal, lowerCarb]);
  const [targets, setTargets] = useState<Record<keyof Targets, string> | null>(null);
  const t = targets ?? (suggested ? Object.fromEntries(Object.entries(suggested).map(([k, v]) => [k, String(v)])) as Record<keyof Targets, string> : null);

  // Conditions are stored only with consent; unticking consent clears them.
  const healthPatch = () => ({
    conditions: consent ? conditions : [],
    health_consent_at: consent && conditions.length ? (profile.health_consent_at ?? new Date().toISOString()) : null,
    food_preferences: prefs,
    ...fitness,
  });
  const finish = useMutation({
    mutationFn: async (skip: boolean) => {
      if (!skip && t) {
        await nutrition.logWeight(isoDay(), weightKg);
        return nutrition.updateProfile({
          display_name: f.name.trim() || null,
          kcal_goal: Number(t.kcal_goal), protein_goal_g: Number(t.protein_goal_g), carbs_goal_g: Number(t.carbs_goal_g),
          fat_goal_g: Number(t.fat_goal_g), water_goal_glasses: Number(t.water_goal_glasses),
          start_weight_kg: weightKg, goal_weight_kg: f.goal === "maintain" ? weightKg : gw,
          ...healthPatch(),
          onboarded_at: new Date().toISOString(),
        });
      }
      return nutrition.updateProfile({ display_name: f.name.trim() || null, onboarded_at: new Date().toISOString() });
    },
    onSuccess: async (p: Profile) => { qc.setQueryData(["profile"], p); await qc.invalidateQueries({ queryKey: ["weights"] }); navigate("/"); },
  });

  const choice = (active: boolean) => `rounded-2xl border p-3 text-left text-sm transition ${active ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100" : "border-[#d8e2d9] bg-white hover:border-brand-500"}`;

  return (
    <div className="mx-auto grid max-w-lg gap-4">
      <div className="animate-rise">
        <p className="text-sm text-ink-muted">{firstRun ? "Welcome" : "Recalculate your goals"}</p>
        <h1 className="text-[26px] font-extrabold">{firstRun ? "Let's set up your goals" : "Update your goals"}</h1>
      </div>

      <ol className="flex gap-2" aria-label="Setup steps">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <div className={`h-1.5 rounded-full transition-colors ${i <= step ? "bg-brand-600" : "bg-[#e1e8e1]"}`} />
            <span className={`mt-1 block text-[11px] ${i === step ? "font-semibold text-ink" : "text-ink-muted"}`}>{s}</span>
          </li>
        ))}
      </ol>

      <section className="card grid animate-rise gap-4 p-5" key={step}>
        {step === 0 && (
          <>
            <Field label="What should we call you?"><input id="w-name" className="input" maxLength={60} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="First name" /></Field>
            <div>
              <span className="label">Sex (used in the calorie formula)</span>
              <div className="grid grid-cols-2 gap-2">
                {(["female", "male"] as Sex[]).map((s) => (
                  <button key={s} type="button" aria-pressed={f.sex === s} className={choice(f.sex === s)} onClick={() => set("sex", s)}>{s === "female" ? "Female" : "Male"}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Age"><input id="w-age" className="input num" type="number" inputMode="numeric" min={18} max={100} value={f.age} onChange={(e) => set("age", e.target.value)} /></Field>
              <Field label={`Weight (${U})`}><input id="w-weight" className="input num" type="number" inputMode="decimal" step="0.1" value={f.weight} onChange={(e) => set("weight", e.target.value)} /></Field>
              {units === "imperial" ? (
                <div className="col-span-2 grid grid-cols-2 gap-3">
                  <Field label="Height (ft)"><input id="w-height-ft" className="input num" type="number" inputMode="numeric" min={4} max={7} value={f.heightFt} onChange={(e) => set("heightFt", e.target.value)} /></Field>
                  <Field label="Height (in)"><input id="w-height-in" className="input num" type="number" inputMode="numeric" min={0} max={11} value={f.heightIn} onChange={(e) => set("heightIn", e.target.value)} /></Field>
                </div>
              ) : (
                <Field label="Height (cm)"><input id="w-height" className="input num" type="number" inputMode="numeric" min={120} max={230} value={f.height} onChange={(e) => set("height", e.target.value)} /></Field>
              )}
            </div>
            {f.age !== "" && num(f.age) < 18 && <p className="rounded-xl bg-citrus-50 p-3 text-sm text-citrus-600">This app is for adults 18 and over.</p>}
          </>
        )}

        {step === 1 && (
          <>
            <div>
              <span className="label">What's your goal?</span>
              <div className="grid grid-cols-3 gap-2">
                {([["lose", "Lose weight"], ["maintain", "Maintain"], ["gain", "Build / gain"]] as [GoalKind, string][]).map(([g, label]) => (
                  <button key={g} type="button" aria-pressed={f.goal === g} className={choice(f.goal === g)} onClick={() => set("goal", g)}>{label}</button>
                ))}
              </div>
            </div>
            {f.goal !== "maintain" && (
              <Field label={`Goal weight (${U})`} hint={`You're at ${f.weight} ${U} now.`}>
                <input id="w-goal" className="input num" type="number" inputMode="decimal" step="0.1" value={f.goalWeight} onChange={(e) => set("goalWeight", e.target.value)} />
              </Field>
            )}
            {f.goal !== "maintain" && f.goalWeight !== "" && !step2Ok && (
              <p className="text-sm text-citrus-600">{f.goal === "lose" ? "Goal weight should be below your current weight." : "Goal weight should be above your current weight."}</p>
            )}
            <div>
              <span className="label">How active are you?</span>
              <div className="grid gap-2">
                {(Object.keys(ACTIVITY_LABEL) as Activity[]).map((a) => (
                  <button key={a} type="button" aria-pressed={f.activity === a} className={choice(f.activity === a)} onClick={() => set("activity", a)}>{ACTIVITY_LABEL[a]}</button>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <ConditionPicker value={conditions} onChange={setConditions} consent={consent} onConsent={setConsent} />
            <FoodPrefPicker value={prefs} onChange={setPrefs} />
          </>
        )}

        {step === 3 && <FitnessPicker value={fitness} onChange={setFitness} />}

        {step === LAST && t && (
          <>
            <p className="text-sm text-ink-2">Here's a starting point based on your answers. You can change any number now or later in Profile.</p>
            {lowerCarb && <p className="rounded-xl bg-sky-50 p-3 text-xs text-sky-600">Carbs are capped at about 40% of calories for your blood-sugar or lower-carb choice.</p>}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {([["kcal_goal", "Calories (kcal)"], ["protein_goal_g", "Protein (g)"], ["carbs_goal_g", "Carbs (g)"], ["fat_goal_g", "Fat (g)"], ["water_goal_glasses", "Water (glasses)"]] as [keyof Targets, string][]).map(([k, label]) => (
                <Field key={k} label={label}>
                  <input id={`w-${k}`} className="input num" type="number" min={0} value={t[k]} onChange={(e) => setTargets({ ...t, [k]: e.target.value })} />
                </Field>
              ))}
            </div>
            <p className="flex gap-2 rounded-xl bg-[#e8eee7] p-3 text-xs text-ink-2">
              <Info className="h-4 w-4 shrink-0" /> An estimate, not medical advice. If you're pregnant, breastfeeding or managing a medical condition, check your targets with a clinician.
            </p>
          </>
        )}

        <ErrorNote error={finish.error} />
        <div className="flex items-center justify-between gap-2">
          {step > 0 ? <button type="button" className="btn-outline" onClick={() => setStep(step - 1)}><ArrowLeft className="h-4 w-4" /> Back</button>
            : firstRun
              ? <button type="button" className="text-sm text-ink-muted hover:text-ink" disabled={finish.isPending} onClick={() => finish.mutate(true)}>Skip for now</button>
              : <button type="button" className="text-sm text-ink-muted hover:text-ink" onClick={() => navigate("/profile")}>Cancel</button>}
          {step < LAST
            ? <button type="button" className="btn-primary" disabled={!stepOk} onClick={() => { setTargets(null); setStep(step + 1); }}>Continue <ArrowRight className="h-4 w-4" /></button>
            : <button type="button" className="btn-primary" disabled={finish.isPending} onClick={() => finish.mutate(false)}><Check className="h-4 w-4" /> Save my goals</button>}
        </div>
      </section>
    </div>
  );
}

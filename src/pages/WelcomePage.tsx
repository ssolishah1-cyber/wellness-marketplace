import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Info } from "lucide-react";
import {
  ACTIVITY_LABEL, isoDay, nutrition, suggestTargets, type Activity, type GoalKind, type Sex, type Targets,
} from "@/lib/nutrition";
import { SignInPrompt, useProfile } from "@/components/nutrition";
import { ErrorNote, Field, Spinner, useViewer } from "@/components/ui";

const STEPS = ["About you", "Your goal", "Daily targets"];

export default function WelcomePage() {
  const { data: viewer, isLoading } = useViewer();
  const profile = useProfile();
  if (isLoading || profile.isLoading) return <Spinner />;
  if (!viewer?.userId || !profile.data) return <SignInPrompt what="set up your goals" />;
  return <Wizard firstRun={!profile.data.onboarded_at} initialName={profile.data.display_name ?? ""} />;
}

function Wizard({ firstRun, initialName }: { firstRun: boolean; initialName: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ name: initialName, sex: "" as Sex | "", age: "", height: "", weight: "", goal: "lose" as GoalKind, goalWeight: "", activity: "light" as Activity });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const num = (s: string) => Number(s.replace(",", "."));

  const step1Ok = f.sex !== "" && num(f.age) >= 18 && num(f.age) <= 100 && num(f.height) >= 120 && num(f.height) <= 230 && num(f.weight) >= 30 && num(f.weight) <= 300;
  const gw = num(f.goalWeight);
  const step2Ok = f.goal === "maintain" || (gw >= 30 && gw <= 300 && (f.goal === "lose" ? gw < num(f.weight) : gw > num(f.weight)));

  const suggested = useMemo<Targets | null>(() => (step1Ok ? suggestTargets({
    sex: f.sex as Sex, age: num(f.age), heightCm: num(f.height), weightKg: num(f.weight), activity: f.activity, goal: f.goal,
  }) : null), [step1Ok, f.sex, f.age, f.height, f.weight, f.activity, f.goal]);
  const [targets, setTargets] = useState<Record<keyof Targets, string> | null>(null);
  const t = targets ?? (suggested ? Object.fromEntries(Object.entries(suggested).map(([k, v]) => [k, String(v)])) as Record<keyof Targets, string> : null);

  const finish = useMutation({
    mutationFn: async (skip: boolean) => {
      if (!skip && t) {
        await nutrition.logWeight(isoDay(), num(f.weight));
        return nutrition.updateProfile({
          display_name: f.name.trim() || null,
          kcal_goal: Number(t.kcal_goal), protein_goal_g: Number(t.protein_goal_g), carbs_goal_g: Number(t.carbs_goal_g),
          fat_goal_g: Number(t.fat_goal_g), water_goal_glasses: Number(t.water_goal_glasses),
          start_weight_kg: num(f.weight), goal_weight_kg: f.goal === "maintain" ? num(f.weight) : gw,
          onboarded_at: new Date().toISOString(),
        });
      }
      return nutrition.updateProfile({ display_name: f.name.trim() || null, onboarded_at: new Date().toISOString() });
    },
    onSuccess: async (p) => { qc.setQueryData(["profile"], p); await qc.invalidateQueries({ queryKey: ["weights"] }); navigate("/"); },
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
            <div className="grid grid-cols-3 gap-3">
              <Field label="Age"><input id="w-age" className="input num" type="number" inputMode="numeric" min={18} max={100} value={f.age} onChange={(e) => set("age", e.target.value)} /></Field>
              <Field label="Height (cm)"><input id="w-height" className="input num" type="number" inputMode="numeric" min={120} max={230} value={f.height} onChange={(e) => set("height", e.target.value)} /></Field>
              <Field label="Weight (kg)"><input id="w-weight" className="input num" type="number" inputMode="decimal" step="0.1" min={30} max={300} value={f.weight} onChange={(e) => set("weight", e.target.value)} /></Field>
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
              <Field label="Goal weight (kg)" hint={`You're at ${f.weight} kg now.`}>
                <input id="w-goal" className="input num" type="number" inputMode="decimal" step="0.1" min={30} max={300} value={f.goalWeight} onChange={(e) => set("goalWeight", e.target.value)} />
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

        {step === 2 && t && (
          <>
            <p className="text-sm text-ink-2">Here's a starting point based on your answers. You can change any number now or later in Profile.</p>
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
          {step < 2
            ? <button type="button" className="btn-primary" disabled={step === 0 ? !step1Ok : !step2Ok} onClick={() => { setTargets(null); setStep(step + 1); }}>Continue <ArrowRight className="h-4 w-4" /></button>
            : <button type="button" className="btn-primary" disabled={finish.isPending} onClick={() => finish.mutate(false)}><Check className="h-4 w-4" /> Save my goals</button>}
        </div>
      </section>
    </div>
  );
}

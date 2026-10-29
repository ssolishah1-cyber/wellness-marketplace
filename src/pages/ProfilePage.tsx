import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Dumbbell, FileText, LogOut, MessageCircle, Shield, SlidersHorizontal, Store, Trash2 } from "lucide-react";
import { appUrl } from "@/lib/appUrl";
import { isNative, reminderEnabled, saveFile, setReminder, tap, type ReminderKind } from "@/lib/native";
import { fromDisplayWeight, setUnits, toDisplayWeight, useUnits, weightRange, weightUnit } from "@/lib/units";
import { api } from "@/lib/api";
import { FOOD_PREF_LABEL, conditionGuide, nutrition, type ConditionId, type FoodPref, type Profile, type ProfilePatch } from "@/lib/nutrition";
import { ConditionIcon, ConditionPicker, FitnessPicker, FoodPrefPicker, type FitnessValue } from "@/components/health";
import { LEVEL_LABEL, PLACE_LABEL } from "@/lib/fitness";
import { useProfile } from "@/components/nutrition";
import { useToast } from "@/components/Toast";
import { isDemoMode, supabase } from "@/integrations/supabase/client";
import { ErrorNote, Field, Spinner, useViewer } from "@/components/ui";

export default function ProfilePage() {
  const { data: viewer, isLoading } = useViewer();
  if (isLoading) return <Spinner />;

  if (viewer?.userId) return <SignedInProfile userId={viewer.userId} email={viewer.email} isStaff={viewer.isStaff} />;

  if (isDemoMode) {
    return (
      <div className="card mx-auto max-w-md space-y-2 p-5 text-sm">
        <h1 className="text-xl font-bold">Profile</h1>
        <p className="text-ink-2">You're browsing as a visitor. In demo mode, choose <b>App user</b>, <b>Vendor</b> or <b>Admin</b> in the bar at the top to sign in as that role.</p>
      </div>
    );
  }
  return <SignInForm />;
}

function SignedInProfile({ userId, email, isStaff }: { userId: string; email: string | null; isStaff: boolean }) {
  const qc = useQueryClient();
  const toast = useToast();
  const profile = useProfile();
  const inquiries = useQuery({ queryKey: ["my-inquiries"], queryFn: () => api.listInquiries() });
  const [editing, setEditing] = useState(false);
  const units = useUnits();
  const save = useMutation({
    mutationFn: (patch: ProfilePatch) => nutrition.updateProfile(patch),
    onSuccess: (p) => { qc.setQueryData(["profile"], p); setEditing(false); toast("Saved"); },
  });
  const p = profile.data;
  if (profile.isLoading || !p) return <Spinner />;
  const name = p.display_name || email?.split("@")[0] || "You";
  // Vendors also receive inquiries; show only the ones this person sent.
  const mine = (inquiries.data ?? []).filter((q) => q.user_id === userId);

  return (
    <div className="mx-auto grid max-w-xl gap-4">
      <div className="flex animate-rise items-center gap-3">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-citrus-500 to-rose-600 font-display text-2xl font-extrabold text-white">{name[0]?.toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[22px] font-extrabold">{name}</h1>
          <p className="truncate text-sm text-ink-muted">{email}{isStaff && " · marketplace reviewer"}</p>
        </div>
      </div>

      <section className="card animate-rise p-4 [animation-delay:50ms]">
        <div className="flex items-center justify-between"><h2 className="text-base font-bold">Goals</h2>
          {!editing && <span className="flex gap-3">
            <Link to="/welcome" className="flex items-center gap-1 text-sm font-semibold text-brand-700"><SlidersHorizontal className="h-3.5 w-3.5" /> Recalculate</Link>
            <button className="text-sm font-semibold text-brand-700" onClick={() => setEditing(true)}>Edit</button>
          </span>}</div>
        {editing ? <GoalsForm profile={p} saving={save.isPending} onSave={(patch) => save.mutate(patch)} onCancel={() => setEditing(false)} /> : (
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <Goal k="Calories" v={`${p.kcal_goal.toLocaleString()} kcal`} />
            <Goal k="Protein" v={`${p.protein_goal_g} g`} />
            <Goal k="Carbs" v={`${p.carbs_goal_g} g`} />
            <Goal k="Fat" v={`${p.fat_goal_g} g`} />
            <Goal k="Water" v={`${p.water_goal_glasses} glasses`} />
            <Goal k="Goal weight" v={p.goal_weight_kg ? `${toDisplayWeight(p.goal_weight_kg, units)} ${weightUnit(units)}` : "Not set"} />
          </dl>
        )}
        <ErrorNote error={save.error} />
      </section>

      <HealthSection profile={p} />

      <section className="card flex animate-rise items-center justify-between gap-3 p-4 [animation-delay:75ms]">
        <div><h2 className="text-base font-bold">Units</h2><p className="text-xs text-ink-muted">Applies on this device</p></div>
        <div className="flex rounded-full bg-[#e8eee7] p-1" role="group" aria-label="Units">
          {([["imperial", "lb · ft"], ["metric", "kg · cm"]] as const).map(([u, label]) => (
            <button key={u} aria-pressed={units === u} onClick={() => setUnits(u)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${units === u ? "bg-brand-600 text-white" : "text-ink-2"}`}>{label}</button>
          ))}
        </div>
      </section>

      <section className="card grid animate-rise gap-3 p-4 [animation-delay:100ms]">
        <h2 className="text-base font-bold">Privacy</h2>
        <div className="flex items-center justify-between gap-3">
          <div><b className="text-sm">Use my health data in the Market</b><p className="text-xs text-ink-muted">Always off. Your meals, weight, goals and health focus never choose or rank marketplace listings.</p></div>
          <span className="relative h-[26px] w-11 shrink-0 cursor-not-allowed rounded-full bg-[#e8eee7] opacity-70" role="switch" aria-checked="false" aria-disabled="true" aria-label="Locked off"><i className="absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-white shadow" /></span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div><b className="text-sm">Weekly progress email</b><p className="text-xs text-ink-muted">A summary of your logs every Monday</p></div>
          <button role="switch" aria-checked={p.weekly_email} aria-label="Weekly progress email" disabled={save.isPending}
            onClick={() => save.mutate({ weekly_email: !p.weekly_email })}
            className={`relative h-[26px] w-11 shrink-0 rounded-full transition ${p.weekly_email ? "bg-brand-600" : "bg-[#e8eee7]"}`}>
            <i className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all ${p.weekly_email ? "left-[21px]" : "left-[3px]"}`} />
          </button>
        </div>
      </section>

      <section className="card animate-rise p-4 [animation-delay:150ms]">
        <div className="flex items-center justify-between"><h2 className="text-base font-bold">My questions to providers</h2><span className="num text-sm text-ink-muted">{mine.length}</span></div>
        {mine.length ? mine.slice(0, 5).map((q) => (
          <div key={q.id} className="flex items-center gap-3 border-b border-[#d8e2d9] py-2.5 last:border-0">
            <MessageCircle className="h-4 w-4 shrink-0 text-brand-700" />
            <div className="min-w-0 flex-1"><p className="truncate text-sm">{q.message}</p><p className="text-[11px] text-ink-muted">{new Date(q.created_at).toLocaleDateString()}</p></div>
            <span className="badge bg-sky-100 text-sky-600">{q.status === "new" ? "Sent" : q.status === "forwarded" ? "Delivered" : "Closed"}</span>
          </div>
        )) : <p className="mt-1 text-sm text-ink-muted">You haven't asked a provider anything yet. Open a provider in the <Link className="font-semibold text-brand-700" to="/market">Market</Link> and tap "Ask a question".</p>}
      </section>

      <section className="card grid animate-rise gap-1 p-2 [animation-delay:200ms]">
        <Link to="/market/vendor" className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-ground"><Store className="h-5 w-5 text-brand-700" /><span className="flex-1"><b className="block text-sm">Advertise your business</b><span className="text-xs text-ink-muted">Apply to list in the Market</span></span></Link>
        {isStaff && <Link to="/admin" className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-ground"><Shield className="h-5 w-5 text-brand-700" /><span className="flex-1"><b className="block text-sm">Admin panel</b><span className="text-xs text-ink-muted">Users, roles and Market review</span></span></Link>}
        <Link to="/privacy" className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-ground"><FileText className="h-5 w-5 text-brand-700" /><b className="flex-1 text-sm">Privacy Policy</b></Link>
        <Link to="/terms" className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-ground"><FileText className="h-5 w-5 text-brand-700" /><b className="flex-1 text-sm">Terms of Use</b></Link>
        <Link to="/support" className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-ground"><FileText className="h-5 w-5 text-brand-700" /><b className="flex-1 text-sm">Help &amp; support</b></Link>
        {!isDemoMode && <div className="p-1.5"><SignOut /></div>}
      </section>

      {isNative && <Reminders />}

      <YourData email={email} />
      {isDemoMode && <p className="text-center text-xs text-ink-muted">Demo mode: switch roles using the bar at the top of the page.</p>}
    </div>
  );
}

function Reminders() {
  const toast = useToast();
  const [on, setOn] = useState({ log: reminderEnabled("log"), water: reminderEnabled("water") });
  const toggle = async (k: ReminderKind) => {
    tap();
    const next = !on[k];
    const ok = await setReminder(k, next);
    if (!ok) { toast("Turn on notifications for this app in your phone's Settings"); return; }
    setOn((s) => ({ ...s, [k]: next }));
  };
  const Row = ({ k, title, sub }: { k: ReminderKind; title: string; sub: string }) => (
    <div className="flex items-center justify-between gap-3">
      <div><b className="text-sm">{title}</b><p className="text-xs text-ink-muted">{sub}</p></div>
      <button role="switch" aria-checked={on[k]} aria-label={title} onClick={() => toggle(k)}
        className={`relative h-[26px] w-11 shrink-0 rounded-full transition ${on[k] ? "bg-brand-600" : "bg-[#e8eee7]"}`}>
        <i className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all ${on[k] ? "left-[21px]" : "left-[3px]"}`} />
      </button>
    </div>
  );
  return (
    <section className="card grid animate-rise gap-3 p-4 [animation-delay:125ms]">
      <h2 className="text-base font-bold">Reminders</h2>
      <Row k="log" title="Daily log reminder" sub="Every evening at 8:00 pm" />
      <Row k="water" title="Water reminders" sub="11:00 am, 2:30 pm and 5:30 pm" />
    </section>
  );
}

function YourData({ email }: { email: string | null }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const download = useMutation({
    mutationFn: () => nutrition.exportData(),
    onSuccess: async (data) => {
      await saveFile(`my-nutrition-data-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2));
      if (!isNative) toast("Your data file is downloading");
    },
  });
  const remove = useMutation({
    mutationFn: () => nutrition.deleteAccount(),
    // resetQueries drops cached personal data and refetches as signed-out.
    onSuccess: async () => { await qc.resetQueries(); toast("Your account has been deleted"); },
  });
  return (
    <section className="card grid animate-rise gap-3 p-4 [animation-delay:250ms]">
      <h2 className="text-base font-bold">Your data</h2>
      <button className="btn-outline justify-start" disabled={download.isPending} onClick={() => download.mutate()}>
        <Download className="h-4 w-4" /> {download.isPending ? "Preparing…" : "Download my data"}
      </button>
      <ErrorNote error={download.error} />
      {!confirming ? (
        <button className="btn-outline justify-start text-rose-700 hover:bg-rose-50" onClick={() => setConfirming(true)}><Trash2 className="h-4 w-4" /> Delete my account</button>
      ) : (
        <div className="grid gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
          <p className="text-sm text-rose-900">This permanently deletes <b>{email ?? "your account"}</b> and all your meals, water, weight, workouts, goals, health focus and questions sent to providers. It can't be undone.</p>
          <Field label='Type DELETE to confirm'><input id="confirm-delete" className="input" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} /></Field>
          <ErrorNote error={remove.error} />
          <div className="flex gap-2">
            <button className="btn-danger" disabled={typed.trim() !== "DELETE" || remove.isPending} onClick={() => remove.mutate()}>{remove.isPending ? "Deleting…" : "Delete forever"}</button>
            <button className="btn-outline" onClick={() => { setConfirming(false); setTyped(""); }}>Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}

function HealthSection({ profile: p }: { profile: Profile }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [conditions, setConditions] = useState<ConditionId[]>(p.conditions);
  const [consent, setConsent] = useState(!!p.health_consent_at);
  const [prefs, setPrefs] = useState<FoodPref[]>(p.food_preferences);
  const [fitness, setFitness] = useState<FitnessValue>({ fitness_level: p.fitness_level, workout_place: p.workout_place, workout_days: p.workout_days });
  const save = useMutation({
    mutationFn: () => nutrition.updateProfile({
      // Withdrawing consent removes the stored conditions.
      conditions: consent ? conditions : [],
      health_consent_at: consent && conditions.length ? (p.health_consent_at ?? new Date().toISOString()) : null,
      food_preferences: prefs, ...fitness,
    }),
    onSuccess: (np) => { qc.setQueryData(["profile"], np); setEditing(false); toast("Saved"); },
  });
  const start = () => {
    setConditions(p.conditions); setConsent(!!p.health_consent_at); setPrefs(p.food_preferences);
    setFitness({ fitness_level: p.fitness_level, workout_place: p.workout_place, workout_days: p.workout_days });
    setEditing(true);
  };
  return (
    <section id="health" className="card animate-rise p-4 [animation-delay:60ms]">
      <div className="flex items-center justify-between"><h2 className="text-base font-bold">Health &amp; preferences</h2>
        {!editing && <button className="text-sm font-semibold text-brand-700" onClick={start}>Edit</button>}</div>
      {editing ? (
        <div className="mt-3 grid gap-5">
          <ConditionPicker value={conditions} onChange={setConditions} consent={consent} onConsent={setConsent} />
          <FoodPrefPicker value={prefs} onChange={setPrefs} />
          <FitnessPicker value={fitness} onChange={setFitness} />
          <ErrorNote error={save.error} />
          <div className="flex gap-2">
            <button className="btn-primary" disabled={save.isPending || (conditions.length > 0 && !consent)} onClick={() => save.mutate()}>Save</button>
            <button className="btn-outline" onClick={() => setEditing(false)}>Cancel</button>
          </div>
          {conditions.length > 0 && !consent && <p className="-mt-3 text-xs text-citrus-600">Tick the consent box to save a health focus, or clear your choices.</p>}
        </div>
      ) : (
        <div className="mt-2 grid gap-3 text-sm">
          <div>
            <span className="text-[11px] text-ink-muted">Health focus</span>
            {p.conditions.length ? (
              <div className="mt-1 flex flex-wrap gap-2">{p.conditions.map((id) => {
                const g = conditionGuide(id)!;
                return <Link key={id} to={`/health/${id}`} className="flex items-center gap-2 rounded-full border border-[#d8e2d9] py-1 pl-1 pr-3 font-semibold hover:border-brand-600"><ConditionIcon guide={g} size={24} /> {g.name}</Link>;
              })}</div>
            ) : <p className="text-ink-2">None chosen</p>}
          </div>
          <div><span className="text-[11px] text-ink-muted">Food preferences</span><p className="text-ink-2">{p.food_preferences.length ? p.food_preferences.map((f) => FOOD_PREF_LABEL[f]).join(", ") : "No restrictions"}</p></div>
          <div className="flex items-end justify-between gap-2">
            <div><span className="text-[11px] text-ink-muted">Workouts</span><p className="text-ink-2">{LEVEL_LABEL[p.fitness_level]} · {PLACE_LABEL[p.workout_place]} · {p.workout_days} days a week</p></div>
            <Link to="/workouts" className="flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-700"><Dumbbell className="h-3.5 w-3.5" /> My plan</Link>
          </div>
        </div>
      )}
    </section>
  );
}

function Goal({ k, v }: { k: string; v: string }) {
  return <div className="rounded-xl bg-ground p-2.5"><dt className="text-[11px] text-ink-muted">{k}</dt><dd className="num font-semibold">{v}</dd></div>;
}

function GoalsForm({ profile: p, saving, onSave, onCancel }: { profile: Profile; saving: boolean; onSave: (patch: ProfilePatch) => void; onCancel: () => void }) {
  const units = useUnits();
  const U = weightUnit(units);
  const range = weightRange(units);
  const [f, setF] = useState({
    display_name: p.display_name ?? "", kcal_goal: String(p.kcal_goal), protein_goal_g: String(p.protein_goal_g), carbs_goal_g: String(p.carbs_goal_g),
    fat_goal_g: String(p.fat_goal_g), water_goal_glasses: String(p.water_goal_glasses),
    start_weight_kg: p.start_weight_kg !== null ? String(toDisplayWeight(p.start_weight_kg, units)) : "", goal_weight_kg: p.goal_weight_kg !== null ? String(toDisplayWeight(p.goal_weight_kg, units)) : "",
  });
  const bind = (k: keyof typeof f) => ({ id: `goal-${k}`, value: f[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value }) });
  const opt = (s: string) => (s.trim() ? fromDisplayWeight(Number(s), units) : null);
  return (
    <form className="mt-3 grid gap-3" onSubmit={(e) => {
      e.preventDefault();
      onSave({
        display_name: f.display_name.trim() || null, kcal_goal: Number(f.kcal_goal), protein_goal_g: Number(f.protein_goal_g), carbs_goal_g: Number(f.carbs_goal_g),
        fat_goal_g: Number(f.fat_goal_g), water_goal_glasses: Number(f.water_goal_glasses), start_weight_kg: opt(f.start_weight_kg), goal_weight_kg: opt(f.goal_weight_kg),
      });
    }}>
      <Field label="Name"><input className="input" maxLength={60} {...bind("display_name")} /></Field>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Calories (kcal)"><input className="input num" type="number" min={800} max={6000} required {...bind("kcal_goal")} /></Field>
        <Field label="Protein (g)"><input className="input num" type="number" min={0} max={400} required {...bind("protein_goal_g")} /></Field>
        <Field label="Carbs (g)"><input className="input num" type="number" min={0} max={800} required {...bind("carbs_goal_g")} /></Field>
        <Field label="Fat (g)"><input className="input num" type="number" min={0} max={300} required {...bind("fat_goal_g")} /></Field>
        <Field label="Water (glasses)"><input className="input num" type="number" min={1} max={20} required {...bind("water_goal_glasses")} /></Field>
        <Field label={`Start weight (${U})`}><input className="input num" type="number" step="0.1" min={range.min} max={range.max} {...bind("start_weight_kg")} /></Field>
        <Field label={`Goal weight (${U})`}><input className="input num" type="number" step="0.1" min={range.min} max={range.max} {...bind("goal_weight_kg")} /></Field>
      </div>
      <div className="flex gap-2"><button className="btn-primary" disabled={saving}>Save goals</button><button type="button" className="btn-outline" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

function SignOut() {
  const qc = useQueryClient();
  return (
    <button className="btn-outline" onClick={async () => { await supabase!.auth.signOut(); qc.invalidateQueries(); }}>
      <LogOut className="h-4 w-4" /> Sign out
    </button>
  );
}

function SignInForm() {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const submit = useMutation({
    mutationFn: async (): Promise<"ok" | "check-email" | "reset-sent"> => {
      if (mode === "forgot") {
        const { error } = await supabase!.auth.resetPasswordForEmail(email, { redirectTo: appUrl("/reset-password") });
        if (error) throw error;
        return "reset-sent";
      }
      const res = mode === "in"
        ? await supabase!.auth.signInWithPassword({ email, password })
        : await supabase!.auth.signUp({ email, password, options: { emailRedirectTo: appUrl("/") } });
      if (res.error) throw res.error;
      return mode === "up" && !res.data.session ? "check-email" : "ok";
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  if (submit.data === "check-email") {
    return <div className="card mx-auto max-w-md p-5 text-sm">Check <b>{email}</b> for a confirmation link, then sign in.</div>;
  }
  if (submit.data === "reset-sent") {
    return (
      <div className="card mx-auto grid max-w-md gap-3 p-5 text-sm">
        <p>If an account exists for <b>{email}</b>, we've sent a link to reset the password. It expires in an hour.</p>
        <button className="btn-outline" onClick={() => { submit.reset(); setMode("in"); }}>Back to sign in</button>
      </div>
    );
  }

  const title = mode === "in" ? "Sign in" : mode === "up" ? "Create an account" : "Reset your password";
  return (
    <form className="card mx-auto max-w-md space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}>
      <h1 className="text-xl font-bold">{title}</h1>
      {mode === "forgot" && <p className="text-sm text-ink-2">Enter your email and we'll send you a link to choose a new password.</p>}
      <Field label="Email"><input id="auth-email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      {mode !== "forgot" && (
        <Field label="Password" hint={mode === "up" ? "At least 8 characters" : undefined}>
          <input id="auth-password" className="input" type="password" minLength={8} required autoComplete={mode === "in" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
      )}
      {mode === "in" && <button type="button" className="text-sm font-semibold text-brand-700" onClick={() => { submit.reset(); setMode("forgot"); }}>Forgot password?</button>}
      {mode === "up" && (
        <label className="flex items-start gap-2 text-sm text-ink-2">
          <input id="auth-agree" type="checkbox" className="mt-1" required checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>I'm 18 or older and agree to the <Link className="font-semibold text-brand-700" to="/terms" target="_blank">Terms</Link> and <Link className="font-semibold text-brand-700" to="/privacy" target="_blank">Privacy Policy</Link>.</span>
        </label>
      )}
      <ErrorNote error={submit.error} />
      <button className="btn-primary w-full" disabled={submit.isPending || (mode === "up" && !agree)}>
        {mode === "in" ? "Sign in" : mode === "up" ? "Sign up" : "Send reset link"}
      </button>
      <button type="button" className="w-full text-sm text-brand-700" onClick={() => { submit.reset(); setMode(mode === "in" ? "up" : "in"); }}>
        {mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </form>
  );
}

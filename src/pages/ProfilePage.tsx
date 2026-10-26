import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, MessageCircle, Shield, Store } from "lucide-react";
import { api } from "@/lib/api";
import { nutrition, type Profile, type ProfilePatch } from "@/lib/nutrition";
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
          {!editing && <button className="text-sm font-semibold text-brand-700" onClick={() => setEditing(true)}>Edit</button>}</div>
        {editing ? <GoalsForm profile={p} saving={save.isPending} onSave={(patch) => save.mutate(patch)} onCancel={() => setEditing(false)} /> : (
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <Goal k="Calories" v={`${p.kcal_goal.toLocaleString()} kcal`} />
            <Goal k="Protein" v={`${p.protein_goal_g} g`} />
            <Goal k="Carbs" v={`${p.carbs_goal_g} g`} />
            <Goal k="Fat" v={`${p.fat_goal_g} g`} />
            <Goal k="Water" v={`${p.water_goal_glasses} glasses`} />
            <Goal k="Goal weight" v={p.goal_weight_kg ? `${p.goal_weight_kg} kg` : "Not set"} />
          </dl>
        )}
        <ErrorNote error={save.error} />
      </section>

      <section className="card grid animate-rise gap-3 p-4 [animation-delay:100ms]">
        <h2 className="text-base font-bold">Privacy</h2>
        <div className="flex items-center justify-between gap-3">
          <div><b className="text-sm">Use my health data in the Market</b><p className="text-xs text-ink-muted">Always off. Your meals, weight and goals never choose or rank marketplace listings.</p></div>
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
        {isStaff && <Link to="/admin/marketplace" className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-ground"><Shield className="h-5 w-5 text-brand-700" /><span className="flex-1"><b className="block text-sm">Review console</b><span className="text-xs text-ink-muted">Approve listings and vendors</span></span></Link>}
        {!isDemoMode && <div className="p-1.5"><SignOut /></div>}
      </section>
      {isDemoMode && <p className="text-center text-xs text-ink-muted">Demo mode: switch roles using the bar at the top of the page.</p>}
    </div>
  );
}

function Goal({ k, v }: { k: string; v: string }) {
  return <div className="rounded-xl bg-ground p-2.5"><dt className="text-[11px] text-ink-muted">{k}</dt><dd className="num font-semibold">{v}</dd></div>;
}

function GoalsForm({ profile: p, saving, onSave, onCancel }: { profile: Profile; saving: boolean; onSave: (patch: ProfilePatch) => void; onCancel: () => void }) {
  const [f, setF] = useState({
    display_name: p.display_name ?? "", kcal_goal: String(p.kcal_goal), protein_goal_g: String(p.protein_goal_g), carbs_goal_g: String(p.carbs_goal_g),
    fat_goal_g: String(p.fat_goal_g), water_goal_glasses: String(p.water_goal_glasses),
    start_weight_kg: p.start_weight_kg?.toString() ?? "", goal_weight_kg: p.goal_weight_kg?.toString() ?? "",
  });
  const bind = (k: keyof typeof f) => ({ id: `goal-${k}`, value: f[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value }) });
  const opt = (s: string) => (s.trim() ? Number(s) : null);
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
        <Field label="Start weight (kg)"><input className="input num" type="number" step="0.1" min={25} max={400} {...bind("start_weight_kg")} /></Field>
        <Field label="Goal weight (kg)"><input className="input num" type="number" step="0.1" min={25} max={400} {...bind("goal_weight_kg")} /></Field>
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
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const submit = useMutation({
    mutationFn: async () => {
      const res = mode === "in"
        ? await supabase!.auth.signInWithPassword({ email, password })
        : await supabase!.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      if (res.error) throw res.error;
      return mode === "up" && !res.data.session ? "check-email" : "ok";
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  if (submit.data === "check-email") {
    return <div className="card mx-auto max-w-md p-5 text-sm">Check <b>{email}</b> for a confirmation link, then sign in.</div>;
  }

  return (
    <form className="card mx-auto max-w-md space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}>
      <h1 className="text-xl font-bold">{mode === "in" ? "Sign in" : "Create an account"}</h1>
      <Field label="Email"><input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field label="Password"><input className="input" type="password" minLength={8} required autoComplete={mode === "in" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      <ErrorNote error={submit.error} />
      <button className="btn-primary w-full" disabled={submit.isPending}>{mode === "in" ? "Sign in" : "Sign up"}</button>
      <button type="button" className="w-full text-sm text-brand-700" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </form>
  );
}

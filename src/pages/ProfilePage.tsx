import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut, Shield, Store } from "lucide-react";
import { isDemoMode, supabase } from "@/integrations/supabase/client";
import { ErrorNote, Field, Spinner, useViewer } from "@/components/ui";

// Stand-in for the app's existing Profile screen: just enough sign-in to use
// the marketplace on its own. In the Lovable app, keep the existing auth.
export default function ProfilePage() {
  const { data: viewer, isLoading } = useViewer();
  if (isLoading) return <Spinner />;

  if (viewer?.userId) {
    return (
      <div className="card mx-auto max-w-md space-y-4 p-5">
        <h1 className="text-xl font-bold">Profile</h1>
        <p className="text-sm text-slate-600">Signed in as <b>{viewer.email}</b>{viewer.isStaff && " · marketplace reviewer"}</p>
        <div className="flex flex-wrap gap-2">
          <Link to="/market/vendor" className="btn-outline"><Store className="h-4 w-4" /> Vendor portal</Link>
          {viewer.isStaff && <Link to="/admin/marketplace" className="btn-outline"><Shield className="h-4 w-4" /> Review console</Link>}
          {!isDemoMode && <SignOut />}
        </div>
        {isDemoMode && <p className="text-xs text-slate-500">Demo mode: switch roles using the bar at the top of the page.</p>}
      </div>
    );
  }

  if (isDemoMode) {
    return (
      <div className="card mx-auto max-w-md space-y-2 p-5 text-sm">
        <h1 className="text-xl font-bold">Profile</h1>
        <p className="text-slate-600">You're browsing as a visitor. In demo mode, choose <b>App user</b>, <b>Vendor</b> or <b>Admin</b> in the bar at the top to sign in as that role.</p>
      </div>
    );
  }
  return <SignInForm />;
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

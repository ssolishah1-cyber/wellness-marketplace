import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ErrorNote, Field, Spinner } from "@/components/ui";
import { useToast } from "@/components/Toast";

// Landing page for the "reset your password" email. Supabase reads the
// recovery token from the link and signs the user in for this one purpose.
export default function ResetPasswordPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [ready, setReady] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  useEffect(() => {
    if (!supabase) { setReady(false); return; }
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => setReady((r) => r || !!s.session));
    const timer = setTimeout(() => setReady((r) => r ?? false), 4000);
    return () => { data.subscription.unsubscribe(); clearTimeout(timer); };
  }, []);

  const save = useMutation({
    mutationFn: async () => {
      if (pw !== pw2) throw new Error("The two passwords don't match.");
      const { error } = await supabase!.auth.updateUser({ password: pw });
      if (error) throw error;
    },
    onSuccess: async () => { await qc.invalidateQueries(); toast("Password updated"); navigate("/"); },
  });

  if (ready === null) return <Spinner />;
  if (!ready) {
    return (
      <div className="card mx-auto grid max-w-md gap-3 p-6 text-center">
        <h1 className="text-xl font-bold">This link has expired</h1>
        <p className="text-sm text-ink-2">Password reset links work once and expire after an hour. Request a new one from the sign-in screen.</p>
        <Link to="/profile" className="btn-primary">Go to sign in</Link>
      </div>
    );
  }
  return (
    <form className="card mx-auto grid max-w-md gap-3 p-6" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-100 text-brand-700"><KeyRound className="h-5 w-5" /></span>
      <h1 className="text-xl font-bold">Choose a new password</h1>
      <Field label="New password" hint="At least 8 characters"><input id="new-pw" className="input" type="password" autoComplete="new-password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
      <Field label="Repeat new password"><input id="new-pw2" className="input" type="password" autoComplete="new-password" minLength={8} required value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
      <ErrorNote error={save.error} />
      <button className="btn-primary" disabled={save.isPending}>Save new password</button>
    </form>
  );
}

import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Check, Crown, RotateCcw } from "lucide-react";
import { PLANS, TERMS, TRIAL_DAYS, perMonth, productId, termPrice, usd, type Plan, type PlanId, type Term } from "@/lib/plans";
import { buy, purchasesAvailable, restore, storePrices } from "@/lib/purchases";
import { useAccess } from "@/components/access";
import { SignInPrompt } from "@/components/nutrition";
import { ErrorNote, Spinner, useViewer } from "@/components/ui";
import { useToast } from "@/components/Toast";

export default function PlansPage() {
  const { data: viewer, isLoading } = useViewer();
  const uid = viewer?.userId ?? null;
  const [params] = useSearchParams();
  const want = params.get("want");
  const [term, setTerm] = useState<Term>(1);
  const [starter, setStarter] = useState<PlanId>(want === "fitness" ? "starter_fitness" : "starter_nutrition");
  const a = useAccess();
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const prices = useQuery({ queryKey: ["store-prices", uid], queryFn: () => storePrices(uid!), enabled: !!uid && purchasesAvailable, staleTime: 3600_000 });
  const done = async (ents: string[] | null) => {
    if (!ents) return; // cancelled
    await Promise.all(["store-entitlements", "my-subscription"].map((k) => qc.invalidateQueries({ queryKey: [k] })));
    toast(ents.length ? "Welcome to Fitologika! Your plan is active." : "Purchase complete");
    navigate("/");
  };
  const purchase = useMutation({ mutationFn: ({ plan, months }: { plan: PlanId; months: Term }) => buy(uid!, plan, months), onSuccess: done });
  const restoreM = useMutation({ mutationFn: () => restore(uid!), onSuccess: (e) => { void done(e); if (!e.length) toast("No previous purchases found"); } });

  if (isLoading) return <Spinner />;
  if (!uid) return <SignInPrompt what="choose a plan" />;
  const tiers = [PLANS.find((p) => p.id === starter)!, PLANS.find((p) => p.id === "visionary")!, PLANS.find((p) => p.id === "max")!];
  const price = (p: Plan) => prices.data?.[productId(p.id, term)] ?? usd(termPrice(p.monthly, term));
  const current = a.sub?.plan;

  return (
    <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)] gap-4">
      <div className="animate-rise text-center">
        <h1 className="text-[28px] font-extrabold">Choose your plan</h1>
        <p className="text-sm text-ink-2">Start with a <b>{TRIAL_DAYS}-day free trial</b>. Cancel anytime before it ends and you won't be charged.</p>
      </div>

      <div className="mx-auto flex flex-wrap justify-center gap-1 rounded-full bg-[#e8eee7] p-1" role="group" aria-label="Billing period">
        {TERMS.map((t) => (
          <button key={t.months} type="button" aria-pressed={term === t.months} onClick={() => setTerm(t.months)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${term === t.months ? "bg-brand-600 text-white" : "text-ink-2"}`}>
            {t.label}{t.discount ? ` · save ${t.discount * 100}%` : ""}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {tiers.map((p) => {
          const best = p.id === "max";
          return (
            <section key={p.tier} className={`card relative grid content-start gap-3 p-4 ${best ? "border-brand-600 ring-2 ring-brand-100" : ""}`} aria-label={`${p.tier} plan`}>
              {best && <span className="absolute -top-2.5 right-3 flex items-center gap-1 rounded-full bg-brand-600 px-2.5 py-0.5 text-[11px] font-bold text-white"><Crown className="h-3 w-3" /> Best value</span>}
              <div>
                <h2 className="text-lg font-extrabold">{p.tier}</h2>
                {p.tier === "Starter" && (
                  <div className="mt-1 flex rounded-full bg-[#e8eee7] p-0.5 text-xs" role="group" aria-label="Starter focus">
                    {(["starter_nutrition", "starter_fitness"] as PlanId[]).map((id) => (
                      <button key={id} type="button" aria-pressed={starter === id} onClick={() => setStarter(id)}
                        className={`flex-1 rounded-full px-2 py-1 font-semibold ${starter === id ? "bg-white shadow" : "text-ink-2"}`}>{id === "starter_nutrition" ? "Nutrition" : "Fitness"}</button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <b className="num font-display text-[28px] leading-none">{price(p)}</b>
                <span className="text-sm text-ink-muted"> {term === 1 ? "/ month" : `for ${term} months`}</span>
                {term > 1 && <p className="num text-xs text-brand-700">{usd(perMonth(p.monthly, term))}/month · was {usd(p.monthly)}</p>}
              </div>
              <ul className="grid gap-1.5 text-sm">{p.perks.map((k) => <li key={k} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />{k}</li>)}</ul>
              {best && <p className="flex items-center gap-1.5 rounded-xl bg-citrus-50 p-2 text-xs text-citrus-600"><BookOpen className="h-3.5 w-3.5" /> Physical book shipped free after your trial</p>}
              {current === p.id && a.can(p.features[0])
                ? <span className="btn-outline justify-center">Your current plan</span>
                : purchasesAvailable
                  ? <button className={best ? "btn-primary" : "btn-outline"} disabled={purchase.isPending} onClick={() => purchase.mutate({ plan: p.id, months: term })}>Start free trial</button>
                  : <span className="rounded-xl bg-ground p-2 text-center text-xs text-ink-2">Subscribe in the Fitologika app for iPhone or Android</span>}
            </section>
          );
        })}
      </div>

      <ErrorNote error={purchase.error ?? restoreM.error} />
      {purchasesAvailable && <button type="button" className="mx-auto flex items-center gap-1.5 text-sm font-semibold text-brand-700" disabled={restoreM.isPending} onClick={() => restoreM.mutate()}><RotateCcw className="h-4 w-4" /> Restore purchases</button>}

      <p className="text-center text-[11px] leading-relaxed text-ink-muted">
        After the {TRIAL_DAYS}-day free trial, the plan renews automatically at the price shown for the period you chose, until you cancel.
        Payment is charged to your Apple ID or Google Play account. Cancel at least 24 hours before the end of the trial or period in your
        store account settings. Prices in US dollars; your store may show local prices. <Link to="/terms" className="font-semibold text-brand-700">Terms</Link> · <Link to="/privacy" className="font-semibold text-brand-700">Privacy</Link>
      </p>
    </div>
  );
}

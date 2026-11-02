import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Lock, Sparkles } from "lucide-react";
import { access, computeAccess, type Subscription } from "@/lib/access";
import { storeEntitlements } from "@/lib/purchases";
import { TRIAL_DAYS, type Feature } from "@/lib/plans";
import { useViewer } from "./ui";

export const FEATURE_LABEL: Record<Feature, string> = { nutrition: "Nutrition", fitness: "Fitness", education: "Condition guides & articles" };

export function useAccess() {
  const { data: viewer } = useViewer();
  const uid = viewer?.userId ?? null;
  const paywall = useQuery({ queryKey: ["paywall"], queryFn: () => access.paywallEnabled(), staleTime: 60_000 });
  const sub = useQuery({ queryKey: ["my-subscription", uid], queryFn: () => access.mySubscription(), enabled: !!uid && paywall.data === true });
  const store = useQuery({ queryKey: ["store-entitlements", uid], queryFn: () => storeEntitlements(uid!), enabled: !!uid && paywall.data === true });
  const a = computeAccess({ paywall: paywall.data === true, staff: !!viewer?.isStaff, sub: sub.data ?? null, storeEntitlements: store.data });
  return {
    ...a,
    loading: paywall.isLoading || (paywall.data === true && !!uid && sub.isLoading),
    paywall: paywall.data === true,
    sub: (sub.data ?? null) as Subscription | null,
    can: (f: Feature) => a.features.has(f),
  };
}

export function LockedCard({ feature, compact = false }: { feature?: Feature; compact?: boolean }) {
  return (
    <section className={`card grid justify-items-center gap-2 text-center ${compact ? "p-4" : "p-8"}`} aria-label={feature ? `${FEATURE_LABEL[feature]} locked` : "Choose a plan"}>
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-citrus-500 to-rose-600 text-white"><Lock className="h-5 w-5" /></span>
      <h2 className={`${compact ? "text-base" : "text-xl"} font-bold`}>{feature ? `Unlock ${FEATURE_LABEL[feature]}` : "Choose your plan"}</h2>
      <p className="max-w-sm text-sm text-ink-2">{feature ? "Choose a plan to use this." : "Nutrition, workouts and condition guides are part of a Fitologika plan."} Every plan starts with a {TRIAL_DAYS}-day free trial.</p>
      <Link to={feature ? `/plans?want=${feature}` : "/plans"} className="btn-primary"><Sparkles className="h-4 w-4" /> See plans</Link>
    </section>
  );
}

/** Shows children when the person's plan includes the feature (or payments are off). */
export function Gate({ feature, children }: { feature: Feature; children: React.ReactNode }) {
  const a = useAccess();
  if (a.loading) return null;
  return a.can(feature) ? <>{children}</> : <div className="mx-auto max-w-xl"><LockedCard feature={feature} /></div>;
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getDemoPersona, getDemoUserId } from "./demoApi";
import { DEMO_USERS } from "./demoData";
import { featuresOf, type Feature, type PlanId, type Term } from "./plans";

// Who can use what. Mirrors supabase/migrations/012_subscriptions.sql.
// While payments are switched off (app_settings.paywall_enabled = false)
// everything is unlocked. Staff always have full access.

export interface Subscription {
  plan: PlanId;
  term_months: Term;
  status: "trialing" | "active" | "canceled" | "past_due" | "expired";
  store: "app_store" | "play_store" | "stripe" | "manual";
  current_period_end: string | null;
}
export interface BookClaim { user_id?: string; full_name: string; address_line1: string; address_line2?: string | null; city: string; region: string; postal_code: string; country: string; status?: "requested" | "shipped"; created_at?: string }
export interface SubscriptionStats {
  paywall_enabled: boolean; trialing: number; paying: number;
  by_plan: Partial<Record<PlanId, number>>; by_term: Record<string, number>;
  commission_month_usd: number; book_claims_waiting: number;
}

export interface AccessApi {
  paywallEnabled(): Promise<boolean>;
  mySubscription(): Promise<Subscription | null>;
  myBookClaim(): Promise<BookClaim | null>;
  claimBook(c: BookClaim): Promise<void>;
  // Admin
  setPaywall(on: boolean): Promise<void>;
  stats(): Promise<SubscriptionStats>;
  bookClaims(): Promise<(BookClaim & { email?: string })[]>;
  markShipped(userId: string): Promise<void>;
  grant(userId: string, plan: PlanId | null, months: number): Promise<void>;
}

/** Subscription still gives access (inside the paid or trial period). */
export const isLive = (s: Subscription | null | undefined) =>
  !!s && s.status !== "expired" && !!s.current_period_end && new Date(s.current_period_end) > new Date();

export function computeAccess(o: { paywall: boolean; staff: boolean; sub: Subscription | null; storeEntitlements?: string[] }) {
  const all: Feature[] = ["nutrition", "fitness", "education"];
  if (!o.paywall || o.staff) return { features: new Set(all), locked: false };
  const features = new Set<Feature>([...(isLive(o.sub) ? featuresOf(o.sub!.plan) : []), ...((o.storeEntitlements ?? []) as Feature[]).filter((f) => all.includes(f))]);
  return { features, locked: features.size === 0 };
}

function supabaseAccess(sb: SupabaseClient): AccessApi {
  const check = <T>(r: { data: T | null; error: { message: string } | null }): T => { if (r.error) throw new Error(r.error.message); return r.data as T; };
  const uid = async () => (await sb.auth.getUser()).data.user?.id ?? null;
  return {
    paywallEnabled: async () => (check<{ value: unknown } | null>(await sb.from("app_settings").select("value").eq("key", "paywall_enabled").maybeSingle()))?.value === true,
    mySubscription: async () => { const id = await uid(); return id ? check<Subscription | null>(await sb.from("subscriptions").select("plan, term_months, status, store, current_period_end").eq("user_id", id).maybeSingle()) : null; },
    myBookClaim: async () => { const id = await uid(); return id ? check<BookClaim | null>(await sb.from("book_claims").select("*").eq("user_id", id).maybeSingle()) : null; },
    claimBook: async (c) => { check(await sb.from("book_claims").insert(c)); },
    setPaywall: async (on) => { check(await sb.from("app_settings").upsert({ key: "paywall_enabled", value: on, updated_at: new Date().toISOString() })); },
    stats: async () => check<SubscriptionStats>(await sb.rpc("admin_subscription_stats")),
    bookClaims: async () => check(await sb.from("book_claims").select("*").order("created_at")),
    markShipped: async (userId) => { check(await sb.from("book_claims").update({ status: "shipped", shipped_at: new Date().toISOString() }).eq("user_id", userId)); },
    grant: async (userId, plan, months) => { check(await sb.rpc("admin_set_subscription", { _user_id: userId, _plan: plan, _months: months })); },
  };
}

// ---------- demo ----------
let demoPaywall = false;
const inDays = (n: number) => new Date(Date.now() + n * 86400e3).toISOString();
const demoSubs = new Map<string, Subscription>([
  [DEMO_USERS.member.id, { plan: "visionary", term_months: 1, status: "trialing", store: "app_store", current_period_end: inDays(5) }],
]);
const demoClaims = new Map<string, BookClaim>();
const admin = () => { if (getDemoPersona() !== "admin") throw new Error("Admins only"); };

const demoAccess: AccessApi = {
  paywallEnabled: async () => demoPaywall,
  mySubscription: async () => structuredClone(demoSubs.get(getDemoUserId() ?? "") ?? null),
  myBookClaim: async () => structuredClone(demoClaims.get(getDemoUserId() ?? "") ?? null),
  claimBook: async (c) => {
    const id = getDemoUserId();
    const s = demoSubs.get(id ?? "");
    if (!id || !s || s.plan !== "max" || !isLive(s) || s.status === "trialing") throw new Error("The free book comes with a paid Max plan.");
    demoClaims.set(id, { ...c, status: "requested", created_at: new Date().toISOString() });
  },
  setPaywall: async (on) => { admin(); demoPaywall = on; },
  stats: async () => {
    admin();
    const live = [...demoSubs.values()].filter(isLive);
    const paying = live.filter((s) => s.status !== "trialing");
    const by_plan: Partial<Record<PlanId, number>> = {};
    for (const s of paying) by_plan[s.plan] = (by_plan[s.plan] ?? 0) + 1;
    return {
      paywall_enabled: demoPaywall, trialing: live.length - paying.length, paying: paying.length, by_plan, by_term: {},
      commission_month_usd: paying.reduce((n, s) => n + (s.plan.startsWith("starter") ? 0.5 : s.plan === "visionary" ? 0.75 : 1), 0),
      book_claims_waiting: [...demoClaims.values()].filter((c) => c.status === "requested").length,
    };
  },
  bookClaims: async () => { admin(); return [...demoClaims.entries()].map(([user_id, c]) => ({ ...c, user_id })); },
  markShipped: async (userId) => { admin(); const c = demoClaims.get(userId); if (c) c.status = "shipped"; },
  grant: async (userId, plan, months) => {
    admin();
    if (!plan) demoSubs.delete(userId);
    else demoSubs.set(userId, { plan, term_months: 1, status: "active", store: "manual", current_period_end: inDays(30 * Math.max(months, 1)) });
  },
};

export const access: AccessApi = supabase ? supabaseAccess(supabase) : demoAccess;

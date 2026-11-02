// Fitologika plans (Nov 2 review with Ben):
//   Starter   $9.99/mo: nutrition OR fitness
//   Visionary $19.99/mo: nutrition + fitness
//   Max       $29.99/mo: nutrition + fitness + education, plus a free physical book
// Paying 3, 6 or 12 months up front saves 20%, 40% or 50%. Every plan starts
// with a 7-day free trial (the store's introductory offer).
// Store prices end in .99, so discounted totals round up to the next .99.

export type PlanId = "starter_nutrition" | "starter_fitness" | "visionary" | "max";
export type Feature = "nutrition" | "fitness" | "education";
export type Term = 1 | 3 | 6 | 12;

export interface Plan { id: PlanId; tier: "Starter" | "Visionary" | "Max"; name: string; monthly: number; features: Feature[]; perks: string[] }

export const PLANS: Plan[] = [
  { id: "starter_nutrition", tier: "Starter", name: "Starter · Nutrition", monthly: 9.99, features: ["nutrition"],
    perks: ["Meal log, calories and macros", "Daily coach tips", "Meal ideas for your diet", "Water and weight tracking"] },
  { id: "starter_fitness", tier: "Starter", name: "Starter · Fitness", monthly: 9.99, features: ["fitness"],
    perks: ["Weekly workout plan", "Build-a-workout for any area", "700+ exercises with photos", "Home or gym"] },
  { id: "visionary", tier: "Visionary", name: "Visionary", monthly: 19.99, features: ["nutrition", "fitness"],
    perks: ["Everything in Nutrition", "Everything in Fitness", "Tailored to your health focus"] },
  { id: "max", tier: "Max", name: "Max", monthly: 29.99, features: ["nutrition", "fitness", "education"],
    perks: ["Nutrition + Fitness", "Condition guides for 8 health focuses", "New articles every Tuesday and Friday", "Free physical copy of Dr. Ben's book"] },
];

export const TERMS: { months: Term; label: string; discount: number }[] = [
  { months: 1, label: "Monthly", discount: 0 },
  { months: 3, label: "3 months", discount: 0.2 },
  { months: 6, label: "6 months", discount: 0.4 },
  { months: 12, label: "12 months", discount: 0.5 },
];

export const TRIAL_DAYS = 7;
export const planById = (id: string | null | undefined) => PLANS.find((p) => p.id === id);
export const featuresOf = (id: string | null | undefined): Feature[] => planById(id)?.features ?? [];

/** Total charged for a term, rounded up to a store price ending in .99. */
export function termPrice(monthly: number, months: Term): number {
  const discount = TERMS.find((t) => t.months === months)!.discount;
  const raw = Math.round(monthly * months * (1 - discount) * 100) / 100;
  return months === 1 ? monthly : Math.ceil(raw) - 0.01;
}

export const perMonth = (monthly: number, months: Term) => Math.round((termPrice(monthly, months) / months) * 100) / 100;
export const usd = (n: number) => `$${n.toFixed(2)}`;

/** Store product id, the same in App Store Connect, Google Play and RevenueCat. */
export const productId = (plan: PlanId, months: Term) => `fitologika_${plan}_${months}m`;
export const ALL_PRODUCT_IDS = PLANS.flatMap((p) => TERMS.map((t) => productId(p.id, t.months)));

/** Commission per paying subscriber per month (agreement with Soli, Nov 2). */
export const COMMISSION_USD: Record<PlanId, number> = { starter_nutrition: 0.5, starter_fitness: 0.5, visionary: 0.75, max: 1 };

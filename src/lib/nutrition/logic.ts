import type { DayTotal, FoodEntry, Macros, MealSlot, Profile } from "./types";

// ---------- dates (always the user's local calendar day) ----------
export function isoDay(d: Date = new Date()): string {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return isoDay(new Date(y, m - 1, d + n));
}
export function parseDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}
/** Monday-first week containing `day`. */
export function weekOf(day: string): string[] {
  const dow = (parseDay(day).getDay() + 6) % 7;
  const start = addDays(day, -dow);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

// ---------- totals ----------
export function sumMacros(entries: Pick<FoodEntry, "kcal" | "protein_g" | "carbs_g" | "fat_g">[]): Macros {
  return entries.reduce(
    (a, e) => ({ kcal: a.kcal + e.kcal, protein_g: a.protein_g + Number(e.protein_g), carbs_g: a.carbs_g + Number(e.carbs_g), fat_g: a.fat_g + Number(e.fat_g) }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

export function totalsByDay(entries: FoodEntry[], from: string, to: string): DayTotal[] {
  const out: DayTotal[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const day = entries.filter((e) => e.eaten_on === d);
    const m = sumMacros(day);
    out.push({ day: d, kcal: m.kcal, protein_g: Math.round(m.protein_g) });
  }
  return out;
}

/** Consecutive days with at least one food entry, ending today (or yesterday if today is empty). */
export function loggingStreak(days: DayTotal[], today: string): number {
  const logged = new Set(days.filter((d) => d.kcal > 0).map((d) => d.day));
  let cur = logged.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (logged.has(cur)) { n++; cur = addDays(cur, -1); }
  return n;
}

// ---------- coach ----------
// Rule-based guidance from the user's own goals and log. It never references
// marketplace products or partners.
export interface CoachTip { text: string; emphasis?: string; action: "add_dinner" | "add_snack" | "add_breakfast" | "view_meals" }

export function coachTip(m: Macros, p: Pick<Profile, "kcal_goal" | "protein_goal_g">, logged: Set<MealSlot>, hour: number): CoachTip {
  const left = p.kcal_goal - m.kcal;
  const proteinGap = Math.round(p.protein_goal_g - m.protein_g);
  if (logged.size === 0) {
    return hour < 11
      ? { text: "Start with a protein-rich breakfast. Eggs or Greek yogurt make the rest of the day easier.", action: "add_breakfast" }
      : { text: "Nothing logged yet today. Add what you've eaten so far to see where you stand.", action: "add_breakfast" };
  }
  if (left < -150) {
    return { text: `You're about ${Math.abs(left)} kcal over today's goal. No problem. Tomorrow's a fresh start; lighter, veg-heavy meals help balance the week.`, action: "view_meals" };
  }
  if (!logged.has("dinner") && hour >= 15) {
    if (proteinGap > 20) return { text: `You're ${proteinGap} g short on protein. A dinner built around fish, chicken, tofu or lentils (30–35 g) would close most of the gap.`, emphasis: `${proteinGap} g short on protein`, action: "add_dinner" };
    return { text: `You have ${Math.max(0, left)} kcal left for dinner. Fill half the plate with vegetables to stay full.`, emphasis: `${Math.max(0, left)} kcal left`, action: "add_dinner" };
  }
  if (proteinGap > 15) {
    return { text: `Still ${proteinGap} g short on protein. A cup of Greek yogurt (17 g) or a glass of milk (8 g) as a snack would get you close.`, emphasis: `${proteinGap} g short on protein`, action: "add_snack" };
  }
  if (left > 0) return { text: `Protein target ${proteinGap > 0 ? "nearly " : ""}reached. Nice work. You have ${left} kcal left for today.`, emphasis: `${left} kcal left`, action: "view_meals" };
  return { text: "Right on target today. Nice work.", action: "view_meals" };
}

// ---------- quick picks ----------
export const QUICK_FOODS: (Omit<FoodEntry, "id" | "created_at" | "eaten_on" | "meal"> & { icon: string })[] = [
  { name: "Greek yogurt, berries & granola", kcal: 420, protein_g: 28, carbs_g: 52, fat_g: 11, icon: "coffee" },
  { name: "Two eggs on wholegrain toast", kcal: 360, protein_g: 20, carbs_g: 30, fat_g: 17, icon: "egg" },
  { name: "Chicken quinoa bowl", kcal: 610, protein_g: 46, carbs_g: 62, fat_g: 18, icon: "salad" },
  { name: "Salmon, rice & greens", kcal: 520, protein_g: 34, carbs_g: 48, fat_g: 19, icon: "fish" },
  { name: "Red lentil soup", kcal: 310, protein_g: 18, carbs_g: 44, fat_g: 6, icon: "soup" },
  { name: "Hummus veggie wrap", kcal: 430, protein_g: 15, carbs_g: 52, fat_g: 17, icon: "salad" },
  { name: "Protein berry smoothie", kcal: 280, protein_g: 25, carbs_g: 32, fat_g: 5, icon: "cup" },
  { name: "Apple & almond butter", kcal: 190, protein_g: 5, carbs_g: 24, fat_g: 9, icon: "apple" },
];

// ---------- goal suggestions (first-run setup) ----------
export type Sex = "female" | "male";
export type Activity = "sedentary" | "light" | "moderate" | "active";
export type GoalKind = "lose" | "maintain" | "gain";
export const ACTIVITY_LABEL: Record<Activity, string> = {
  sedentary: "Mostly sitting", light: "Light (walks, 1–2 workouts a week)", moderate: "Moderate (3–4 workouts a week)", active: "Very active (5+ workouts or a physical job)",
};
const ACTIVITY_FACTOR: Record<Activity, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };

export interface Targets { kcal_goal: number; protein_goal_g: number; carbs_goal_g: number; fat_goal_g: number; water_goal_glasses: number }

/**
 * Mifflin-St Jeor estimate. A starting point the user can edit, not medical advice.
 * Losing: about 500 kcal/day below maintenance, never below a safe floor.
 */
export function suggestTargets(i: { sex: Sex; age: number; heightCm: number; weightKg: number; activity: Activity; goal: GoalKind }): Targets {
  const bmr = 10 * i.weightKg + 6.25 * i.heightCm - 5 * i.age + (i.sex === "male" ? 5 : -161);
  const tdee = bmr * ACTIVITY_FACTOR[i.activity];
  const floor = i.sex === "male" ? 1500 : 1200;
  const raw = i.goal === "lose" ? Math.max(floor, tdee - 500) : i.goal === "gain" ? tdee + 300 : tdee;
  const kcal = Math.round(raw / 10) * 10;
  const protein = Math.round(i.weightKg * (i.goal === "maintain" ? 1.4 : 1.8));
  const fat = Math.round((kcal * 0.3) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const water = Math.min(14, Math.max(6, Math.round((i.weightKg * 35) / 250)));
  return { kcal_goal: kcal, protein_goal_g: protein, carbs_goal_g: carbs, fat_goal_g: fat, water_goal_glasses: water };
}

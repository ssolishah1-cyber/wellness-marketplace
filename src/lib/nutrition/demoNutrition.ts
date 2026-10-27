import { getDemoUserId, setDemoPersona } from "../demoApi";
import { addDays, isoDay, totalsByDay } from "./logic";
import type { FoodEntry, MealSlot, NutritionApi, Profile, WeightLog, WorkoutLog } from "./types";

// In-memory stand-in for the nutrition tables. Each demo persona gets its own
// private data, mirroring the owner-only rules in 003_nutrition.sql.

interface Store { profile: Profile; food: FoodEntry[]; water: Record<string, number>; weights: WeightLog[]; workouts: WorkoutLog[] }
const stores = new Map<string, Store>();
const uid = () => Math.random().toString(36).slice(2, 10);
const delay = <T>(v: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 80));

const PAST_DAYS: [MealSlot, string, number, number, number, number][][] = [
  [["breakfast", "Overnight oats", 380, 16, 58, 9], ["lunch", "Turkey & avocado wrap", 540, 34, 46, 22], ["dinner", "Chicken stir-fry", 640, 42, 60, 20], ["snack", "Protein shake & banana", 300, 48, 30, 5]],
  [["breakfast", "Greek yogurt, berries & granola", 420, 28, 52, 11], ["lunch", "Lentil salad", 480, 24, 56, 16], ["dinner", "Salmon, rice & greens", 520, 34, 48, 19], ["snack", "Banana", 105, 1, 27, 0]],
  [["breakfast", "Two eggs on wholegrain toast", 360, 20, 30, 17], ["lunch", "Chicken quinoa bowl", 610, 46, 62, 18], ["dinner", "Beef chili", 690, 44, 58, 28], ["snack", "Cottage cheese & berries", 220, 30, 16, 6]],
  [["breakfast", "Protein berry smoothie", 280, 25, 32, 5], ["lunch", "Sushi bowl", 620, 30, 88, 14], ["dinner", "Pasta primavera", 720, 24, 104, 22], ["snack", "Dark chocolate", 170, 2, 13, 12]],
  [["breakfast", "Overnight oats", 380, 16, 58, 9], ["lunch", "Hummus veggie wrap", 430, 15, 52, 17], ["dinner", "Pizza (3 slices)", 860, 36, 96, 34], ["snack", "Trail mix", 290, 8, 24, 19]],
  [["breakfast", "Pancakes & berries", 520, 14, 82, 14], ["lunch", "Burrito bowl", 780, 38, 92, 26], ["dinner", "Grilled fish tacos", 640, 36, 62, 24], ["snack", "Popcorn", 140, 4, 26, 3]],
];
const TODAY: [MealSlot, string, number, number, number, number][] = [
  ["breakfast", "Greek yogurt, berries & granola", 420, 28, 52, 11],
  ["lunch", "Chicken quinoa bowl", 610, 46, 62, 18],
  ["snack", "Apple & almond butter", 190, 5, 24, 9],
];
const WEIGHTS = [84.6, 84.1, 83.9, 83.2, 82.8, 82.9, 82.3, 81.7];

function seed(userId: string): Store {
  const today = isoDay();
  const mk = (day: string, [meal, name, kcal, p, c, f]: [MealSlot, string, number, number, number, number]): FoodEntry =>
    ({ id: uid(), eaten_on: day, meal, name, kcal, protein_g: p, carbs_g: c, fat_g: f, created_at: new Date().toISOString() });
  const food: FoodEntry[] = [];
  // 23-day logging streak: the six detailed days below, plus simple earlier days.
  for (let i = 22; i >= 7; i--) food.push(mk(addDays(today, -i), ["lunch", "Logged meals", 1900 + ((i * 37) % 300), 120, 210, 65]));
  PAST_DAYS.forEach((items, i) => items.forEach((it) => food.push(mk(addDays(today, -(6 - i)), it))));
  TODAY.forEach((it) => food.push(mk(today, it)));
  return {
    profile: {
      user_id: userId, display_name: userId === "user-member" ? "Jordan" : userId === "user-vendor" ? "Maya" : "Alex",
      kcal_goal: 2100, protein_goal_g: 140, carbs_goal_g: 230, fat_goal_g: 70, water_goal_glasses: 8,
      start_weight_kg: 84.6, goal_weight_kg: 78.6, weekly_email: true, onboarded_at: addDays(today, -56) + "T08:00:00Z", created_at: addDays(today, -56) + "T08:00:00Z",
      conditions: userId === "user-member" ? ["diabetes", "focus"] : [], health_consent_at: userId === "user-member" ? addDays(today, -56) + "T08:00:00Z" : null,
      food_preferences: [], fitness_level: "beginner", workout_place: "home", workout_days: 3,
    },
    workouts: [{ done_on: addDays(today, -1), session_id: "cardio", minutes: 25 }, { done_on: addDays(today, -3), session_id: "strength-a", minutes: 27 }],
    food,
    water: { [today]: 5 },
    weights: WEIGHTS.map((w, i) => ({ measured_on: addDays(today, -7 * (WEIGHTS.length - 1 - i)), weight_kg: w })),
  };
}

function store(): Store {
  const id = getDemoUserId();
  if (!id) throw new Error("Please sign in to use this.");
  if (!stores.has(id)) stores.set(id, seed(id));
  return stores.get(id)!;
}

export const demoNutrition: NutritionApi = {
  getProfile: async () => (getDemoUserId() ? delay(store().profile) : null),
  updateProfile: async (patch) => {
    const s = store();
    const next = { ...s.profile, ...patch };
    if (next.conditions.length && !next.health_consent_at) throw new Error("Please agree to store your health focus first.");
    s.profile = next;
    return delay(s.profile);
  },
  listFood: async (day) => delay(store().food.filter((f) => f.eaten_on === day)),
  addFood: async (input) => {
    if (!input.name.trim()) throw new Error("Give the food a name.");
    if (input.kcal < 0 || input.kcal > 5000) throw new Error("Calories must be between 0 and 5,000.");
    const e: FoodEntry = { ...input, id: uid(), created_at: new Date().toISOString() };
    store().food.push(e);
    return delay(e);
  },
  deleteFood: async (id) => { const s = store(); s.food = s.food.filter((f) => f.id !== id); },
  dailyTotals: async (from, to) => delay(totalsByDay(store().food, from, to)),
  getWater: async (day) => delay(store().water[day] ?? 0),
  setWater: async (day, n) => { const s = store(); s.water[day] = Math.max(0, Math.min(30, n)); return delay(s.water[day]); },
  listWeights: async () => delay([...store().weights].sort((a, b) => a.measured_on.localeCompare(b.measured_on))),
  exportData: async () => {
    const s = store();
    return delay({ exported_at: new Date().toISOString(), account: { email: `${getDemoUserId()}@demo` }, profile: s.profile, food_log: s.food, water: s.water, weight: s.weights, workouts: s.workouts });
  },
  listWorkouts: async (from, to) => delay(store().workouts.filter((w) => w.done_on >= from && w.done_on <= to)),
  setWorkoutDone: async (day, sessionId, minutes) => {
    const s = store();
    s.workouts = s.workouts.filter((w) => !(w.done_on === day && w.session_id === sessionId));
    if (minutes !== null) s.workouts.push({ done_on: day, session_id: sessionId, minutes });
  },
  deleteAccount: async () => {
    const id = getDemoUserId();
    if (!id) throw new Error("Please sign in first.");
    stores.delete(id);
    setDemoPersona("visitor");
  },
  logWeight: async (day, kg) => {
    if (kg < 25 || kg > 400) throw new Error("Enter a weight between 25 and 400 kg.");
    const s = store();
    const w = { measured_on: day, weight_kg: Math.round(kg * 10) / 10 };
    s.weights = [...s.weights.filter((x) => x.measured_on !== day), w];
    return delay(w);
  },
};

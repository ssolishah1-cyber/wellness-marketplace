// Mirrors supabase/migrations/003_nutrition.sql

export type MealSlot = "breakfast" | "lunch" | "snack" | "dinner";
export const MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "snack", "dinner"];
export const MEAL_LABEL: Record<MealSlot, string> = { breakfast: "Breakfast", lunch: "Lunch", snack: "Snack", dinner: "Dinner" };

export interface Profile {
  user_id: string;
  display_name: string | null;
  kcal_goal: number;
  protein_goal_g: number;
  carbs_goal_g: number;
  fat_goal_g: number;
  water_goal_glasses: number;
  start_weight_kg: number | null;
  goal_weight_kg: number | null;
  weekly_email: boolean;
  onboarded_at: string | null;
  created_at: string;
}

export type ProfilePatch = Partial<Omit<Profile, "user_id" | "created_at">>;

export interface FoodEntry {
  id: string;
  eaten_on: string; // YYYY-MM-DD
  meal: MealSlot;
  name: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
}

export type FoodInput = Omit<FoodEntry, "id" | "created_at">;

export interface WeightLog {
  measured_on: string;
  weight_kg: number;
}

export interface DayTotal {
  day: string;
  kcal: number;
  protein_g: number;
}

export interface Macros {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface NutritionApi {
  getProfile(): Promise<Profile | null>;
  updateProfile(patch: ProfilePatch): Promise<Profile>;
  listFood(day: string): Promise<FoodEntry[]>;
  addFood(input: FoodInput): Promise<FoodEntry>;
  deleteFood(id: string): Promise<void>;
  dailyTotals(from: string, to: string): Promise<DayTotal[]>;
  getWater(day: string): Promise<number>;
  setWater(day: string, glasses: number): Promise<number>;
  listWeights(): Promise<WeightLog[]>;
  logWeight(day: string, kg: number): Promise<WeightLog>;
  /** Everything stored about the signed-in user, for "Download my data". */
  exportData(): Promise<Record<string, unknown>>;
  /** Permanently deletes the account and all personal data, then signs out. */
  deleteAccount(): Promise<void>;
}

// Mirrors supabase/migrations/003_nutrition.sql and 006_health_profile_and_workouts.sql

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
  /** Health focus areas; saved only with consent (health_consent_at). Never used by the Market. */
  conditions: ConditionId[];
  health_consent_at: string | null;
  food_preferences: FoodPref[];
  fitness_level: FitnessLevel;
  workout_place: WorkoutPlace;
  workout_days: number;
  created_at: string;
}

export type ConditionId = "diabetes" | "hypertension" | "ibs" | "focus" | "relaxation";
export type FoodPref = "vegetarian" | "vegan" | "pescatarian" | "halal" | "kosher" | "gluten_free" | "dairy_free" | "nut_free" | "low_carb";
export type FitnessLevel = "beginner" | "intermediate" | "advanced";
export type WorkoutPlace = "home" | "gym";

export interface WorkoutLog {
  done_on: string;
  session_id: string;
  minutes: number;
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
  listWorkouts(from: string, to: string): Promise<WorkoutLog[]>;
  /** Marks a planned session done (minutes) or not done (null). */
  setWorkoutDone(day: string, sessionId: string, minutes: number | null): Promise<void>;
  /** Everything stored about the signed-in user, for "Download my data". */
  exportData(): Promise<Record<string, unknown>>;
  /** Permanently deletes the account and all personal data, then signs out. */
  deleteAccount(): Promise<void>;
}

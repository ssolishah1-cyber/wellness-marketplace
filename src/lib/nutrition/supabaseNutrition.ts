import type { SupabaseClient } from "@supabase/supabase-js";
import { totalsByDay } from "./logic";
import type { FoodEntry, NutritionApi, Profile, WeightLog } from "./types";

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// Postgres numeric columns arrive as strings; convert them to numbers.
const food = (r: FoodEntry): FoodEntry => ({ ...r, protein_g: Number(r.protein_g), carbs_g: Number(r.carbs_g), fat_g: Number(r.fat_g) });
const prof = (r: Profile): Profile => ({
  ...r,
  start_weight_kg: r.start_weight_kg === null ? null : Number(r.start_weight_kg),
  goal_weight_kg: r.goal_weight_kg === null ? null : Number(r.goal_weight_kg),
});

// Row Level Security in 003_nutrition.sql limits every query to the signed-in user's own rows.
export function supabaseNutrition(sb: SupabaseClient): NutritionApi {
  const uid = async () => (await sb.auth.getUser()).data.user?.id ?? null;

  return {
    async getProfile() {
      const id = await uid();
      if (!id) return null;
      const row = unwrap<Profile | null>(await sb.from("profiles").select("*").eq("user_id", id).maybeSingle());
      if (row) return prof(row);
      // Older accounts created before the signup trigger existed.
      return prof(unwrap<Profile>(await sb.from("profiles").insert({ user_id: id }).select().single()));
    },
    async updateProfile(patch) {
      const id = await uid();
      if (!id) throw new Error("Please sign in first.");
      return prof(unwrap<Profile>(await sb.from("profiles").update(patch).eq("user_id", id).select().single()));
    },
    async listFood(day) {
      return unwrap<FoodEntry[]>(await sb.from("food_entries").select("*").eq("eaten_on", day).order("created_at")).map(food);
    },
    async addFood(input) {
      return food(unwrap<FoodEntry>(await sb.from("food_entries").insert(input).select().single()));
    },
    async deleteFood(id) {
      unwrap(await sb.from("food_entries").delete().eq("id", id));
    },
    async dailyTotals(from, to) {
      const rows = unwrap<FoodEntry[]>(
        await sb.from("food_entries").select("*").gte("eaten_on", from).lte("eaten_on", to),
      ).map(food);
      return totalsByDay(rows, from, to);
    },
    async getWater(day) {
      const row = unwrap<{ glasses: number } | null>(await sb.from("water_logs").select("glasses").eq("day", day).maybeSingle());
      return row?.glasses ?? 0;
    },
    async setWater(day, glasses) {
      const id = await uid();
      if (!id) throw new Error("Please sign in first.");
      const row = unwrap<{ glasses: number }>(
        await sb.from("water_logs").upsert({ user_id: id, day, glasses }, { onConflict: "user_id,day" }).select("glasses").single(),
      );
      return row.glasses;
    },
    async listWeights() {
      return unwrap<WeightLog[]>(await sb.from("weight_logs").select("measured_on, weight_kg").order("measured_on")).map((w) => ({ ...w, weight_kg: Number(w.weight_kg) }));
    },
    async exportData() {
      const id = await uid();
      if (!id) throw new Error("Please sign in first.");
      const [profile, food, water, weights, inquiries, vendor] = await Promise.all([
        sb.from("profiles").select("*").eq("user_id", id).maybeSingle(),
        sb.from("food_entries").select("eaten_on, meal, name, kcal, protein_g, carbs_g, fat_g, created_at").order("eaten_on"),
        sb.from("water_logs").select("day, glasses").order("day"),
        sb.from("weight_logs").select("measured_on, weight_kg").order("measured_on"),
        sb.from("marketplace_inquiries").select("created_at, contact_name, contact_email, message, status").eq("user_id", id),
        sb.from("marketplace_vendors").select("business_name, contact_email, website_url, status, created_at").eq("owner_user_id", id),
      ]);
      for (const r of [profile, food, water, weights, inquiries, vendor]) if (r.error) throw new Error(r.error.message);
      const { data: u } = await sb.auth.getUser();
      return {
        exported_at: new Date().toISOString(),
        account: { email: u.user?.email, created_at: u.user?.created_at },
        profile: profile.data, food_log: food.data, water: water.data, weight: weights.data,
        questions_to_providers: inquiries.data, vendor_account: vendor.data,
      };
    },
    async deleteAccount() {
      const { error } = await sb.rpc("delete_my_account");
      if (error) throw new Error(error.message);
      await sb.auth.signOut();
    },
    async logWeight(day, kg) {
      const id = await uid();
      if (!id) throw new Error("Please sign in first.");
      const row = unwrap<WeightLog>(
        await sb.from("weight_logs").upsert({ user_id: id, measured_on: day, weight_kg: kg }, { onConflict: "user_id,measured_on" }).select("measured_on, weight_kg").single(),
      );
      return { ...row, weight_kg: Number(row.weight_kg) };
    },
  };
}

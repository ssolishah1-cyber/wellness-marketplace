import { supabase } from "@/integrations/supabase/client";
import { demoNutrition } from "./demoNutrition";
import { supabaseNutrition } from "./supabaseNutrition";
import type { NutritionApi } from "./types";

export const nutrition: NutritionApi = supabase ? supabaseNutrition(supabase) : demoNutrition;
export * from "./types";
export * from "./logic";

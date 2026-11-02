import { exerciseFit, rankExercises, type DbExercise } from "@/lib/exerciseDb";
import type { ConditionId, FitnessLevel, WorkoutPlace } from "@/lib/nutrition/types";

// "Build a workout": the person picks a body area and a time, and we pull a
// session from the 741-exercise library, filtered for their level, place and
// health focus (the same safety rules as everywhere else).

export type AreaId = "full" | "abs" | "arms" | "chest" | "back" | "shoulders" | "legs" | "glutes" | "cardio" | "stretch";

export const AREAS: { id: AreaId; label: string; muscles?: string[]; categories?: DbExercise["category"][] }[] = [
  { id: "full", label: "Full body" },
  { id: "abs", label: "Abs & core", muscles: ["abdominals"] },
  { id: "arms", label: "Arms", muscles: ["biceps", "triceps", "forearms"] },
  { id: "chest", label: "Chest", muscles: ["chest"] },
  { id: "back", label: "Back", muscles: ["lats", "middle back", "lower back", "traps"] },
  { id: "shoulders", label: "Shoulders", muscles: ["shoulders"] },
  { id: "legs", label: "Legs", muscles: ["quadriceps", "hamstrings", "calves", "adductors", "abductors"] },
  { id: "glutes", label: "Glutes", muscles: ["glutes", "hamstrings"] },
  { id: "cardio", label: "Cardio", categories: ["cardio", "plyometrics"] },
  { id: "stretch", label: "Stretch & relax", categories: ["stretching"] },
];
export const areaLabel = (id: string) => AREAS.find((a) => a.id === id)?.label ?? "Workout";

/** Areas to suggest first for each health focus. */
export const AREAS_FOR: Record<ConditionId, AreaId[]> = {
  diabetes: ["full", "legs", "cardio"],
  hypertension: ["cardio", "stretch"],
  ibs: ["stretch", "cardio"],
  focus: ["cardio", "full"],
  relaxation: ["stretch"],
  weight_loss: ["full", "cardio", "legs"],
  heart_health: ["cardio", "full"],
  general_wellness: ["full", "stretch"],
};
export const recommendedAreas = (conditions: ConditionId[]) => [...new Set(conditions.flatMap((c) => AREAS_FOR[c] ?? []))];

export const DURATIONS = [10, 20, 30] as const;
const COUNT: Record<number, number> = { 10: 4, 20: 6, 30: 8 };

export interface QuickItem { exercise: DbExercise; dose: string; why: string[] }
export interface QuickWorkout { area: AreaId; minutes: number; items: QuickItem[]; notes: string[] }

type Person = { fitness_level: FitnessLevel; workout_place: WorkoutPlace; conditions: ConditionId[] };

/** Small deterministic shuffle so "Shuffle" gives a new mix and the same seed repeats it. */
function shuffled<T>(list: T[], seed: number): T[] {
  const out = [...list];
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function dose(e: DbExercise, level: FitnessLevel, minutes: number, count: number, bp: boolean): string {
  if (e.category === "stretching") return "30–45 s each side";
  if (e.category === "cardio" || e.category === "plyometrics") return e.category === "cardio" ? `${Math.max(3, Math.round(minutes / count))} min` : "3 × 30 s, rest 30 s";
  const sets = { beginner: 2, intermediate: 3, advanced: 3 }[level];
  const reps = bp ? "12–15" : { beginner: "10", intermediate: "10–12", advanced: "8–12" }[level];
  return e.force === "static" ? `${sets} × 30 s` : `${sets} × ${reps}`;
}

export function buildQuickWorkout(db: DbExercise[], p: Person, area: AreaId, minutes: number, seed = 1): QuickWorkout {
  const def = AREAS.find((a) => a.id === area)!;
  const n = COUNT[minutes] ?? 6;
  const filter = (e: DbExercise) =>
    area === "full" ? e.category === "strength" && e.mechanic === "compound"
      : def.categories ? def.categories.includes(e.category)
      : e.category === "strength" && e.primaryMuscles.some((m) => def.muscles!.includes(m));
  // Best matches first, then shuffle within the top group for variety.
  const ranked = rankExercises(db, p, filter);
  const pool = shuffled(ranked.slice(0, Math.max(n * 4, 16)), seed);
  // Prefer different main muscles before repeating one.
  const picked: typeof pool = [];
  const used = new Set<string>();
  for (const x of pool) if (picked.length < n && !used.has(x.e.primaryMuscles[0])) { picked.push(x); used.add(x.e.primaryMuscles[0]); }
  for (const x of pool) if (picked.length < n && !picked.includes(x)) picked.push(x);
  // Cardio has few library entries: fill with low-impact full-body moves done as a circuit.
  if (area === "cardio" && picked.length < n) {
    const extra = rankExercises(db, p, (e) => e.category === "strength" && e.mechanic === "compound" && e.equipment === "body only")
      .filter((x) => !picked.some((y) => y.e.id === x.e.id));
    picked.push(...shuffled(extra, seed).slice(0, n - picked.length));
  }
  const bp = p.conditions.includes("hypertension");
  const notes = [
    "Warm up for 3–5 minutes first, and cool down with easy stretching.",
    ...(bp ? ["Breathe out on the effort and never hold your breath."] : []),
    ...(p.conditions.includes("diabetes") ? ["If you take insulin or medicines that can cause lows, check your glucose first and carry fast-acting carbs."] : []),
    ...(area === "cardio" && picked.some((x) => x.e.category === "strength") ? ["Do the moves back to back as a circuit: 40 seconds each, 20 seconds rest, 2–3 rounds."] : []),
  ];
  return {
    area, minutes, notes,
    items: picked.map(({ e }) => ({ exercise: e, dose: dose(e, p.fitness_level, minutes, n, bp), why: exerciseFit(e, p).why })),
  };
}

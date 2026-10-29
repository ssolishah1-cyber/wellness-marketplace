import type { ConditionId, FitnessLevel, WorkoutPlace } from "@/lib/nutrition/types";

// Open-source exercise library: Free Exercise DB (public domain, Unlicense),
// imported by scripts/fetch-exercises.mjs into public/exercises.json at a
// pinned commit. Photos load from the same commit. Nothing about the user is
// ever sent anywhere: matching happens on the device.

export const EXERCISE_DB_COMMIT = "f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5";
export const EXERCISE_DB_CREDIT = { label: "Free Exercise DB (public domain)", url: "https://github.com/yuhonas/free-exercise-db" };

export interface DbExercise {
  id: string;
  name: string;
  level: "beginner" | "intermediate";
  category: "strength" | "stretching" | "cardio" | "plyometrics";
  equipment: string;
  force: "push" | "pull" | "static" | null;
  mechanic: "compound" | "isolation" | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  images: string[];
}

/** Photo URL on the jsDelivr CDN, with GitHub as the fallback (see ExercisePhoto). */
export const photoUrl = (path: string, fallback = false) => fallback
  ? `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${EXERCISE_DB_COMMIT}/exercises/${path}`
  : `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@${EXERCISE_DB_COMMIT}/exercises/${path}`;

export async function loadExerciseDb(): Promise<DbExercise[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}exercises.json`);
  if (!res.ok) throw new Error("Couldn't load the exercise library. Check your connection and try again.");
  return (await res.json()).exercises as DbExercise[];
}

export const MUSCLE_GROUPS: Record<string, string[]> = {
  Legs: ["quadriceps", "hamstrings", "calves", "adductors", "abductors"],
  Glutes: ["glutes"],
  Core: ["abdominals", "lower back"],
  Chest: ["chest"],
  Back: ["lats", "middle back", "traps", "lower back"],
  Shoulders: ["shoulders"],
  Arms: ["biceps", "triceps", "forearms"],
};

const HOME_EQUIPMENT = new Set(["body only", "none", "bands", "dumbbell", "kettlebells", "exercise ball", "medicine ball", "foam roll"]);

const LARGE_MUSCLES = new Set(["quadriceps", "glutes", "hamstrings", "chest", "lats", "middle back"]);

export interface Fit { ok: boolean; score: number; why: string[] }

/**
 * Whether an exercise suits this person, and how well. Safety rules exclude;
 * health-focus preferences rank.
 */
export function exerciseFit(e: DbExercise, p: { fitness_level: FitnessLevel; workout_place: WorkoutPlace; conditions: ConditionId[] }): Fit {
  const c = p.conditions;
  const why: string[] = [];
  if (p.workout_place === "home" && !HOME_EQUIPMENT.has(e.equipment)) return { ok: false, score: 0, why: ["Needs gym equipment"] };
  if (p.fitness_level === "beginner" && e.level !== "beginner") return { ok: false, score: 0, why: ["For intermediate level"] };
  if (e.category === "plyometrics" && (p.fitness_level === "beginner" || c.includes("hypertension") || c.includes("ibs"))) return { ok: false, score: 0, why: ["High-impact jumping"] };
  if (c.includes("hypertension") && e.force === "static" && e.category === "strength") return { ok: false, score: 0, why: ["Static hold that can raise blood pressure"] };

  // Big compound moves and cardio give the most benefit per minute.
  const bigMove = e.mechanic === "compound" && e.primaryMuscles.some((m) => LARGE_MUSCLES.has(m));
  let score = (e.level === "beginner" ? 1 : 0) + (bigMove ? 1 : 0);
  if (c.includes("diabetes") && (e.category === "cardio" || bigMove)) { score += 2; why.push(e.category === "cardio" ? "Steady cardio helps your body use blood sugar" : "Works large muscles that help use blood sugar"); }
  if (c.includes("hypertension") && (e.category === "cardio" || e.category === "stretching")) { score += 2; why.push("Moderate, steady effort suits blood pressure"); }
  if (c.includes("ibs") && (e.category === "stretching" || e.category === "cardio")) { score += 2; why.push("Gentle movement can ease digestion"); }
  if (c.includes("focus") && (e.category === "cardio" || bigMove)) { score += 2; why.push("Gets your heart rate up for an energy boost"); }
  if (c.includes("weight_loss") && (e.category === "cardio" || bigMove)) { score += 2; why.push("Burns more energy per minute"); }
  if (c.includes("heart_health") && e.category === "cardio") { score += 2; why.push("Regular cardio strengthens your heart"); }
  if (c.includes("relaxation") && e.category === "stretching") { score += 3; why.push("Slow stretching helps you unwind"); }
  return { ok: true, score, why };
}

/** Suitable exercises, best first. */
export function rankExercises(all: DbExercise[], p: Parameters<typeof exerciseFit>[1], filter: (e: DbExercise) => boolean = () => true) {
  return all
    .filter(filter)
    .map((e) => ({ e, fit: exerciseFit(e, p) }))
    .filter((x) => x.fit.ok)
    .sort((a, b) => b.fit.score - a.fit.score || a.e.name.localeCompare(b.e.name));
}

/** Same-muscle alternatives to an exercise in the weekly plan. */
export function alternativesFor(all: DbExercise[], muscles: string[], excludeId: string | undefined, p: Parameters<typeof exerciseFit>[1], n = 3) {
  return rankExercises(all, p, (e) => e.id !== excludeId && e.category !== "plyometrics" && e.primaryMuscles.some((m) => muscles.includes(m))).slice(0, n);
}

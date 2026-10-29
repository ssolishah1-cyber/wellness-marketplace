import { beforeEach, describe, expect, it } from "vitest";
import { CONDITIONS, MEAL_IDEAS, conditionInsight, mealIdeas, slotForHour } from "@/lib/nutrition/health";
import { suggestTargets } from "@/lib/nutrition/logic";
import { EXERCISES, weekdayOf, weeklyPlan } from "@/lib/fitness";
import { demoNutrition as n } from "@/lib/nutrition/demoNutrition";
import { setDemoPersona } from "@/lib/demoApi";
import type { FoodEntry } from "@/lib/nutrition/types";

const entry = (name: string, meal: FoodEntry["meal"], carbs = 0, kcal = 400, created_at = "2026-10-27T09:00:00"): FoodEntry =>
  ({ id: name, eaten_on: "2026-10-27", meal, name, kcal, protein_g: 20, carbs_g: carbs, fat_g: 10, created_at });
const ctx = (entries: FoodEntry[], hour = 12, water = 4) =>
  ({ entries, macros: { kcal: entries.reduce((a, e) => a + e.kcal, 0), protein_g: 0, carbs_g: entries.reduce((a, e) => a + e.carbs_g, 0), fat_g: 0 }, profile: { carbs_goal_g: 200, water_goal_glasses: 8 }, water, hour });

describe("meal ideas", () => {
  it("have calories that match their macros", () => {
    for (const m of MEAL_IDEAS) {
      const fromMacros = m.protein_g * 4 + m.carbs_g * 4 + m.fat_g * 9;
      expect(Math.abs(fromMacros - m.kcal) / m.kcal, m.name).toBeLessThan(0.08);
    }
  });
  it("respect every food preference", () => {
    const vegan = mealIdeas({ prefs: ["vegan"], conditions: [] });
    expect(vegan.length).toBeGreaterThan(5);
    expect(vegan.some((m) => /chicken|salmon|tuna|turkey|beef|egg|yogurt|cottage|fish/i.test(m.name))).toBe(false);
    const gfNut = mealIdeas({ prefs: ["gluten_free", "nut_free"], conditions: [] });
    expect(gfNut.some((m) => /toast|rye|vegetable wrap|almond|walnut|peanut/i.test(m.name))).toBe(false);
  });
  it("puts ideas for the user's conditions first", () => {
    const ideas = mealIdeas({ prefs: [], conditions: ["ibs"], meal: "lunch" });
    expect(ideas[0].goodFor).toContain("ibs");
  });
  it("covers every condition in every meal slot", () => {
    for (const c of CONDITIONS) expect(mealIdeas({ prefs: [], conditions: [], condition: c.id }).length, c.id).toBeGreaterThanOrEqual(4);
  });
  it("suggests the next meal for the time of day", () => {
    expect(slotForHour(8, new Set())).toBe("breakfast");
    expect(slotForHour(12, new Set(["breakfast"]))).toBe("lunch");
    expect(slotForHour(19, new Set(["breakfast", "lunch"]))).toBe("dinner");
    expect(slotForHour(19, new Set(["dinner"]))).toBe("snack");
  });
});

describe("condition insights", () => {
  it("flags one very high-carb meal for blood sugar", () => {
    expect(conditionInsight("diabetes", ctx([entry("Pasta", "lunch", 110)])).tone).toBe("tip");
    expect(conditionInsight("diabetes", ctx([entry("Bowl", "lunch", 45), entry("Eggs", "breakfast", 20)])).tone).toBe("good");
  });
  it("names salty foods for blood pressure", () => {
    expect(conditionInsight("hypertension", ctx([entry("Pizza (3 slices)", "dinner")])).text).toMatch(/Pizza/);
  });
  it("notes possible IBS triggers and long gaps", () => {
    expect(conditionInsight("ibs", ctx([entry("Hummus veggie wrap", "lunch")])).text).toMatch(/Hummus/);
    expect(conditionInsight("ibs", ctx([], 14)).text).toMatch(/gaps/);
  });
  it("catches late caffeine for sleep", () => {
    expect(conditionInsight("relaxation", ctx([entry("Iced latte", "snack", 20, 150, "2026-10-27T16:30:00")], 17)).text).toMatch(/Caffeine/);
  });
  it("praises a protein breakfast for focus", () => {
    expect(conditionInsight("focus", ctx([entry("Eggs", "breakfast")], 10)).tone).toBe("good");
  });
});

describe("workout plans", () => {
  const base = { fitness_level: "beginner" as const, workout_place: "home" as const, workout_days: 3, conditions: [] as never[], start_weight_kg: 90, goal_weight_kg: 80 };
  it("schedules the chosen number of days", () => {
    for (const d of [2, 3, 4, 5, 6]) expect(weeklyPlan({ ...base, workout_days: d }).filter((x) => x.session).length).toBe(d);
  });
  it("uses gym equipment only at the gym", () => {
    const home = weeklyPlan(base).flatMap((d) => d.session?.blocks ?? []);
    expect(home.every((b) => b.exercise.place === "any")).toBe(true);
    const gym = weeklyPlan({ ...base, workout_place: "gym" }).flatMap((d) => d.session?.blocks ?? []);
    expect(gym.some((b) => b.exercise.place === "gym")).toBe(true);
  });
  it("avoids breath-holding holds and intervals for blood pressure", () => {
    const plan = weeklyPlan({ ...base, fitness_level: "advanced", workout_days: 5, conditions: ["hypertension"] as never[] });
    const blocks = plan.flatMap((d) => d.session?.blocks ?? []);
    expect(blocks.some((b) => b.exercise.isometric)).toBe(false);
    expect(blocks.some((b) => b.exercise.id === "intervals")).toBe(false);
    expect(plan.find((d) => d.session)!.session!.notes.join(" ")).toMatch(/hold your breath/);
  });
  it("adds a calming session for stress & sleep", () => {
    const plan = weeklyPlan({ ...base, conditions: ["relaxation"] as never[] });
    expect(plan.some((d) => d.session?.kind === "mobility")).toBe(true);
  });
  it("adds cardio time for weight loss", () => {
    const lose = weeklyPlan(base).find((d) => d.session?.kind === "cardio")!.session!;
    const keep = weeklyPlan({ ...base, goal_weight_kg: 90 }).find((d) => d.session?.kind === "cardio")!.session!;
    expect(lose.minutes).toBeGreaterThan(keep.minutes);
  });
  it("has instructions for every exercise", () => {
    for (const e of Object.values(EXERCISES)) expect(e.how.length, e.id).toBeGreaterThanOrEqual(2);
  });
  it("maps dates to Monday-first weekdays", () => {
    expect(weekdayOf("2026-10-26")).toBe(0);
    expect(weekdayOf("2026-11-01")).toBe(6);
  });
});

describe("targets for a blood-sugar focus", () => {
  it("caps carbs at about 40% of calories", () => {
    const i = { sex: "male" as const, age: 35, heightCm: 180, weightKg: 80, activity: "active" as const, goal: "maintain" as const };
    const normal = suggestTargets(i);
    const lower = suggestTargets({ ...i, lowerCarb: true });
    expect(lower.kcal_goal).toBe(normal.kcal_goal);
    expect((lower.carbs_goal_g * 4) / lower.kcal_goal).toBeLessThanOrEqual(0.41);
    expect(lower.carbs_goal_g).toBeLessThan(normal.carbs_goal_g);
    const total = lower.protein_goal_g * 4 + lower.carbs_goal_g * 4 + lower.fat_goal_g * 9;
    expect(Math.abs(total - lower.kcal_goal)).toBeLessThan(15);
  });
});

describe("health data in demo mode", () => {
  beforeEach(() => setDemoPersona("vendor"));
  it("refuses conditions without consent, and logs workouts privately", async () => {
    await expect(n.updateProfile({ conditions: ["ibs"], health_consent_at: null })).rejects.toThrow(/agree/);
    const p = await n.updateProfile({ conditions: ["ibs"], health_consent_at: new Date().toISOString() });
    expect(p.conditions).toEqual(["ibs"]);
    await n.setWorkoutDone("2026-10-27", "cardio", 30);
    expect(await n.listWorkouts("2026-10-27", "2026-10-27")).toEqual([{ done_on: "2026-10-27", session_id: "cardio", minutes: 30 }]);
    setDemoPersona("admin");
    expect(await n.listWorkouts("2026-10-27", "2026-10-27")).toEqual([]);
    setDemoPersona("vendor");
    await n.setWorkoutDone("2026-10-27", "cardio", null);
    expect(await n.listWorkouts("2026-10-27", "2026-10-27")).toEqual([]);
  });
});

describe("open exercise library matching", async () => {
  const { readFileSync } = await import("fs");
  const { exerciseFit, rankExercises, alternativesFor } = await import("@/lib/exerciseDb");
  const db = JSON.parse(readFileSync("public/exercises.json", "utf8")).exercises;
  const beginnerHome = { fitness_level: "beginner" as const, workout_place: "home" as const, conditions: [] as never[] };
  it("has the imported dataset with photos", () => {
    expect(db.length).toBeGreaterThan(600);
    expect(db.every((e: { images: string[] }) => e.images.length > 0)).toBe(true);
  });
  it("keeps beginners at home on beginner, home-equipment moves", () => {
    const r = rankExercises(db, beginnerHome);
    expect(r.length).toBeGreaterThan(100);
    expect(r.every(({ e }) => e.level === "beginner" && !["machine", "cable", "barbell"].includes(e.equipment))).toBe(true);
  });
  it("drops static holds and jumping for blood pressure", () => {
    const p = { fitness_level: "advanced" as const, workout_place: "gym" as const, conditions: ["hypertension"] as never[] };
    const r = rankExercises(db, p);
    expect(r.some(({ e }) => e.category === "plyometrics" || (e.force === "static" && e.category === "strength"))).toBe(false);
    expect(exerciseFit(db.find((e: { id: string }) => e.id === "Plank"), p).ok).toBe(false);
  });
  it("puts stretching first for stress & sleep", () => {
    const r = rankExercises(db, { ...beginnerHome, conditions: ["relaxation"] as never[] });
    expect(r.slice(0, 10).every(({ e }) => e.category === "stretching")).toBe(true);
  });
  it("finds same-muscle swaps for plan exercises", () => {
    const alts = alternativesFor(db, ["chest", "triceps"], "Pushups", beginnerHome);
    expect(alts.length).toBe(3);
    expect(alts.every(({ e }) => e.id !== "Pushups" && e.primaryMuscles.some((m: string) => ["chest", "triceps"].includes(m)))).toBe(true);
  });
  it("links every plan exercise photo to a real dataset entry", async () => {
    const { EXERCISES } = await import("@/lib/fitness");
    const ids = new Set(db.map((e: { id: string }) => e.id));
    for (const e of Object.values(EXERCISES)) if (e.dbId) expect(ids.has(e.dbId), e.id).toBe(true);
  });
});

describe("admin panel (demo)", () => {
  it("is admin-only, protects your own admin role, and logs role changes", async () => {
    const { admin } = await import("@/lib/admin");
    setDemoPersona("member");
    await expect(admin.stats()).rejects.toThrow(/Admins only/);
    await expect(admin.listUsers("")).rejects.toThrow(/Admins only/);
    setDemoPersona("admin");
    const s = await admin.stats();
    expect(s.total_users).toBeGreaterThan(3);
    expect(s.signups_by_day).toHaveLength(30);
    const users = await admin.listUsers("jamie");
    expect(users).toHaveLength(1);
    expect(Object.keys(users[0])).not.toContain("conditions");
    await admin.setRole(users[0].user_id, "reviewer", true);
    expect((await admin.listUsers("jamie"))[0].roles).toEqual(["reviewer"]);
    await expect(admin.setRole("user-admin", "admin", false)).rejects.toThrow(/own admin/);
    expect((await admin.auditLog())[0]).toMatchObject({ action: "grant_role", details: { role: "reviewer" } });
  });
});

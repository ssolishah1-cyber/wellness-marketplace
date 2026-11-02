import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { AREAS, buildQuickWorkout, recommendedAreas } from "@/lib/quickWorkout";

const db = JSON.parse(readFileSync("public/exercises.json", "utf8")).exercises;
const beginnerHome = { fitness_level: "beginner" as const, workout_place: "home" as const, conditions: [] as never[] };

describe("build a workout", () => {
  it("gives 4, 6 or 8 exercises for 10, 20 or 30 minutes in every area", () => {
    for (const a of AREAS) for (const [min, n] of [[10, 4], [20, 6], [30, 8]] as const) {
      const w = buildQuickWorkout(db, { ...beginnerHome, workout_place: "gym" }, a.id, min, 3);
      expect(w.items.length, `${a.id} ${min}`).toBe(n);
      expect(new Set(w.items.map((i) => i.exercise.id)).size).toBe(n);
    }
  });
  it("targets the chosen area", () => {
    const abs = buildQuickWorkout(db, beginnerHome, "abs", 20, 5);
    expect(abs.items.every((i) => i.exercise.primaryMuscles.includes("abdominals"))).toBe(true);
    const stretch = buildQuickWorkout(db, beginnerHome, "stretch", 10, 5);
    expect(stretch.items.every((i) => i.exercise.category === "stretching")).toBe(true);
  });
  it("respects home equipment, level and blood pressure", () => {
    const w = buildQuickWorkout(db, { ...beginnerHome, conditions: ["hypertension"] as never[] }, "full", 30, 9);
    expect(w.items.every((i) => i.exercise.level === "beginner" && !["machine", "cable", "barbell"].includes(i.exercise.equipment))).toBe(true);
    expect(w.items.some((i) => i.exercise.force === "static" && i.exercise.category === "strength")).toBe(false);
    expect(w.notes.join(" ")).toMatch(/hold your breath/);
  });
  it("shuffles to a different mix and repeats with the same seed", () => {
    const a = buildQuickWorkout(db, beginnerHome, "legs", 20, 1).items.map((i) => i.exercise.id);
    const b = buildQuickWorkout(db, beginnerHome, "legs", 20, 1).items.map((i) => i.exercise.id);
    const c = buildQuickWorkout(db, beginnerHome, "legs", 20, 7920).items.map((i) => i.exercise.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
  it("suggests areas for each health focus", () => {
    expect(recommendedAreas(["relaxation"])).toEqual(["stretch"]);
    expect(recommendedAreas(["weight_loss", "heart_health"])).toContain("cardio");
  });
});

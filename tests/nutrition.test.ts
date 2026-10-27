import { beforeEach, describe, expect, it } from "vitest";
import { addDays, coachTip, loggingStreak, sumMacros, totalsByDay, weekOf } from "@/lib/nutrition/logic";
import { demoNutrition as n } from "@/lib/nutrition/demoNutrition";
import { setDemoPersona } from "@/lib/demoApi";
import type { FoodEntry } from "@/lib/nutrition/types";

const goals = { kcal_goal: 2100, protein_goal_g: 140 };
const entry = (day: string, kcal: number, p = 0): FoodEntry =>
  ({ id: Math.random().toString(), eaten_on: day, meal: "lunch", name: "x", kcal, protein_g: p, carbs_g: 0, fat_g: 0, created_at: "" });

describe("dates", () => {
  it("adds days across month boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("builds a Monday-first week", () => {
    expect(weekOf("2026-10-28")).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"]);
    expect(weekOf("2026-11-01")[0]).toBe("2026-10-26"); // Sunday belongs to the week that started Monday
  });
});

describe("totals", () => {
  it("sums macros, treating numeric strings from Postgres as numbers", () => {
    const m = sumMacros([{ kcal: 100, protein_g: "10.5" as unknown as number, carbs_g: 2, fat_g: 1 }, { kcal: 50, protein_g: 4, carbs_g: 3, fat_g: 0 }]);
    expect(m).toEqual({ kcal: 150, protein_g: 14.5, carbs_g: 5, fat_g: 1 });
  });
  it("fills empty days with zero", () => {
    const t = totalsByDay([entry("2026-10-26", 500)], "2026-10-25", "2026-10-27");
    expect(t.map((d) => d.kcal)).toEqual([0, 500, 0]);
  });
  it("counts the logging streak, allowing today to be empty", () => {
    const days = totalsByDay([entry("2026-10-24", 1), entry("2026-10-25", 1), entry("2026-10-22", 1)], "2026-10-20", "2026-10-26");
    expect(loggingStreak(days, "2026-10-26")).toBe(2);
    expect(loggingStreak(days, "2026-10-28")).toBe(0);
  });
});

describe("coach", () => {
  it("suggests protein at dinner time when short", () => {
    const tip = coachTip({ kcal: 1220, protein_g: 79, carbs_g: 0, fat_g: 0 }, goals, new Set(["breakfast", "lunch", "snack"]), 19);
    expect(tip.action).toBe("add_dinner");
    expect(tip.text).toContain("61 g short on protein");
  });
  it("does not suggest dinner again once dinner is logged", () => {
    const tip = coachTip({ kcal: 1740, protein_g: 113, carbs_g: 0, fat_g: 0 }, goals, new Set(["breakfast", "lunch", "dinner"]), 20);
    expect(tip.action).toBe("add_snack");
    expect(tip.text).not.toMatch(/dinner/i);
  });
  it("is kind when over the goal", () => {
    const tip = coachTip({ kcal: 2600, protein_g: 150, carbs_g: 0, fat_g: 0 }, goals, new Set(["dinner"]), 21);
    expect(tip.text).toMatch(/over today's goal/);
  });
  it("never mentions marketplace partners", () => {
    for (const h of [8, 13, 19]) for (const kcal of [0, 900, 2500]) {
      const t = coachTip({ kcal, protein_g: kcal / 20, carbs_g: 0, fat_g: 0 }, goals, new Set(kcal ? ["lunch"] : []), h);
      expect(t.text).not.toMatch(/TriggerMD|XIMMD|market|sponsor/i);
    }
  });
});

describe("demo store privacy", () => {
  beforeEach(() => setDemoPersona("member"));
  it("keeps each user's log separate", async () => {
    await n.addFood({ eaten_on: "2026-10-26", meal: "dinner", name: "Member-only soup", kcal: 300, protein_g: 10, carbs_g: 30, fat_g: 5 });
    setDemoPersona("vendor");
    expect((await n.listFood("2026-10-26")).some((f) => f.name === "Member-only soup")).toBe(false);
  });
  it("signed-out visitors have no profile and can't write", async () => {
    setDemoPersona("visitor");
    expect(await n.getProfile()).toBeNull();
    await expect(n.setWater("2026-10-26", 3)).rejects.toThrow(/sign in/);
  });
  it("validates weight range", async () => {
    await expect(n.logWeight("2026-10-26", 5)).rejects.toThrow();
    expect((await n.logWeight("2026-10-26", 80.46)).weight_kg).toBe(80.5);
  });
});

import { suggestTargets } from "@/lib/nutrition/logic";
describe("goal suggestions", () => {
  const base = { sex: "female" as const, age: 35, heightCm: 165, weightKg: 75, activity: "light" as const };
  it("sets a deficit for weight loss and adds up", () => {
    const lose = suggestTargets({ ...base, goal: "lose" });
    const keep = suggestTargets({ ...base, goal: "maintain" });
    expect(keep.kcal_goal - lose.kcal_goal).toBeGreaterThanOrEqual(490);
    const fromMacros = lose.protein_goal_g * 4 + lose.carbs_goal_g * 4 + lose.fat_goal_g * 9;
    expect(Math.abs(fromMacros - lose.kcal_goal)).toBeLessThan(15);
    expect(lose.kcal_goal % 10).toBe(0);
  });
  it("never suggests below a safe floor", () => {
    const t = suggestTargets({ sex: "female", age: 70, heightCm: 150, weightKg: 45, activity: "sedentary", goal: "lose" });
    expect(t.kcal_goal).toBeGreaterThanOrEqual(1200);
    const m = suggestTargets({ sex: "male", age: 70, heightCm: 155, weightKg: 50, activity: "sedentary", goal: "lose" });
    expect(m.kcal_goal).toBeGreaterThanOrEqual(1500);
  });
  it("keeps water within 6–14 glasses", () => {
    expect(suggestTargets({ ...base, weightKg: 40, goal: "maintain" }).water_goal_glasses).toBe(6);
    expect(suggestTargets({ ...base, weightKg: 200, goal: "maintain" }).water_goal_glasses).toBe(14);
  });
});

describe("account data (demo store)", () => {
  it("exports the signed-in user's data and deletes the account", async () => {
    setDemoPersona("member");
    const data = await n.exportData();
    expect(data).toHaveProperty("food_log");
    expect(data).toHaveProperty("weight");
    await n.deleteAccount();
    expect(await n.getProfile()).toBeNull(); // signed out
  });
});

import { cmToFtIn, fromDisplayWeight, ftInToCm, toDisplayWeight } from "@/lib/units";
describe("units", () => {
  it("converts weight both ways without drift", () => {
    expect(toDisplayWeight(81.7, "imperial")).toBe(180.1);
    expect(fromDisplayWeight(180.1, "imperial")).toBe(81.7);
    expect(toDisplayWeight(81.7, "metric")).toBe(81.7);
    for (const kg of [45.3, 60, 81.7, 120.4]) expect(fromDisplayWeight(toDisplayWeight(kg, "imperial"), "imperial")).toBeCloseTo(kg, 1);
  });
  it("converts height", () => {
    expect(ftInToCm(5, 6)).toBe(168);
    expect(cmToFtIn(168)).toEqual({ ft: 5, in: 6 });
  });
});

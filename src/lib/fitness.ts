import type { ConditionId, FitnessLevel, Profile, WorkoutPlace } from "@/lib/nutrition/types";

// Tailored weekly workout plans, built on the device from the user's level,
// place, days per week, weight goal and health focus. The plan follows
// standard beginner-to-advanced programming (ACSM / CDC activity guidelines:
// 150 min moderate activity and 2+ strength days a week). Each exercise links
// to the open Free Exercise DB (src/lib/exerciseDb.ts) for photos and
// same-muscle alternatives. It is general fitness guidance, not therapy.

export interface Exercise {
  id: string;
  name: string;
  place: "any" | "gym";
  target: string;
  how: string[];
  easier?: string;
  /** Static holds raise blood pressure; swapped out for the blood-pressure focus. */
  isometric?: boolean;
  timed?: boolean;
  /** Matching entry in the open Free Exercise DB, for photos. */
  dbId?: string;
  /** Free Exercise DB muscle names, used to suggest alternatives. */
  muscles?: string[];
}

export const EXERCISES: Record<string, Exercise> = Object.fromEntries(([
  { id: "squat", dbId: "Bodyweight_Squat", muscles: ["quadriceps", "glutes"], name: "Bodyweight squat", place: "any", target: "Legs & glutes", how: ["Feet shoulder-width apart, toes slightly out", "Sit hips back and down as if onto a chair", "Keep your chest up and knees over toes", "Push through your heels to stand"], easier: "Squat down to a chair and stand back up" },
  { id: "pushup", dbId: "Pushups", muscles: ["chest", "triceps", "shoulders"], name: "Push-up", place: "any", target: "Chest, shoulders & arms", how: ["Hands a little wider than shoulders", "Body in one straight line from head to heels", "Lower your chest toward the floor", "Press back up, breathing out"], easier: "Hands on a kitchen counter or wall" },
  { id: "backpack-row", dbId: "Bent_Over_Two-Dumbbell_Row", muscles: ["middle back", "lats"], name: "Backpack row", place: "any", target: "Upper back & arms", how: ["Fill a backpack with books and hold it by the top handle or straps", "Hinge forward at the hips with a flat back", "Pull the bag toward your lower ribs", "Lower it slowly"], easier: "Use a lighter bag" },
  { id: "glute-bridge", dbId: "Butt_Lift_Bridge", muscles: ["glutes", "hamstrings"], name: "Glute bridge", place: "any", target: "Glutes & lower back", how: ["Lie on your back, knees bent, feet flat", "Squeeze your glutes and lift your hips", "Pause at the top, ribs down", "Lower slowly"] },
  { id: "plank", dbId: "Plank", muscles: ["abdominals"], name: "Plank", place: "any", target: "Core", how: ["Forearms under shoulders", "Body straight from head to heels", "Breathe steadily; don't hold your breath"], easier: "Knees on the floor", isometric: true, timed: true },
  { id: "dead-bug", dbId: "Dead_Bug", muscles: ["abdominals"], name: "Dead bug", place: "any", target: "Core", how: ["Lie on your back, arms up, knees bent at 90°", "Slowly lower the opposite arm and leg", "Keep your lower back pressed to the floor", "Alternate sides, breathing out as you reach"] },
  { id: "reverse-lunge", dbId: "Split_Squats", muscles: ["quadriceps", "glutes"], name: "Reverse lunge", place: "any", target: "Legs & glutes", how: ["Stand tall, step one foot back", "Lower until both knees are about 90°", "Push through the front heel to return", "Alternate legs"], easier: "Hold a chair for balance" },
  { id: "step-up", dbId: "Step-up_with_Knee_Raise", muscles: ["quadriceps", "glutes"], name: "Step-up", place: "any", target: "Legs & glutes", how: ["Use a sturdy step or bottom stair", "Step up with one foot, pressing through the heel", "Stand tall at the top", "Step down slowly and switch legs"] },
  { id: "bird-dog", muscles: ["lower back", "abdominals"], name: "Bird dog", place: "any", target: "Core & back", how: ["On hands and knees", "Reach one arm forward and the opposite leg back", "Keep hips level", "Return and switch sides"] },
  { id: "goblet-squat", dbId: "Goblet_Squat", muscles: ["quadriceps", "glutes"], name: "Goblet squat", place: "gym", target: "Legs & glutes", how: ["Hold a dumbbell at your chest", "Squat down between your knees, chest up", "Drive up through your heels"] },
  { id: "db-bench", dbId: "Dumbbell_Bench_Press", muscles: ["chest", "triceps"], name: "Dumbbell bench press", place: "gym", target: "Chest, shoulders & arms", how: ["Lie on a bench, dumbbells over your chest", "Lower them to the sides of your chest", "Press up, breathing out"] },
  { id: "lat-pulldown", dbId: "Wide-Grip_Lat_Pulldown", muscles: ["lats", "middle back"], name: "Lat pulldown", place: "gym", target: "Back & arms", how: ["Grip the bar just wider than shoulders", "Pull it to your upper chest, elbows down", "Return slowly"] },
  { id: "rdl", dbId: "Stiff-Legged_Dumbbell_Deadlift", muscles: ["hamstrings", "glutes"], name: "Dumbbell Romanian deadlift", place: "gym", target: "Hamstrings, glutes & back", how: ["Hold dumbbells in front of your thighs", "Push hips back with a flat back and soft knees", "Lower to mid-shin, then stand by squeezing your glutes"] },
  { id: "leg-press", dbId: "Leg_Press", muscles: ["quadriceps", "glutes"], name: "Leg press", place: "gym", target: "Legs & glutes", how: ["Feet hip-width on the platform", "Lower until knees reach about 90°", "Press away without locking your knees"] },
  { id: "cable-row", dbId: "Seated_Cable_Rows", muscles: ["middle back", "lats"], name: "Seated cable row", place: "gym", target: "Upper back & arms", how: ["Sit tall, slight knee bend", "Pull the handle to your stomach, shoulders back", "Return with control"] },
  { id: "db-press", dbId: "Dumbbell_Shoulder_Press", muscles: ["shoulders", "triceps"], name: "Dumbbell shoulder press", place: "gym", target: "Shoulders & arms", how: ["Sit or stand tall, dumbbells at shoulder height", "Press overhead, breathing out", "Lower with control"] },
  { id: "brisk-walk", dbId: "Walking_Treadmill", name: "Brisk walk", place: "any", target: "Heart & lungs", how: ["Walk at a pace where you can talk but not sing", "Swing your arms naturally", "Outdoors, on a treadmill, or march in place"], timed: true },
  { id: "intervals", dbId: "Jogging_Treadmill", name: "Walk–jog intervals", place: "any", target: "Heart & lungs", how: ["1 minute faster (jog, fast walk or bike)", "2 minutes easy", "Repeat"], timed: true },
  { id: "cat-cow", dbId: "Cat_Stretch", name: "Cat–cow", place: "any", target: "Spine mobility", how: ["On hands and knees", "Breathe in, drop your belly and lift your chest", "Breathe out, round your back", "Move slowly with your breath"], timed: true },
  { id: "hip-flexor", dbId: "Kneeling_Hip_Flexor", name: "Hip flexor stretch", place: "any", target: "Hips", how: ["Kneel on one knee, the other foot forward", "Tuck your hips under and lean gently forward", "Hold, breathing slowly, then switch"], timed: true },
  { id: "hamstring-stretch", dbId: "Seated_Floor_Hamstring_Stretch", name: "Hamstring stretch", place: "any", target: "Back of legs", how: ["Sit with one leg straight", "Hinge forward from the hips with a long back", "Hold, then switch"], timed: true },
  { id: "open-book", name: "Open-book rotation", place: "any", target: "Upper back", how: ["Lie on your side, knees bent, arms forward", "Open the top arm across to the other side", "Follow your hand with your eyes; return slowly"] },
  { id: "childs-pose", dbId: "Childs_Pose", name: "Child's pose", place: "any", target: "Back & hips", how: ["Kneel, sit back on your heels", "Walk your hands forward and rest your forehead down", "Breathe slowly into your back"], timed: true },
  { id: "box-breathing", name: "Box breathing", place: "any", target: "Calm", how: ["Breathe in for 4", "Hold gently for 4 (skip the holds if you have high blood pressure)", "Breathe out for 4", "Pause for 4, then repeat"], timed: true },
] as Exercise[]).map((e) => [e.id, e]));

export type SessionKind = "strength" | "cardio" | "mobility";
export interface Block { exercise: Exercise; dose: string }
export interface Session {
  id: string;
  title: string;
  kind: SessionKind;
  minutes: number;
  warmup: string;
  blocks: Block[];
  cooldown: string;
  notes: string[];
}
export interface PlanDay { weekday: number; session: Session | null }

export const LEVEL_LABEL: Record<FitnessLevel, string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };
export const PLACE_LABEL: Record<WorkoutPlace, string> = { home: "At home", gym: "At the gym" };

// Monday = 0. Spread sessions so strength days never fall back-to-back where avoidable.
const DAY_SLOTS: Record<number, number[]> = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 5], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5] };
const ORDER: Record<number, string[]> = {
  2: ["strength-a", "strength-b"],
  3: ["strength-a", "cardio", "strength-b"],
  4: ["strength-a", "cardio", "strength-b", "mobility"],
  5: ["strength-a", "cardio", "strength-b", "cardio", "mobility"],
  6: ["strength-a", "cardio", "strength-b", "cardio", "strength-a", "mobility"],
};

type PlanProfile = Pick<Profile, "fitness_level" | "workout_place" | "workout_days" | "conditions" | "start_weight_kg" | "goal_weight_kg">;

export function weightGoal(p: Pick<Profile, "start_weight_kg" | "goal_weight_kg">): "lose" | "maintain" | "gain" {
  if (p.start_weight_kg == null || p.goal_weight_kg == null) return "maintain";
  if (p.goal_weight_kg < p.start_weight_kg - 0.5) return "lose";
  if (p.goal_weight_kg > p.start_weight_kg + 0.5) return "gain";
  return "maintain";
}

function conditionNotes(c: ConditionId[], kind: SessionKind): string[] {
  const n: string[] = [];
  if (c.includes("hypertension")) n.push("Breathe out on the effort and never hold your breath. Keep it moderate: you should be able to talk.");
  if (c.includes("diabetes")) n.push(kind === "cardio"
    ? "Great after a meal: 10–15 minutes of walking after eating helps blood sugar. If you take insulin or medicines that can cause lows, check your glucose first and carry fast-acting carbs."
    : "If you take insulin or medicines that can cause lows, check your glucose before exercise and carry fast-acting carbs.");
  if (c.includes("ibs")) n.push("Leave 1–2 hours after a large meal. Gentle movement like walking and yoga often eases symptoms.");
  if (c.includes("focus") && kind !== "mobility") n.push("Short on time? Even the first 10 minutes give a boost to focus and energy.");
  if (c.includes("weight_loss") && kind === "cardio") n.push("Consistency beats intensity: every session counts toward 150+ minutes a week.");
  if (c.includes("heart_health")) n.push("Build up gradually. Stop and get help if you feel chest pain, unusual breathlessness or dizziness.");
  if (c.includes("relaxation") && kind === "mobility") n.push("Move slowly and match each movement to your breath. Ideal in the evening.");
  return n;
}

export function buildSession(id: string, p: PlanProfile): Session {
  const lvl = p.fitness_level;
  const c = p.conditions;
  const bp = c.includes("hypertension");
  const goal = weightGoal(p);
  const sets = { beginner: 2, intermediate: 3, advanced: 4 }[lvl] + (goal === "gain" && lvl !== "beginner" ? 1 : 0);
  const reps = bp ? "12–15" : { beginner: "10", intermediate: "10–12", advanced: "8–12" }[lvl];
  const hold = { beginner: "20 s", intermediate: "30 s", advanced: "45 s" }[lvl];
  const dose = (e: Exercise) => (e.timed ? `${sets} × ${hold}` : `${sets} × ${reps}${["reverse-lunge", "step-up", "bird-dog", "dead-bug"].includes(e.id) ? " each side" : ""}`);
  const pick = (ids: string[]) => ids.map((i) => EXERCISES[bp && EXERCISES[i].isometric ? "dead-bug" : i]).map((exercise) => ({ exercise, dose: dose(exercise) }));

  if (id === "strength-a" || id === "strength-b") {
    const gym = p.workout_place === "gym";
    const ids = id === "strength-a"
      ? gym ? ["goblet-squat", "db-bench", "lat-pulldown", "rdl", "plank"] : ["squat", "pushup", "backpack-row", "glute-bridge", "plank"]
      : gym ? ["leg-press", "cable-row", "db-press", "reverse-lunge", "bird-dog"] : ["reverse-lunge", "pushup", "backpack-row", "step-up", "bird-dog"];
    return {
      id, kind: "strength", title: id === "strength-a" ? "Full-body strength A" : "Full-body strength B",
      minutes: 15 + sets * 6,
      warmup: "5 minutes: march in place, arm circles and 10 slow squats",
      blocks: pick(ids),
      cooldown: "3 minutes of easy stretching for legs, chest and back",
      notes: [`Rest ${lvl === "advanced" ? "60–90" : "45–60"} s between sets. Stop if you feel pain, dizziness or chest discomfort.`, ...conditionNotes(c, "strength")],
    };
  }
  if (id === "cardio") {
    const base = { beginner: 20, intermediate: 30, advanced: 40 }[lvl] + (goal === "lose" ? 10 : 0);
    const useIntervals = lvl !== "beginner" && !bp;
    const main = EXERCISES[useIntervals ? "intervals" : "brisk-walk"];
    return {
      id, kind: "cardio", title: useIntervals ? "Cardio intervals" : "Brisk cardio",
      minutes: base + 5,
      warmup: "3 minutes of easy walking",
      blocks: [{ exercise: main, dose: `${base} min` }],
      cooldown: "2 minutes of slow walking, then calf and hip stretches",
      notes: conditionNotes(c, "cardio"),
    };
  }
  const relax = c.includes("relaxation");
  const blocks = ["cat-cow", "hip-flexor", "hamstring-stretch", "open-book", "childs-pose", "box-breathing"].map((i) => {
    const e = EXERCISES[i];
    return { exercise: e, dose: i === "box-breathing" ? (relax ? "5 min" : "2 min") : e.timed ? "45 s each" : "8 each side" };
  });
  return {
    id, kind: "mobility", title: relax ? "Stretch & unwind" : "Mobility & recovery",
    minutes: relax ? 20 : 15,
    warmup: "Find a quiet spot and a mat or carpet",
    blocks,
    cooldown: "Finish lying down for 1 minute, breathing slowly",
    notes: conditionNotes(c, "mobility"),
  };
}

/** Monday-first 7-day plan. */
export function weeklyPlan(p: PlanProfile): PlanDay[] {
  const days = Math.min(6, Math.max(2, p.workout_days));
  const slots = DAY_SLOTS[days];
  const order = [...ORDER[days]];
  // Few training days and a relaxation focus: swap the second strength day for mobility.
  if (days <= 3 && p.conditions.includes("relaxation")) order[order.lastIndexOf("strength-b")] = "mobility";
  return Array.from({ length: 7 }, (_, weekday) => {
    const i = slots.indexOf(weekday);
    return { weekday, session: i === -1 ? null : buildSession(order[i], p) };
  });
}

/** Weekday index (Monday = 0) for a YYYY-MM-DD day. */
export function weekdayOf(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
}

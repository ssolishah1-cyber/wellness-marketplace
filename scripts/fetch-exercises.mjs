// Imports the open-source Free Exercise DB (public domain, Unlicense)
// https://github.com/yuhonas/free-exercise-db at a pinned commit, keeps the
// exercises suitable for a general wellness app, and writes
// public/exercises.json. Photos load from the same pinned commit.
//   node scripts/fetch-exercises.mjs
import { writeFileSync } from "fs";

const COMMIT = "f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5";
const URL = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${COMMIT}/dist/exercises.json`;
// Competitive lifting and expert moves are out of scope for this app.
const SKIP_CATEGORIES = new Set(["olympic weightlifting", "strongman", "powerlifting"]);

const res = await fetch(URL);
if (!res.ok) throw new Error(`Download failed: ${res.status}`);
const all = await res.json();
const kept = all
  .filter((x) => x.level !== "expert" && !SKIP_CATEGORIES.has(x.category) && x.images?.length)
  .map((x) => ({
    id: x.id, name: x.name, level: x.level, category: x.category, equipment: x.equipment ?? "none",
    force: x.force ?? null, mechanic: x.mechanic ?? null,
    primaryMuscles: x.primaryMuscles, secondaryMuscles: x.secondaryMuscles,
    instructions: x.instructions, images: x.images,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

writeFileSync("public/exercises.json", JSON.stringify({ source: "free-exercise-db", commit: COMMIT, license: "Unlicense (public domain)", exercises: kept }));
console.log(`Wrote ${kept.length} of ${all.length} exercises to public/exercises.json`);

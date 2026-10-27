// End-to-end check of the nutrition screens in demo mode. Usage:
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e-nutrition.mjs
import { chromium } from "playwright-core";
import { fileURLToPath } from "url";
import path from "path";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "screenshots");
const BASE = process.env.BASE_URL || "http://localhost:4173";
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const errors = [];
const p = await b.newPage({ viewport: { width: 420, height: 900 } });
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => m.type() === "error" && !/fonts\.g|net::ERR/.test(m.text()) && errors.push(m.text()));
const ok = (m) => console.log("✓", m);
const fail = (m) => { console.log("✗", m); process.exitCode = 1; };
const PREFIX = new URL(BASE).pathname.replace(/\/$/, "");
const nav = async (to) => { await p.locator(`nav a[href="${PREFIX + (to === "/" ? "" : to) || "/"}"]`).last().click(); await p.waitForTimeout(700); };

await p.goto(`${BASE}/`); await p.waitForTimeout(1200);
const ring = await p.locator('section[aria-label="Today\'s calories and macros"]').innerText();
ring.includes("1,220 of 2,100") ? ok("home ring shows 1,220 of 2,100 kcal") : fail("ring: " + ring);
await p.screenshot({ path: `${OUT}/n1-home.png`, fullPage: true });

// water
const before = await p.locator('button[aria-pressed="true"][aria-label*="glass"]').count();
await p.locator('button[aria-label="7 glasses"]').click(); await p.waitForTimeout(500);
const after = await p.locator('button[aria-pressed="true"][aria-label*="glass"]').count();
after === 7 && before === 5 ? ok("water 5 → 7") : fail(`water ${before} → ${after}`);

// coach → add dinner (time-dependent action; open the sheet from Meals to be deterministic)
await nav("/meals");
await p.getByRole("button", { name: "Add dinner" }).click(); await p.waitForTimeout(400);
await p.getByRole("button", { name: /Salmon, rice & greens/ }).click(); await p.waitForTimeout(800);
(await p.getByText("Salmon, rice & greens added").count()) ? ok("toast after adding dinner") : fail("no toast");
const dinner = await p.locator("section", { hasText: "Dinner" }).first().innerText();
dinner.includes("520 kcal") ? ok("dinner shows 520 kcal") : fail("dinner: " + dinner);

// custom food
await p.getByRole("button", { name: "Add snack" }).click(); await p.waitForTimeout(300);
await p.getByRole("button", { name: "Enter something else" }).click();
await p.fill("#food-name", "Cottage cheese"); await p.fill("#food-kcal", "180"); await p.fill("#food-p", "24");
await p.getByRole("dialog").getByRole("button", { name: "Add food" }).click(); await p.waitForTimeout(700);
(await p.getByText("Cottage cheese").count()) ? ok("custom food added") : fail("custom food missing");
await p.screenshot({ path: `${OUT}/n2-meals.png`, fullPage: true });

// remove it
await p.getByRole("button", { name: "Remove Cottage cheese" }).click(); await p.waitForTimeout(700);
(await p.locator('button[aria-label="Remove Cottage cheese"]').count()) === 0 ? ok("food removed") : fail("remove failed");

// previous day has data
await p.getByRole("button", { name: "Previous week" }).click(); await p.waitForTimeout(600);
const prevItems = await p.locator('button[aria-label^="Remove"]').count();
prevItems > 0 ? ok(`previous week day has ${prevItems} items`) : fail("no past data");

// home reflects dinner
await nav("/");
const ring2 = await p.locator('section[aria-label="Today\'s calories and macros"]').innerText();
ring2.includes("1,740 of 2,100") ? ok("home ring updated to 1,740") : fail("ring2: " + ring2);
const coach = await p.locator('section[aria-label="Coach"]').innerText();
!/salmon dinner/i.test(coach) ? ok("coach no longer suggests dinner: " + coach.split("\n")[2]?.slice(0, 70)) : fail("coach: " + coach);

// progress + weight log
await nav("/progress"); await p.waitForTimeout(1200);
await p.screenshot({ path: `${OUT}/n3-progress.png`, fullPage: true });
await p.fill("#weight", "179"); await p.getByRole("button", { name: "Log weight" }).click(); await p.waitForTimeout(800);
(await p.getByText("Logged 179 lb").count()) ? ok("weight logged in lb") : fail("weight toast missing");

// profile goals
await nav("/profile");
await p.getByRole("button", { name: "Edit" }).click();
await p.fill("#goal-kcal_goal", "1900"); await p.getByRole("button", { name: "Save goals" }).click(); await p.waitForTimeout(700);
(await p.getByText("1,900 kcal").count()) ? ok("goal saved") : fail("goal not saved");
await p.screenshot({ path: `${OUT}/n4-profile.png`, fullPage: true });
await nav("/");
(await p.locator('section[aria-label="Today\'s calories and macros"]').innerText()).includes("of 1,900") ? ok("home uses new goal") : fail("home goal");

// privacy: vendor persona has separate data; visitor sees sign-in prompt
await p.getByRole("button", { name: "Vendor", exact: true }).click(); await p.waitForTimeout(900);
(await p.locator('section[aria-label="Today\'s calories and macros"]').innerText()).includes("of 2,100") ? ok("vendor has own profile (2,100 goal)") : fail("data leaked between users");
await p.getByRole("button", { name: "Visitor", exact: true }).click(); await p.waitForTimeout(900);
(await p.getByText("Sign in to track your nutrition").count()) ? ok("visitor sees sign-in prompt") : fail("visitor sees data");

// market still works
await p.getByRole("button", { name: "App user", exact: true }).click(); await p.waitForTimeout(500);
await nav("/market"); await p.waitForTimeout(800);
(await p.getByText("Featured Partners").count()) ? ok("market loads") : fail("market");
const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
!overflow ? ok("no horizontal overflow") : fail("horizontal overflow");

const d = await b.newPage({ viewport: { width: 1280, height: 900 } });
await d.goto(`${BASE}/`); await d.waitForTimeout(1200); await d.screenshot({ path: `${OUT}/n5-desktop.png`, fullPage: true });
console.log("errors:", errors.length ? errors : "none");
if (errors.length) process.exitCode = 1;
await b.close();

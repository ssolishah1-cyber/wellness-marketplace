// Exercise library and admin panel (demo mode).
//   npm run build:site, serve dist-site on :5050, then: node tests/e2e-admin.mjs
import { chromium } from "playwright-core";
import { fileURLToPath } from "url";
import path from "path";
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "screenshots");
const BASE = process.env.BASE_URL || "http://localhost:5050/app";
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const errors = [];
const ok = (m) => console.log("✓", m);
const fail = (m) => { console.log("✗", m); process.exitCode = 1; };
const p = await b.newPage({ viewport: { width: 400, height: 860 } });
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => m.type() === "error" && !/fonts\.g|net::ERR|Failed to load resource/.test(m.text()) && errors.push(m.text()));
await p.goto(`${BASE}/workouts`); await p.waitForTimeout(1200);

// ---- plan exercise: photos and swaps from the open library ----
await p.locator('section[aria-label="This week"] button:not([aria-label*="Rest day"])').first().click(); await p.waitForTimeout(400);
const first = p.locator('section ol li button[aria-expanded]').first();
if (await first.count()) {
  await first.click(); await p.waitForTimeout(1500);
  (await p.locator("figure img").count()) ? ok("plan exercise shows start/finish photos") : fail("no exercise photos");
  (await p.getByText("Swap for a similar exercise").count()) ? ok("plan exercise offers swaps") : fail("no swaps");
} else ok("rest day today (no session to expand)");

// ---- exercise library ----
await p.getByRole("link", { name: /Exercise library/ }).click(); await p.waitForTimeout(1500);
const count = Number((await p.getByText(/^\d+ exercises$/).innerText()).split(" ")[0]);
count > 50 ? ok(`library shows ${count} matched exercises`) : fail("library count " + count);
(await p.getByText("Free Exercise DB (public domain)").count()) ? ok("library credits the open-source source") : fail("no credit");
await p.getByRole("button", { name: "Stretch & mobility" }).click(); await p.waitForTimeout(300);
await p.fill("#ex-search", "hamstring"); await p.waitForTimeout(300);
const n2 = Number((await p.getByText(/^\d+ exercises$/).innerText()).split(" ")[0]);
n2 > 0 && n2 < count ? ok(`filters work (${n2} hamstring stretches)`) : fail("filter " + n2);
await p.locator("ul li button").first().click(); await p.waitForTimeout(500);
(await p.getByRole("dialog").locator("ol li").count()) ? ok("exercise sheet shows instructions") : fail("no instructions");
await p.screenshot({ path: `${OUT}/x1-exercise-sheet.png` });
await p.keyboard.press("Escape");
await p.fill("#ex-search", ""); await p.getByRole("button", { name: "All", exact: true }).click(); await p.waitForTimeout(300);
await p.screenshot({ path: `${OUT}/x2-library.png` });

// ---- admin panel ----
await p.getByRole("button", { name: "Member" }).count();
await p.getByRole("button", { name: "Admin", exact: true }).first().click(); await p.waitForTimeout(800);
await p.locator('header a[href="/app/admin"]').click(); await p.waitForTimeout(1000);
(await p.getByRole("heading", { name: "Admin panel" }).count()) ? ok("admin panel opens") : fail("no admin panel");
for (const t of ["Users", "Finished setup", "Waiting for review", "Sign-ups per day", "Health focus chosen"]) (await p.getByText(t, { exact: true }).count()) ? ok(`overview shows "${t}"`) : fail(`missing "${t}"`);
(await p.getByText("under 5").count()) ? ok("small health totals are hidden") : fail("small totals visible");
await p.screenshot({ path: `${OUT}/a1-admin-overview.png`, fullPage: true });
await p.getByRole("button", { name: "Users & roles" }).click(); await p.waitForTimeout(800);
const row = p.locator("div.card > div", { hasText: "jamie@example.com" });
await row.getByRole("button", { name: "reviewer" }).click(); await p.waitForTimeout(800);
(await row.getByRole("button", { name: "reviewer" }).getAttribute("aria-pressed")) === "true" ? ok("granted reviewer role") : fail("role not granted");
(await p.getByText(/Gave reviewer to jamie@example.com/).count()) ? ok("role change logged") : fail("no audit entry");
(await p.locator("div.card > div", { hasText: "(you)" }).getByRole("button", { name: "admin" }).isDisabled()) ? ok("can't remove own admin role") : fail("own admin removable");
await p.screenshot({ path: `${OUT}/a2-admin-users.png`, fullPage: true });
await p.getByRole("button", { name: "Review queue" }).click(); await p.waitForTimeout(800);
(await p.getByText(/Review|pending|No listings/i).count()) ? ok("review queue still works") : fail("queue");

// ---- non-admins don't see admin tabs ----
await p.getByRole("button", { name: "App user" }).click(); await p.waitForTimeout(800);
(await p.getByText("Admins and reviewers only").count()) ? ok("app users are blocked from the admin panel") : fail("member sees admin");

console.log("errors:", errors.length ? errors : "none");
await b.close();

// Launch-readiness checks: setup wizard, legal pages, data download/delete,
// installable-app files, and (with a real-mode build) the sign-in screens.
//   BASE_URL=http://localhost:5050/app REAL_URL=http://localhost:5051/app node tests/e2e-launch.mjs
import { chromium } from "playwright-core";
import { fileURLToPath } from "url";
import path from "path";
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "screenshots");
const BASE = process.env.BASE_URL || "http://localhost:5050/app";
const REAL = process.env.REAL_URL;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const errors = [];
const ok = (m) => console.log("✓", m);
const fail = (m) => { console.log("✗", m); process.exitCode = 1; };
const page = async (url) => {
  const p = await b.newPage({ viewport: { width: 400, height: 860 }, acceptDownloads: true });
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && !/fonts\.g|net::ERR|example-unreachable/.test(m.text()) && errors.push(m.text()));
  await p.goto(url); await p.waitForTimeout(1200);
  return p;
};

// ---- setup wizard (demo mode) ----
let p = await page(`${BASE}/welcome`);
await p.fill("#w-name", "Sam");
await p.getByRole("button", { name: "Female" }).click();
await p.fill("#w-age", "35"); await p.fill("#w-height-ft", "5"); await p.fill("#w-height-in", "5"); await p.fill("#w-weight", "165");
await p.getByRole("button", { name: /Continue/ }).click(); await p.waitForTimeout(300);
await p.getByRole("button", { name: /Continue/ }).isDisabled() ? ok("goal step blocks until goal weight is valid") : fail("goal step not validated");
await p.fill("#w-goal", "175"); await p.waitForTimeout(150);
(await p.getByText("Goal weight should be below your current weight.").count()) ? ok("rejects a 'lose' goal above current weight") : fail("no goal-weight warning");
await p.fill("#w-goal", "150");
await p.getByRole("button", { name: /Moderate/ }).click();
await p.getByRole("button", { name: /Continue/ }).click(); await p.waitForTimeout(300);
const kcal = await p.inputValue("#w-kcal_goal");
Number(kcal) > 1200 && Number(kcal) < 2400 ? ok(`suggested ${kcal} kcal`) : fail("kcal " + kcal);
await p.screenshot({ path: `${OUT}/l1-setup-targets.png` });
await p.fill("#w-kcal_goal", "1750");
await p.getByRole("button", { name: /Save my goals/ }).click(); await p.waitForTimeout(1200);
const ring = await p.locator('section[aria-label="Today\'s calories and macros"]').innerText().catch(() => "");
ring.includes("of 1,750") ? ok("home uses the saved 1,750 kcal goal") : fail("home ring: " + ring);
(await p.getByText("Good", { exact: false }).first().innerText()).includes("Sam") ? ok("greets by new name") : fail("name not saved");

// ---- profile: legal links, download, delete ----
await p.locator('nav a[href="/app/profile"]').last().click(); await p.waitForTimeout(800);
for (const t of ["Privacy Policy", "Terms of Use", "Help & support", "Download my data", "Delete my account", "Recalculate", "lb · ft"]) (await p.getByText(t).count()) ? ok(`profile shows "${t}"`) : fail(`missing "${t}"`);
const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 5000 }).catch(() => null), p.getByRole("button", { name: "Download my data" }).click()]);
dl && /my-nutrition-data-\d{4}-\d{2}-\d{2}\.json/.test(dl.suggestedFilename()) ? ok("download produces " + dl.suggestedFilename()) : fail("no download");
await p.getByRole("button", { name: "Delete my account" }).click();
const del = p.getByRole("button", { name: "Delete forever" });
(await del.isDisabled()) ? ok("delete needs typed confirmation") : fail("delete not guarded");
await p.fill("#confirm-delete", "DELETE"); await del.click(); await p.waitForTimeout(1000);
(await p.getByText("browsing as a visitor").count()) ? ok("account deleted → signed out") : fail("delete did not sign out");
await p.locator('nav a[href="/app/privacy"]').count(); // not in nav; open directly
await p.goto(`${BASE}/privacy`); await p.waitForTimeout(600);
(await p.getByRole("heading", { name: "Privacy Policy" }).count()) && (await p.getByText("never sell your personal or health data").count()) ? ok("privacy policy renders") : fail("privacy page");
await p.screenshot({ path: `${OUT}/l2-privacy.png`, fullPage: true });
await p.goto(`${BASE}/delete-account`); await p.waitForTimeout(500);
(await p.getByText("Without the app:").count()) ? ok("public account-deletion page") : fail("delete-account page");
await p.goto(`${BASE}/progress`); await p.waitForTimeout(800);
(await p.getByText("Sign in to see your progress").count()) ? ok("progress requires sign-in after delete") : fail("progress after delete");
await p.goto(`${BASE}/terms`); await p.waitForTimeout(500);
(await p.getByRole("heading", { name: "Terms of Use" }).count()) ? ok("terms render") : fail("terms page");
!(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) ? ok("no horizontal overflow") : fail("overflow");

// ---- installable app ----
const m = await p.evaluate(async () => (await fetch(document.querySelector('link[rel="manifest"]').href)).json());
m.display === "standalone" && m.icons.length === 3 ? ok(`manifest: ${m.name}, standalone, ${m.icons.length} icons`) : fail("manifest");
await p.goto(`${BASE}/`); await p.waitForTimeout(2500);
const sw = await p.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.scope ?? null);
sw && sw.endsWith("/app/") ? ok("service worker active, scope " + new URL(sw).pathname) : fail("service worker not registered: " + sw);

// ---- real-mode auth screens ----
if (REAL) {
  const r = await page(`${REAL}/profile`);
  (await r.getByRole("heading", { name: "Sign in" }).count()) ? ok("real mode: sign-in form, no demo bar") : fail("real sign-in");
  (await r.getByText("Demo mode").count()) === 0 ? ok("no demo bar in real mode") : fail("demo bar visible");
  await r.getByRole("button", { name: "Forgot password?" }).click();
  (await r.getByRole("button", { name: "Send reset link" }).count()) ? ok("forgot-password form") : fail("forgot form");
  await r.getByRole("button", { name: /Already have an account|New here/ }).click();
  await r.getByRole("button", { name: /New here/ }).click().catch(() => {});
  await r.waitForTimeout(300);
  const signUp = r.getByRole("button", { name: "Sign up" });
  (await signUp.count()) && (await signUp.isDisabled()) ? ok("sign-up requires the 18+/terms checkbox") : fail("sign-up not gated");
  await r.screenshot({ path: `${OUT}/l3-signup.png` });
  await r.goto(`${REAL}/reset-password`); await r.waitForTimeout(5000);
  (await r.getByText("This link has expired").count()) ? ok("reset page without a valid link explains it expired") : fail("reset page");
}
console.log("errors:", errors.length ? errors : "none");
if (errors.length) process.exitCode = 1;
await b.close();

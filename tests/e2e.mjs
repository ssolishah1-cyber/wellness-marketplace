import { chromium } from "playwright-core";
// End-to-end check of the demo build. Usage:
//   npm run build && npx vite preview --port 4173 &
//   CHROMIUM_PATH=/path/to/chromium node tests/e2e.mjs
import { fileURLToPath } from "url";
import path from "path";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "screenshots");
const BASE = process.env.BASE_URL || "http://localhost:4173";
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const errors = [];
const ctx = await b.newContext({ viewport: { width: 1200, height: 900 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const nav = async (path) => { await p.evaluate((u) => { history.pushState({}, "", u); dispatchEvent(new PopStateEvent("popstate")); }, path); await p.waitForTimeout(400); };
const persona = async (label) => { await p.getByRole("button", { name: label, exact: true }).click(); await p.waitForTimeout(400); };
const step = (s) => console.log("✓", s);

await p.goto(`${BASE}/market`); await p.waitForTimeout(800);
await p.getByText("Featured Partners").waitFor(); step("market home renders");
await p.screenshot({ path: `${OUT}/01-market-home.png`, fullPage: true });

// Vendor: create & submit a listing
await persona("Vendor"); await nav("/market/vendor");
await p.getByText("GreenPlate Coaching").first().waitFor(); step("vendor dashboard");
await p.screenshot({ path: `${OUT}/03-vendor-portal.png`, fullPage: true });
await p.getByRole("button", { name: "New listing" }).click();
await p.getByLabel("Title *").fill("Plant-protein cooking class");
await p.getByLabel("Category *").selectOption({ label: "Events & Programs" });
await p.getByLabel("Short summary").fill("Learn five high-protein plant meals.");
await p.getByLabel("Destination URL").fill("https://example.com/class");
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
await p.locator("input[type=file]").setInputFiles({ name: "class.png", mimeType: "image/png", buffer: png });
await p.getByText("Cover").waitFor(); step("image uploaded");
await p.getByRole("button", { name: "Submit for review" }).click(); await p.waitForTimeout(500);
const row = p.locator("div.card > div", { hasText: "Plant-protein cooking class" });
console.log("  vendor sees status:", await row.locator(".badge").first().innerText());

// Public can't see it
await persona("Visitor"); await nav("/market");
console.log("  visitor sees pending listing:", await p.getByText("Plant-protein cooking class").count());

// Admin publishes it
await persona("Admin"); await nav("/admin/marketplace");
await p.getByRole("button", { name: /Plant-protein cooking class/ }).click();
const publish = p.getByRole("button", { name: "Publish", exact: true });
console.log("  publish disabled before checklist:", await publish.isDisabled());
for (const cb of await p.locator("text=Review checklist").locator("..").locator("input[type=checkbox]").all()) await cb.check();
await p.screenshot({ path: `${OUT}/05-admin-review.png`, fullPage: true });
await publish.click(); await p.waitForTimeout(500); step("admin published");

// Visitor sees it; member sends inquiry
await persona("App user"); await nav("/market");
await p.getByText("Plant-protein cooking class").first().click(); await p.waitForTimeout(500);
await p.getByRole("button", { name: "Ask a question" }).click();
await p.getByLabel("Your name").fill("Sam");
await p.getByRole("textbox", { name: /^Message/ }).fill("Is there a recording?");
const send = p.getByRole("button", { name: "Send", exact: true });
console.log("  send disabled without consent:", await send.isDisabled());
await p.locator("input[type=checkbox]").last().check(); await send.click(); await p.waitForTimeout(400);
await p.getByText("Your question was sent").waitFor(); step("inquiry sent");

// Vendor edits live listing -> back to review; sees inquiry
await persona("Vendor"); await nav("/market/vendor");
await p.getByText("Is there a recording?").waitFor(); step("vendor sees inquiry");
await row.getByRole("button", { name: "Edit" }).click();
await p.getByLabel("Short summary").fill("Updated summary");
await p.getByRole("button", { name: "Save changes" }).click(); await p.waitForTimeout(500);
console.log("  after vendor edit of live listing:", await row.locator(".badge").first().innerText());

// Screens for listing detail and admin analytics
await persona("App user"); await nav("/market/listing/triggermd-virtual-consultation");
await p.screenshot({ path: `${OUT}/02-listing-triggermd.png`, fullPage: true });
const opened = await p.getByRole("link", { name: /Visit TriggerMD/ }).getAttribute("href");
console.log("  outbound link:", opened);
if (!opened?.includes("utm_medium=marketplace")) throw new Error("UTM tags missing");
await persona("Admin"); await nav("/admin/marketplace"); await p.getByRole("button", { name: "Analytics" }).click(); await p.waitForTimeout(500);
await p.screenshot({ path: `${OUT}/06-admin-analytics.png`, fullPage: true });

// Mobile
const m = await b.newPage({ viewport: { width: 390, height: 844 } });
await m.goto(`${BASE}/market`); await m.waitForTimeout(800);
await m.screenshot({ path: `${OUT}/04-mobile-market.png`, fullPage: true });
const overflow = await m.evaluate(() => document.documentElement.scrollWidth > innerWidth);
console.log("  mobile horizontal overflow:", overflow);
console.log("errors:", errors.length ? errors : "none");
if (errors.length) process.exitCode = 1;
await b.close();

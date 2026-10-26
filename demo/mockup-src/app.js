// ===================== helpers =====================
const $ = (s) => document.querySelector(s);
const ic = (n, cls = "") => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ""}</svg>`;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => (n === 0 ? "Free" : "$" + n.toLocaleString("en-US"));
const clone = (o) => JSON.parse(JSON.stringify(o));
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ===================== sample data =====================
const CATS = [
  { id: "telehealth", name: "Telehealth", icon: "steth" },
  { id: "products", name: "Wellness Products", icon: "pkg" },
  { id: "weight", name: "Weight Management", icon: "scale" },
  { id: "fitness", name: "Fitness", icon: "dumbbell" },
  { id: "books", name: "Books & Education", icon: "book" },
  { id: "providers", name: "Wellness Providers", icon: "badge" },
  { id: "events", name: "Events & Programs", icon: "calendar" },
];
const cat = (id) => CATS.find((c) => c.id === id);

const BRANDS = {
  triggermd: {
    name: "TriggerMD", cls: "tmd", color: "#1a4f9a", site: "triggermd.com", cta: "Visit TriggerMD", owned: true,
    tagline: "Virtual care, consultations and eligible medical services",
    about: "Licensed clinicians by video, from the comfort of home. Book a consultation, get a lab review, or join a clinician-led weight program where you're eligible.",
    services: ["Virtual consultations", "Lab result reviews", "Clinician-led weight programs"],
    areas: "14 US states (sample)", eligibility: "Adults 18+. A licensed clinician decides eligibility after intake.",
    clinical: "Programs follow protocols reviewed by a board-certified medical director (sample).",
    disclosure: "TriggerMD is affiliated with the owner of this app. We may benefit if you use its services.",
  },
  ximmd: {
    name: "XIMMD", cls: "xim", color: "#1f6b3d", site: "ximmd.com", cta: "Visit XIMMD", owned: true,
    tagline: "Wellness products and approved offers",
    about: "Everyday wellness essentials with published ingredient lists and the evidence behind each claim.",
    services: ["Greens & superfoods", "Hydration", "Wellness bundles"],
    shipping: "Free US shipping over $50 · 3–5 business days", refund: "30-day money-back guarantee on unopened items",
    disclosure: "XIMMD is affiliated with the owner of this app. We may benefit from purchases.",
  },
};

const VENDORS = [
  { id: "greenplate", name: "GreenPlate Coaching", owner: "Maya Ortiz, RD", status: "approved", creds: "Registered Dietitian #RD-48213 (sample)", applied: "Sep 12" },
  { id: "fitloop", name: "FitLoop Studio", owner: "Chris Adeyemi", status: "approved", creds: "NASM Certified Personal Trainer", applied: "Sep 30" },
  { id: "ironnest", name: "IronNest Equipment", owner: "Dana Park", status: "approved", creds: "Registered business · US", applied: "Oct 2" },
  { id: "calmmind", name: "CalmMind Yoga", owner: "Priya Nair", status: "pending", creds: "RYT-500 Yoga Alliance", applied: "Oct 24" },
  { id: "apex", name: "Apex Supplements", owner: "R. Kline", status: "pending", creds: "None provided", applied: "Oct 25" },
];

const BASE_LISTINGS = [
  { id: "tmd-consult", brand: "triggermd", cat: "telehealth", type: "service", title: "Virtual Wellness Consultation", price: 49, note: "per visit", status: "published", sponsored: true, regulated: true,
    summary: "A 20-minute video visit with a licensed clinician to talk through your health goals.",
    how: ["Complete a short online intake (about 5 minutes).", "A licensed clinician reviews it and confirms eligibility.", "Meet by video. Same-day slots are often available.", "Get a visit summary and next steps in your TriggerMD account."],
    minAge: 18, disclaimer: "Not for emergencies. If you have a medical emergency, call 911.", clicks: 1284 },
  { id: "tmd-labs", brand: "triggermd", cat: "telehealth", type: "service", title: "Lab Results Review", price: 79, note: "one-time", status: "published", sponsored: true, regulated: true,
    summary: "Upload recent lab results and a clinician explains them in plain language.",
    how: ["Upload a recent lab report (PDF or photo).", "A clinician reviews it within 48 hours.", "Talk through the results by video or message."], minAge: 18,
    disclaimer: "A lab review isn't a diagnosis. Your clinician will tell you if follow-up care is needed.", clicks: 412 },
  { id: "xim-greens", brand: "ximmd", cat: "products", type: "product", title: "Daily Greens Blend", price: 39, note: "30 servings", status: "published", sponsored: true,
    summary: "A scoop of 18 greens and berries that mixes into water or a smoothie.",
    ingredients: ["Spinach", "Kale", "Spirulina", "Chlorella", "Wheatgrass", "Blueberry", "Ginger"],
    specs: "30 × 8 g scoops · vegan · no added sugar · third-party tested (sample)",
    evidence: "Adds 2 servings of leafy greens per scoop. Ingredient amounts are on the label; no disease claims are made.",
    disclaimer: "These statements have not been evaluated by the FDA. This product is not intended to diagnose, treat, cure or prevent any disease.", clicks: 968 },
  { id: "xim-hydro", brand: "ximmd", cat: "products", type: "product", title: "Electrolyte Hydration Sticks", price: 24, note: "20 sticks", status: "published", sponsored: true,
    summary: "Sodium, potassium and magnesium with zero sugar, for workouts and hot days.",
    ingredients: ["Sodium 500 mg", "Potassium 200 mg", "Magnesium 60 mg", "Lemon-lime"],
    specs: "20 single-serve sticks · 10 kcal each · caffeine-free",
    evidence: "Electrolyte amounts match common sports-hydration guidance. No performance claims.",
    disclaimer: "These statements have not been evaluated by the FDA.", clicks: 377 },
  { id: "gp-coaching", vendor: "greenplate", cat: "providers", type: "provider", title: "12-Week Nutrition Coaching", price: 299, note: "for 12 weeks", status: "published",
    summary: "Weekly video check-ins with a registered dietitian and a meal-planning framework built around your routine.",
    how: ["Free 15-minute intro call.", "Weekly 30-minute coaching sessions.", "Message support between sessions."], areas: "Online · US & Canada", clicks: 214, inquiries: 9 },
  { id: "gp-ebook", vendor: "greenplate", cat: "books", type: "education", title: "The Protein Plate (e-book)", price: 14, note: "PDF · 64 pages", status: "published",
    summary: "60 high-protein meals in 20 minutes or less, with a shopping list for each week.", clicks: 156, inquiries: 2 },
  { id: "gp-workshop", vendor: "greenplate", cat: "events", type: "event", title: "Label-Reading Live Workshop", price: 0, note: "Nov 19 · online", status: "pending",
    summary: "A live 90-minute session on reading nutrition labels and spotting marketing claims.", when: "Thu Nov 19, 2026 · 6:00 pm ET", where: "Online (Zoom)", clicks: 0, inquiries: 0, submitted: "Oct 25" },
  { id: "gp-family", vendor: "greenplate", cat: "weight", type: "program", title: "Family Meal-Planning Plan", price: 89, note: "4 weeks", status: "draft",
    summary: "Four weeks of family dinners kids will actually eat.", clicks: 0, inquiries: 0 },
  { id: "gp-gut", vendor: "greenplate", cat: "events", type: "event", title: "Gut Health Masterclass", price: 35, note: "recorded", status: "rejected",
    summary: "A recorded masterclass on fibre, fermented foods and gut health.", reason: "The claim “heals IBS” needs clinical evidence or must be removed.", clicks: 0, inquiries: 0 },
  { id: "bl-reset", vendor: "balance", vendorName: "Balance Lab", cat: "weight", type: "program", title: "12-Week Habit Reset", price: 149, note: "self-paced", status: "published",
    summary: "Small daily habits for steady, sustainable weight management, with weekly lessons.", clicks: 188 },
  { id: "fl-strength", vendor: "fitloop", vendorName: "FitLoop Studio", cat: "fitness", type: "program", title: "Home Strength Program", price: 12, note: "per month", status: "published",
    summary: "20-minute guided strength workouts you can do with just a pair of dumbbells.", clicks: 233 },
  { id: "in-dumbbells", vendor: "ironnest", vendorName: "IronNest Equipment", cat: "fitness", type: "product", title: "Adjustable Dumbbell Set", price: 189, note: "5–25 lb pair", status: "published",
    summary: "Quick-change dial dumbbells that replace a full rack.", specs: "5–25 lb in 2.5 lb steps · 2-year warranty", clicks: 141 },
  { id: "sl-sports", vendor: "samlee", vendorName: "Sam Lee Nutrition", cat: "providers", type: "provider", title: "Sports Nutrition Session", price: 85, note: "per session", status: "published",
    summary: "One-to-one fuelling plan for runners, cyclists and gym-goers.", areas: "Online", clicks: 97 },
  { id: "mm-seminar", vendor: "calmmind", vendorName: "CalmMind Yoga", cat: "events", type: "event", title: "Mindful Eating Seminar", price: 20, note: "Dec 3 · online", status: "published",
    summary: "Slow down, notice hunger cues, and enjoy food again. Live, with Q&A.", when: "Thu Dec 3, 2026 · 7:00 pm ET", where: "Online", clicks: 64 },
  { id: "apex-burn", vendor: "apex", vendorName: "Apex Supplements", cat: "products", type: "product", title: "BurnMax Fat-Melt Capsules", price: 59, note: "60 capsules", status: "pending",
    summary: "Melts 10 lb in 2 weeks with no diet or exercise!", submitted: "Oct 25",
    flags: [["bad", "Claim “melts 10 lb in 2 weeks” has no supporting evidence"], ["bad", "No ingredient list provided"], ["warn", "Vendor account not yet approved"]] },
  { id: "tmd-weight", brand: "triggermd", cat: "telehealth", type: "program", title: "Clinician-Led Weight Program", price: 129, note: "per month", status: "pending", sponsored: true, regulated: true,
    summary: "Monthly clinician check-ins and a personalised plan, for eligible adults.", submitted: "Oct 26", minAge: 18,
    flags: [["warn", "Regulated service: legal & advertising sign-off required"], ["ok", "Disclaimers and eligibility present"], ["ok", "Price matches TriggerMD website"]] },
];
BASE_LISTINGS.find((l) => l.id === "gp-workshop").flags = [["ok", "Vendor is a verified Registered Dietitian"], ["ok", "Free event: no pricing to verify"], ["warn", "Add a cancellation note for the live session"]];

const NEW_LISTING = {
  id: "gp-plant", vendor: "greenplate", cat: "events", type: "event", title: "Plant-Protein Cooking Class", price: 25, note: "Nov 28 · online", status: "pending",
  summary: "Cook three high-protein plant meals live with a registered dietitian.", when: "Sat Nov 28, 2026 · 11:00 am ET", where: "Online (Zoom)",
  clicks: 0, inquiries: 0, submitted: "Today", fresh: true,
  flags: [["ok", "Vendor is a verified Registered Dietitian"], ["ok", "Price shown and matches checkout page"], ["ok", "No health claims"]],
};

const FOODS = [
  { name: "Salmon, rice & greens", kcal: 520, p: 34, c: 48, f: 19, icon: "fish", g: "g-telehealth" },
  { name: "Red lentil soup", kcal: 310, p: 18, c: 44, f: 6, icon: "soup", g: "g-weight" },
  { name: "Protein berry smoothie", kcal: 280, p: 25, c: 32, f: 5, icon: "zap", g: "g-fitness" },
  { name: "Hummus veggie wrap", kcal: 430, p: 15, c: 52, f: 17, icon: "salad", g: "g-products" },
];

const INITIAL_MEALS = {
  Breakfast: [{ name: "Greek yogurt, berries & granola", kcal: 420, p: 28, c: 52, f: 11, icon: "coffee", g: "g-books" }],
  Lunch: [{ name: "Chicken quinoa bowl", kcal: 610, p: 46, c: 62, f: 18, icon: "salad", g: "g-products" }],
  Snack: [{ name: "Apple & almond butter", kcal: 190, p: 5, c: 24, f: 9, icon: "apple", g: "g-fitness" }],
  Dinner: [],
};

const WEIGHT = [84.6, 84.1, 83.9, 83.2, 82.8, 82.9, 82.3, 81.7];
const WEEK_KCAL = [1980, 2140, 2050, 1890, 2210, 2320, 1220];
const CLICKS_14 = [182, 205, 196, 241, 263, 228, 214, 251, 276, 299, 288, 312, 305, 341];
const INQUIRIES = [
  { who: "Alex R.", email: "alex.r@example.com", listing: "12-Week Nutrition Coaching", when: "2h ago", msg: "Do you work with people training for a half marathon? Looking for help with fuelling on long runs." },
  { who: "Sam T.", email: "samt@example.com", listing: "12-Week Nutrition Coaching", when: "Yesterday", msg: "Is the intro call free, and can sessions be in the evening (after 7pm ET)?" },
  { who: "Jamie L.", email: "jamie.l@example.com", listing: "The Protein Plate (e-book)", when: "Oct 23", msg: "Are there vegetarian options in the e-book?" },
];

// ===================== state =====================
const fresh = () => ({
  role: "user",
  user: { stack: [{ s: "home" }] },
  vendor: { s: "vdash", step: 0, uploaded: false },
  admin: { s: "aqueue", sel: null, checks: {}, reason: "" },
  listings: clone(BASE_LISTINGS),
  vendors: clone(VENDORS),
  featured: { triggermd: true, ximmd: true },
  meals: clone(INITIAL_MEALS),
  water: 5, day: 0, ringFrom: 100,
  marketCat: "all", q: "",
  sentInquiries: [],
  overlay: null, dir: "fade",
  tour: null, seenNew: false,
});
let S = fresh();

const listing = (id) => S.listings.find((l) => l.id === id);
const live = () => S.listings.filter((l) => l.status === "published");
const vendorName = (l) => (l.brand ? BRANDS[l.brand].name : l.vendor === "greenplate" ? "GreenPlate Coaching" : l.vendorName || "");
const totals = () => {
  const all = Object.values(S.meals).flat();
  return all.reduce((a, m) => ({ kcal: a.kcal + m.kcal, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f }), { kcal: 0, p: 0, c: 0, f: 0 });
};
const GOAL = { kcal: 2100, p: 140, c: 230, f: 70 };

// ===================== small renderers =====================
const statusPill = (s) => `<span class="pill st-${s}">${{ draft: "Draft", pending: "Pending Review", approved: "Approved", published: "Published", rejected: "Rejected", expired: "Expired" }[s]}</span>`;
const art = (l, size = "lg") => `<div class="art g-${l.cat}">${ic(cat(l.cat).icon, size)}<span class="blob" style="width:70px;height:70px;right:-18px;top:-22px"></span></div>`;
const brandLogo = (b, size = 26) => b === "triggermd"
  ? `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="#1a4f9a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2-5 4 10 2-5h6"/></svg>`
  : `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="#1f6b3d" stroke-width="2.2" stroke-linejoin="round"><path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7z"/><path d="M8.5 9.5l7 5M15.5 9.5l-7 5"/></svg>`;

function lcard(l, i) {
  const isNew = l.fresh && !S.seenNew;
  return `<button class="lcard rise" style="--i:${i};position:relative" data-act="open" data-s="listing" data-id="${l.id}">
    ${art(l)}
    <span class="badges">${l.sponsored ? `<span class="pill sponsor">Sponsored</span>` : ""}${isNew ? `<span class="pill new">New</span>` : ""}</span>
    <span class="body">
      <span class="eyebrow">${esc(cat(l.cat).name)}</span>
      <b>${esc(l.title)}</b>
      <span class="small muted">${esc(vendorName(l))}</span>
      <span class="price num">${money(l.price)} <span class="small muted" style="font-weight:500">${esc(l.note)}</span></span>
    </span>
  </button>`;
}

function counter(v, prefix = "") { return `<b class="num" data-count="${v}" data-prefix="${prefix}">${prefix}${v.toLocaleString("en-US")}</b>`; }

// ===================== member screens =====================
const SCREENS = {};

SCREENS.home = () => {
  const t = totals();
  const pct = Math.min(100, (t.kcal / GOAL.kcal) * 100);
  const left = GOAL.kcal - t.kcal;
  const proteinGap = GOAL.p - t.p;
  const from = S.ringFrom; S.ringFrom = 100 - pct;
  const macro = (n, v, g, col, i) => `<div class="macro rise" style="--i:${i}"><div class="row between small"><span style="font-weight:600">${n}</span><span class="muted num">${v} / ${g} g</span></div><div class="bar"><i style="width:${Math.min(100, (v / g) * 100)}%;background:${col}"></i></div></div>`;
  return `
  <div class="hello rise"><div class="row between"><div><div class="muted small">Monday, Oct 26</div><h2>Good evening, Jordan</h2></div>
    <button class="iconbtn" data-act="toast" data-msg="No new notifications" aria-label="Notifications">${ic("bell")}</button></div></div>
  <div class="card ringcard rise" style="--i:1">
    <div class="ringwrap">
      <svg viewBox="0 0 120 120"><circle class="track" cx="60" cy="60" r="52" fill="none" stroke-width="12"/>
      <circle class="val" cx="60" cy="60" r="52" fill="none" stroke-width="12" pathLength="100" stroke-dasharray="100" style="--from:${from};--to:${100 - pct};stroke-dashoffset:${100 - pct}"/></svg>
      <div class="mid"><div><b class="num">${Math.max(0, left).toLocaleString()}</b><span class="tiny muted">kcal left</span></div></div>
    </div>
    <div class="stack" style="gap:8px">
      ${macro("Protein", t.p, GOAL.p, "var(--leaf)", 2)}${macro("Carbs", t.c, GOAL.c, "var(--citrus)", 3)}${macro("Fat", t.f, GOAL.f, "var(--sky)", 4)}
      <div class="tiny muted num">${t.kcal.toLocaleString()} of ${GOAL.kcal.toLocaleString()} kcal eaten</div>
    </div>
  </div>
  <div class="card coach rise" style="--i:2">
    <div class="row between"><span class="row" style="gap:6px;font-weight:700">${ic("spark", "sm")} AI nutrition coach</span><span class="tag">${ic("lock", "sm")} No sponsored content</span></div>
    <p style="margin:8px 0 10px;font-size:14.5px;position:relative;z-index:1">${!S.meals.Dinner.length
      ? `You're <b>${proteinGap} g short on protein</b> today. A salmon dinner (34 g) would close most of the gap.`
      : proteinGap > 15
        ? `Dinner logged. You're still <b>${proteinGap} g short on protein</b>. A cup of Greek yogurt (17 g) as an evening snack would get you close.`
        : `Protein target ${proteinGap > 0 ? "nearly " : ""}reached. Nice work. You have <b>${Math.max(0, left)} kcal</b> left for today.`}</p>
    <button class="btn" style="background:rgba(255,255,255,.95);color:#13603a;position:relative;z-index:1" data-act="tab" data-s="meals">${S.meals.Dinner.length ? `${ic("meals", "sm")} View meals` : `${ic("plus", "sm")} Plan dinner`}</button>
  </div>
  <div class="card rise" style="--i:3">
    <div class="row between"><div><div class="row" style="gap:6px;font-weight:700">${ic("drop", "sm")} Water</div><div class="small muted num">${S.water} of 8 glasses · tap to log</div></div>
    <span class="pill" style="background:var(--sky-soft);color:var(--sky)">${S.water * 250} ml</span></div>
    <div class="water" style="margin-top:10px">${Array.from({ length: 8 }, (_, i) => `<button class="glass ${i < S.water ? "full" : ""} ${i === S.water - 1 && S.justWater ? "just" : ""}" data-act="water" data-n="${i + 1}" aria-label="${i + 1} glasses"><i></i></button>`).join("")}</div>
  </div>
  <div class="statgrid rise" style="--i:4">
    <div class="stat"><span class="tiny muted">Streak</span>${counter(23)}<span class="tiny muted">days logged</span></div>
    <div class="stat"><span class="tiny muted">This week</span><b class="num">−0.6</b><span class="tiny muted">kg</span></div>
    <div class="stat"><span class="tiny muted">Steps</span>${counter(8412)}<span class="tiny muted">today</span></div>
  </div>`;
};

SCREENS.meals = () => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const t = totals();
  return `
  <div class="apphead rise"><div style="flex:1"><h2>Meals</h2><div class="sub num">${t.kcal.toLocaleString()} kcal · ${t.p} g protein logged today</div></div>
    <button class="iconbtn" data-act="addMeal" data-meal="Dinner" aria-label="Add food">${ic("plus")}</button></div>
  <div class="daystrip rise" style="--i:1">${days.map((d, i) => `<button aria-pressed="${i === S.day}" data-act="day" data-n="${i}">${d}<b>${26 + i > 31 ? 26 + i - 31 : 26 + i}</b></button>`).join("")}</div>
  ${S.day !== 0 ? `<div class="card rise" style="--i:2;text-align:center"><div class="muted">Nothing planned for this day yet.</div><button class="link" style="margin-top:6px" data-act="day" data-n="0">Back to today</button></div>` :
  Object.entries(S.meals).map(([name, items], i) => {
    const kc = items.reduce((a, m) => a + m.kcal, 0);
    return `<div class="card meal rise" style="--i:${i + 2}">
      <div class="row between"><b style="font-family:var(--f-display);font-size:16px">${name}</b><span class="small muted num">${kc ? kc + " kcal" : "Not logged"}</span></div>
      ${items.map((m) => `<div class="food"><div class="art ${m.g}">${ic(m.icon)}</div><div><div style="font-weight:600">${esc(m.name)}</div><div class="tiny muted num">P ${m.p} g · C ${m.c} g · F ${m.f} g</div></div><span class="num" style="font-weight:700">${m.kcal}</span></div>`).join("")}
      ${name === "Dinner" ? `<button class="addrow" data-act="addMeal" data-meal="Dinner">${ic("plus", "sm")} Add dinner</button>` : ""}
    </div>`;
  }).join("")}
  <div class="note rise" style="--i:7">${ic("lock", "sm")} Meal suggestions come only from your goals and logs. Marketplace products are never placed here.</div>`;
};

function weightChart() {
  const W = 340, H = 170, pl = 30, pb = 22, pt = 12;
  const min = 81, max = 85;
  const x = (i) => pl + (i * (W - pl - 8)) / (WEIGHT.length - 1);
  const y = (v) => pt + ((max - v) / (max - min)) * (H - pb - pt);
  const pts = WEIGHT.map((v, i) => [x(i), y(v)]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = line + ` L${x(WEIGHT.length - 1)} ${H - pb} L${pl} ${H - pb} Z`;
  const ticks = [81, 83, 85];
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight over 8 weeks, from 84.6 to 81.7 kg">
    ${ticks.map((t) => `<line class="gridl" x1="${pl}" x2="${W - 4}" y1="${y(t)}" y2="${y(t)}"/><text class="axis" x="${pl - 6}" y="${y(t) + 3}" text-anchor="end">${t}</text>`).join("")}
    ${WEIGHT.map((_, i) => `<text class="axis" x="${x(i)}" y="${H - 6}" text-anchor="middle">W${i + 1}</text>`).join("")}
    <path class="area" d="${area}"/>
    <path class="line" d="${line}" pathLength="1"/>
    ${pts.map((p, i) => `<g class="pt" tabindex="0" aria-label="Week ${i + 1}: ${WEIGHT[i]} kg"><circle class="hit" cx="${p[0]}" cy="${p[1]}" r="14"/><circle class="dot" cx="${p[0]}" cy="${p[1]}" r="${i === pts.length - 1 ? 5 : 3.5}" style="animation:pop .4s ${0.9 + i * 0.08}s both;transform-box:fill-box;transform-origin:center"/>
      <g class="tip"><rect x="${Math.min(W - 70, Math.max(0, p[0] - 32))}" y="${p[1] - 30}" width="64" height="20" rx="6"/><text x="${Math.min(W - 70, Math.max(0, p[0] - 32)) + 32}" y="${p[1] - 16}" text-anchor="middle">${WEIGHT[i]} kg</text></g></g>`).join("")}
  </svg>`;
}

function barChart(values, labels, { goal, cls = "f-leaf", hl = -1, unit = "", W = 340, H = 150 } = {}) {
  const pl = 30, pb = 22, pt = 10, max = Math.max(...values, goal || 0) * 1.08;
  const mag = 10 ** Math.floor(Math.log10(max / 2)), step = (Math.ceil((max / 2 / mag) * 2) / 2) * mag;
  const slot = (W - pl - 4) / values.length, bw = Math.min(26, slot - 4);
  const y = (v) => pt + (1 - v / max) * (H - pb - pt);
  const nice = [0, step, step * 2].filter((v) => v <= max);
  return `<svg viewBox="0 0 ${W} ${H}" role="img">
    ${nice.map((t) => `<line class="gridl" x1="${pl}" x2="${W}" y1="${y(t)}" y2="${y(t)}"/><text class="axis" x="${pl - 6}" y="${y(t) + 3}" text-anchor="end">${t >= 1000 ? (t / 1000).toFixed(1) + "k" : t}</text>`).join("")}
    ${goal ? `<line class="goal" x1="${pl}" x2="${W}" y1="${y(goal)}" y2="${y(goal)}"/>` : ""}
    ${values.map((v, i) => {
      const bx = pl + i * slot + (slot - bw) / 2, by = y(v), bh = H - pb - by, r = Math.min(4, bw / 2);
      const tipx = Math.min(W - 72, Math.max(0, bx + bw / 2 - 36));
      return `<g class="pt" tabindex="0" aria-label="${labels[i]}: ${v}${unit}">
        <rect class="hit" x="${pl + i * slot}" y="${pt}" width="${slot}" height="${H - pb - pt}"/>
        <path class="bar ${i === hl ? "f-citrus" : cls}" style="animation-delay:${i * 45}ms" d="M${bx} ${by + bh} V${by + r} Q${bx} ${by} ${bx + r} ${by} H${bx + bw - r} Q${bx + bw} ${by} ${bx + bw} ${by + r} V${by + bh} Z"/>
        <text class="axis" x="${bx + bw / 2}" y="${H - 6}" text-anchor="middle">${labels[i]}</text>
        <g class="tip"><rect x="${tipx}" y="${Math.max(0, by - 26)}" width="72" height="20" rx="6"/><text x="${tipx + 36}" y="${Math.max(0, by - 26) + 14}" text-anchor="middle">${v.toLocaleString()}${unit}</text></g>
      </g>`;
    }).join("")}
  </svg>`;
}

SCREENS.progress = () => `
  <div class="apphead rise"><div style="flex:1"><h2>Progress</h2><div class="sub">8 weeks since you started</div></div></div>
  <div class="statgrid rise" style="--i:1">
    <div class="stat"><span class="tiny muted">Lost</span><b class="num">2.9</b><span class="tiny muted">kg</span></div>
    <div class="stat"><span class="tiny muted">Avg intake</span>${counter(1973)}<span class="tiny muted">kcal / day</span></div>
    <div class="stat"><span class="tiny muted">Protein goal</span><b class="num">5 / 7</b><span class="tiny muted">days hit</span></div>
  </div>
  <div class="card chart rise" style="--i:2">
    <div class="row between" style="margin-bottom:6px"><b>Weight</b><span class="pill st-published">${ic("trend", "sm")} −2.9 kg</span></div>
    ${weightChart()}
    <div class="tiny muted">Hover or tap a point to see the weekly weigh-in.</div>
  </div>
  <div class="card stack rise" style="--i:3">
    <div class="row between"><b>Goal: 78.6 kg</b><span class="small muted num">2.9 of 6.0 kg</span></div>
    <div class="goalbar"><i style="width:48%"></i></div>
  </div>
  <div class="card chart rise" style="--i:4">
    <div class="row between" style="margin-bottom:6px"><b>Calories this week</b><span class="tiny muted">dashed line = 2,100 goal</span></div>
    ${barChart(WEEK_KCAL, ["M", "T", "W", "T", "F", "S", "S"], { goal: 2100, hl: 6, unit: " kcal" })}
  </div>`;

SCREENS.market = () => {
  const q = S.q.trim().toLowerCase();
  const rows = live().filter((l) => (S.marketCat === "all" || l.cat === S.marketCat) && (!q || (l.title + " " + l.summary + " " + vendorName(l)).toLowerCase().includes(q)));
  const feat = Object.keys(BRANDS).filter((b) => S.featured[b]);
  return `
  <div class="apphead rise"><div style="flex:1"><h2>Market</h2><div class="sub">Reviewed wellness partners and providers</div></div>
    <button class="iconbtn" data-act="tab" data-s="profile" aria-label="Your inquiries">${ic("message")}</button></div>
  <label class="search rise" style="--i:1">${ic("search", "sm")}<input id="q" type="search" placeholder="Search coaching, greens, workouts…" value="${esc(S.q)}" autocomplete="off"></label>
  ${!q && feat.length ? `<section class="stack rise" style="--i:2">
    <div class="secthead"><h3>Featured Partners</h3><span class="pill sponsor">Sponsored</span></div>
    <div class="featured">${feat.map((b) => { const B = BRANDS[b]; return `
      <button class="partner ${B.cls}" data-act="open" data-s="brand" data-id="${b}">
        <div class="row between"><span class="plogo">${brandLogo(b)}</span><span class="row" style="gap:4px"><span class="pill sponsor">Sponsored</span><span class="pill aff" style="background:rgba(255,255,255,.2);color:#fff">Affiliated</span></span></div>
        <div><h3>${B.name}</h3><p>${B.tagline}</p></div>
        <div class="row between"><span class="disc">${B.disclosure}</span>${ic("chev")}</div>
      </button>`; }).join("")}</div>
  </section>` : ""}
  <div class="chips rise" style="--i:3">
    <button class="chip" aria-pressed="${S.marketCat === "all"}" data-act="cat" data-v="all">All</button>
    ${CATS.map((c) => `<button class="chip" aria-pressed="${S.marketCat === c.id}" data-act="cat" data-v="${c.id}">${ic(c.icon, "sm")} ${c.name}</button>`).join("")}
  </div>
  <section class="stack">
    <div class="secthead"><h3>${q ? `Results for “${esc(S.q)}”` : S.marketCat === "all" ? "Latest listings" : esc(cat(S.marketCat).name)}</h3><span class="small muted num">${rows.length} listing${rows.length === 1 ? "" : "s"}</span></div>
    ${rows.length ? `<div class="grid2">${rows.map((l, i) => lcard(l, i)).join("")}</div>` : `<div class="card" style="text-align:center"><b>No listings here yet</b><div class="small muted">New partners are reviewed before they appear.</div></div>`}
  </section>
  <div class="card row rise" style="--i:4;background:var(--leaf-soft);border-color:transparent">
    ${ic("store", "lg")}<div style="flex:1"><b>Run a wellness business?</b><div class="small muted">Dietitians, coaches and brands can apply to list here.</div></div>
    <button class="btn btn-primary" data-act="role" data-v="vendor">Apply</button>
  </div>
  <div class="note">${ic("info", "sm")} Listings are separate from your nutrition recommendations. Your meals, weight and progress are never used to choose what you see here.</div>`;
};

SCREENS.brand = ({ id }) => {
  const B = BRANDS[id];
  const ls = live().filter((l) => l.brand === id);
  return `
  <div class="row"><button class="iconbtn" data-act="back" aria-label="Back">${ic("back")}</button><span class="small muted">Market / Featured Partners</span></div>
  <div class="hero rise partner ${B.cls}" style="--i:1;min-height:0">
    <span class="blob" style="width:160px;height:160px;right:-50px;top:-60px"></span><span class="blob" style="width:90px;height:90px;left:-30px;bottom:-30px;animation-delay:-2s"></span>
    <div class="row between"><span class="plogo">${brandLogo(id, 32)}</span><span class="row" style="gap:4px"><span class="pill sponsor">Sponsored</span><span class="pill aff" style="background:rgba(255,255,255,.2);color:#fff">Affiliated</span></span></div>
    <h2>${B.name}</h2><p style="margin:0;opacity:.92">${B.tagline}</p>
  </div>
  <div class="note sponsor rise" style="--i:2">${ic("info", "sm")} ${B.disclosure}</div>
  <p class="rise" style="--i:3;margin:0;color:var(--ink-2)">${B.about}</p>
  <div class="rise" style="--i:4"><div class="eyebrow" style="margin-bottom:6px">${id === "triggermd" ? "Service categories" : "Product categories"}</div><div class="ingredients">${B.services.map((s) => `<span>${s}</span>`).join("")}</div></div>
  <div class="facts rise" style="--i:5">
    ${id === "triggermd" ? `
      <div class="fact"><span>Service areas</span><b>${B.areas}</b></div>
      <div class="fact"><span>Age</span><b>18+ only</b></div>
      <div class="fact" style="grid-column:1/-1"><span>Eligibility</span><b>${B.eligibility}</b></div>
      <div class="fact" style="grid-column:1/-1"><span>Clinical review</span><b>${B.clinical}</b></div>` : `
      <div class="fact"><span>Shipping</span><b>${B.shipping}</b></div>
      <div class="fact"><span>Refunds</span><b>${B.refund}</b></div>`}
  </div>
  ${id === "triggermd" ? `<div class="note reg rise" style="--i:6">${ic("shield", "sm")} Services are provided by licensed third-party clinicians. Eligibility is determined by a clinician. This app does not provide medical advice.</div>` : ""}
  <div class="secthead"><h3>${id === "triggermd" ? "Services" : "Products"}</h3><span class="small muted">${ls.length} listed</span></div>
  <div class="grid2">${ls.map((l, i) => lcard(l, i)).join("")}</div>
  <div class="ctabar"><button class="btn btn-primary block" data-act="visit" data-brand="${id}">${B.cta} ${ic("external", "sm")}</button></div>`;
};

SCREENS.listing = ({ id }) => {
  const l = listing(id);
  if (!l) return `<div class="card">Listing not found.</div>`;
  if (l.fresh) S.seenNew = true;
  const B = l.brand ? BRANDS[l.brand] : null;
  const sec = (title, body, i) => body ? `<div class="card stack rise" style="--i:${i};gap:6px"><b style="font-family:var(--f-display)">${title}</b>${body}</div>` : "";
  return `
  <div class="row"><button class="iconbtn" data-act="back" aria-label="Back">${ic("back")}</button><span class="small muted">${esc(cat(l.cat).name)}</span></div>
  <div class="rise" style="--i:1;border-radius:24px;overflow:hidden">${art(l, "xl").replace('class="art', 'style="height:170px" class="art')}</div>
  <div class="stack rise" style="--i:2;gap:6px">
    <div class="row" style="gap:6px;flex-wrap:wrap">${l.sponsored ? `<span class="pill sponsor">Sponsored</span>` : ""}${B ? `<span class="pill aff">Affiliated</span>` : ""}${l.regulated ? `<span class="pill reg">${ic("shield", "sm")} Clinical service</span>` : ""}</div>
    <h2 style="font-size:23px;font-weight:800">${esc(l.title)}</h2>
    ${B ? `<button class="link" style="justify-self:start" data-act="open" data-s="brand" data-id="${l.brand}">by ${B.name} ${ic("chev", "sm")}</button>` : `<span class="small muted">by ${esc(vendorName(l))}${l.vendor === "greenplate" ? ` · ${ic("badge", "sm")} Verified Registered Dietitian` : ""}</span>`}
    <div style="font-family:var(--f-display);font-size:26px;font-weight:800;color:var(--leaf)" class="num">${money(l.price)} <span class="small muted" style="font-family:var(--f-body);font-weight:500">${esc(l.note)}</span></div>
    <p style="margin:0;color:var(--ink-2)">${esc(l.summary)}</p>
  </div>
  ${(l.when || l.minAge || l.areas) ? `<div class="facts rise" style="--i:3">
    ${l.when ? `<div class="fact"><span>When</span><b>${esc(l.when)}</b></div><div class="fact"><span>Where</span><b>${esc(l.where)}</b></div>` : ""}
    ${l.areas ? `<div class="fact"><span>Service area</span><b>${esc(l.areas)}</b></div>` : ""}
    ${l.minAge ? `<div class="fact"><span>Eligibility</span><b>${l.minAge}+ · clinician decides</b></div>` : ""}
  </div>` : ""}
  ${sec("How it works", l.how ? `<ol class="steps">${l.how.map((s) => `<li><span>${esc(s)}</span></li>`).join("")}</ol>` : "", 4)}
  ${sec("Ingredients", l.ingredients ? `<div class="ingredients">${l.ingredients.map((s) => `<span>${esc(s)}</span>`).join("")}</div>` : "", 5)}
  ${sec("Specifications", l.specs ? `<span class="small">${esc(l.specs)}</span>` : "", 6)}
  ${B && B.shipping ? sec("Shipping & refunds", `<span class="small">${B.shipping}<br>${B.refund}</span>`, 7) : ""}
  ${sec("Supporting evidence", l.evidence ? `<span class="small">${esc(l.evidence)}</span><span class="tiny muted">Reviewed by the marketplace team before publishing.</span>` : "", 8)}
  ${l.regulated ? `<div class="note reg">${ic("shield", "sm")} This service is provided by a licensed third party. Eligibility is determined by a clinician. This app does not provide medical advice.</div>` : ""}
  ${l.disclaimer ? `<div class="note">${ic("alert", "sm")} ${esc(l.disclaimer)}</div>` : ""}
  ${l.sponsored ? `<div class="tiny muted">Sponsored listing. ${B ? B.disclosure : ""}</div>` : ""}
  <div class="ctabar">
    <button class="btn btn-primary block" data-act="visit" data-id="${l.id}">${B ? (l.type === "product" ? "View product" : B.cta) : "Learn more"} ${ic("external", "sm")}</button>
    ${B ? "" : `<button class="btn btn-ghost block" data-act="ask" data-id="${l.id}">${ic("message", "sm")} Ask ${esc(vendorName(l))} a question</button>`}
  </div>`;
};

SCREENS.profile = () => `
  <div class="row rise"><div class="avatar">J</div><div style="flex:1"><h2 style="font-size:22px">Jordan Miles</h2><div class="small muted">Member since Aug 2026 · Goal: lose 6 kg</div></div></div>
  <div class="card stack rise" style="--i:1">
    <b style="font-family:var(--f-display)">Privacy</b>
    <div class="row between"><div><div style="font-weight:600">Use my health data in the Market</div><div class="tiny muted">Always off. Meals, weight and goals never choose or rank listings.</div></div>
      <button class="toggle locked" role="switch" aria-checked="false" data-act="toast" data-msg="This stays off: the Market never uses health data" aria-label="Locked off"></button></div>
    <div class="row between"><div><div style="font-weight:600">Weekly progress email</div><div class="tiny muted">A summary of your logs every Monday</div></div>
      <button class="toggle" role="switch" aria-checked="true" data-act="flip" aria-label="Weekly progress email"></button></div>
  </div>
  <div class="card rise" style="--i:2">
    <div class="row between"><b style="font-family:var(--f-display)">My questions to providers</b><span class="small muted num">${S.sentInquiries.length}</span></div>
    ${S.sentInquiries.length ? S.sentInquiries.map((q) => `<div class="listrow"><div class="art g-providers" style="width:36px;height:36px;border-radius:10px">${ic("message", "sm")}</div><div style="flex:1;min-width:0"><div style="font-weight:600">${esc(q.to)}</div><div class="tiny muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(q.msg)}</div></div><span class="pill st-approved">Sent</span></div>`).join("")
      : `<div class="small muted" style="padding-top:6px">You haven't asked a provider anything yet. Open a provider listing in the Market and tap “Ask a question”.</div>`}
  </div>
  <div class="card stack rise" style="--i:3">
    <div class="listrow" style="padding-top:0">${ic("store")}<div style="flex:1"><b>Advertise your business</b><div class="tiny muted">Apply to list in the Market</div></div><button class="link" data-act="role" data-v="vendor">Open</button></div>
    <div class="listrow">${ic("shield")}<div style="flex:1"><b>Marketplace standards</b><div class="tiny muted">How listings are reviewed</div></div><button class="link" data-act="toast" data-msg="Every listing is checked for evidence, pricing and disclosures">View</button></div>
  </div>`;

// ===================== vendor console =====================
function consoleShell(kind, body) {
  const v = kind === "vendor";
  const pending = S.listings.filter((l) => l.status === "pending").length;
  const pendingVendors = S.vendors.filter((x) => x.status === "pending").length;
  const nav = v
    ? [["vdash", "Dashboard", "home"], ["vnew", "New listing", "plus"], ["vinbox", "Inquiries", "inbox", INQUIRIES.length + S.sentInquiries.filter((q) => q.vendor === "greenplate").length]]
    : [["aqueue", "Review queue", "list", pending], ["alistings", "All listings", "store"], ["avendors", "Vendors", "users", pendingVendors], ["abrands", "Brands", "star"], ["aanalytics", "Analytics", "progress"]];
  const cur = S[kind].s;
  return `<div class="console">
    <aside class="side">
      <div class="who">${v ? `<div class="logo" style="background:linear-gradient(135deg,#2fb5a5,#136f72)">GP</div><div><b>GreenPlate Coaching</b><span class="tiny muted">${ic("badge", "sm")} Verified vendor</span></div>`
        : `<div class="logo" style="background:var(--ink)">${ic("shield")}</div><div><b>Marketplace team</b><span class="tiny muted">Admin · Reviewer</span></div>`}</div>
      <nav>${nav.map(([s, label, icon, n]) => `<button data-act="cnav" data-s="${s}" aria-current="${cur === s ? "page" : "false"}">${ic(icon, "sm")} ${label}${n ? `<span class="count">${n}</span>` : ""}</button>`).join("")}</nav>
    </aside>
    <section class="cmain view ${S.dir}">${body}</section>
  </div>`;
}

SCREENS.vdash = () => {
  const mine = S.listings.filter((l) => l.vendor === "greenplate");
  const liveN = mine.filter((l) => l.status === "published").length;
  const review = mine.filter((l) => l.status === "pending").length;
  const clicks = mine.reduce((a, l) => a + (l.clicks || 0), 0);
  const inq = INQUIRIES.length + S.sentInquiries.filter((q) => q.vendor === "greenplate").length;
  return `
  <div class="row between rise" style="flex-wrap:wrap"><div><span class="eyebrow">Vendor portal</span><h2>Good evening, Maya</h2></div>
    <button class="btn btn-primary" data-act="cnav" data-s="vnew">${ic("plus", "sm")} New listing</button></div>
  <div class="kpis">
    <div class="kpi rise" style="--i:1"><span class="k">${ic("eye", "sm")} Live listings</span>${counter(liveN)}<span class="d">visible in the Market</span></div>
    <div class="kpi rise" style="--i:2"><span class="k">${ic("clock", "sm")} In review</span>${counter(review)}<span class="d" style="color:var(--warn)">usually under 48 h</span></div>
    <div class="kpi rise" style="--i:3"><span class="k">${ic("click", "sm")} Clicks · 30 days</span>${counter(clicks)}<span class="d">↑ 18% vs last month</span></div>
    <div class="kpi rise" style="--i:4"><span class="k">${ic("inbox", "sm")} Inquiries</span>${counter(inq)}<span class="d">${inq - 3 > 0 ? "1 new from the Market" : "2 unanswered"}</span></div>
  </div>
  <div class="note rise" style="--i:5">${ic("info", "sm")} Only the marketplace team can publish or mark listings as sponsored. Editing a live listing sends it back for review.</div>
  <div class="tablewrap rise" style="--i:6"><table>
    <thead><tr><th>Listing</th><th>Status</th><th>Price</th><th class="num">Clicks</th><th class="num">Inquiries</th><th></th></tr></thead>
    <tbody>${mine.map((l) => `<tr class="${l.fresh && S.vendor.flash ? "flash" : ""}">
      <td><div class="row"><div class="thumbbox" style="width:40px;height:32px;border-radius:8px">${art(l, "sm")}</div><div style="min-width:0"><b>${esc(l.title)}</b><div class="tiny muted">${esc(cat(l.cat).name)}</div>${l.status === "rejected" ? `<div class="tiny" style="color:var(--bad);max-width:280px">Reviewer: ${esc(l.reason)}</div>` : ""}</div></div></td>
      <td>${statusPill(l.status)}</td><td class="num">${money(l.price)}</td><td class="num">${l.clicks || "—"}</td><td class="num">${l.inquiries || "—"}</td>
      <td style="text-align:right;white-space:nowrap">${l.status === "draft" || l.status === "rejected"
        ? `<button class="btn btn-ghost" style="padding:6px 10px" data-act="vresubmit" data-id="${l.id}">${ic("send", "sm")} ${l.status === "draft" ? "Submit" : "Fix & resubmit"}</button>`
        : l.status === "published" ? `<button class="btn btn-ghost" style="padding:6px 10px" data-act="vedit" data-id="${l.id}">${ic("edit", "sm")} Edit</button>` : `<span class="tiny muted">Waiting for review</span>`}</td>
    </tr>`).join("")}</tbody></table></div>
  <div class="card chart rise" style="--i:7"><div class="row between" style="margin-bottom:6px"><b>Clicks to your website · last 14 days</b><span class="tiny muted">anonymous daily totals</span></div>
    ${barChart(CLICKS_14.map((v) => Math.round(v / 5)), CLICKS_14.map((_, i) => String(13 + i)), { W: 700, H: 170, hl: 13, unit: " clicks" })}</div>`;
};

SCREENS.vnew = () => {
  const st = S.vendor.step;
  const steps = ["Basics", "Details", "Compliance", "Review"];
  const L = NEW_LISTING;
  const pane = [
    `<div class="formgrid">
      <div class="field full"><label for="f-title">Title</label><input class="input" id="f-title" value="${L.title}"></div>
      <div class="field"><label for="f-cat">Category</label><select class="input" id="f-cat">${CATS.map((c) => `<option ${c.id === "events" ? "selected" : ""}>${c.name}</option>`).join("")}</select></div>
      <div class="field"><label for="f-type">Type</label><select class="input" id="f-type"><option>Event</option><option>Program</option><option>Service</option><option>Product</option></select></div>
      <div class="field full"><label for="f-sum">Short summary</label><textarea class="input" id="f-sum">${L.summary}</textarea></div>
      <div class="full"><span class="flabel">Cover image</span><div class="imgdrop" style="margin-top:4px">${S.vendor.uploaded ? `<div class="art g-events">${ic("calendar", "lg")}</div><div><b>cooking-class.jpg</b><div class="tiny muted">1.2 MB · uploaded</div></div>` : `${ic("upload", "lg")}<div style="flex:1"><b>Add a photo</b><div class="tiny muted">PNG, JPG or WebP up to 5 MB</div></div><button class="btn btn-ghost" data-act="vupload">Upload</button>`}</div></div>
    </div>`,
    `<div class="formgrid">
      <div class="field"><label for="f-price">Price (USD)</label><input class="input num" id="f-price" value="25"></div>
      <div class="field"><label for="f-note">Price note</label><input class="input" id="f-note" value="per person"></div>
      <div class="field"><label for="f-when">Date & time</label><input class="input" id="f-when" value="Sat Nov 28, 2026 · 11:00 am ET"></div>
      <div class="field"><label for="f-where">Location</label><input class="input" id="f-where" value="Online (Zoom)"></div>
      <div class="field full"><label for="f-url">Booking link</label><input class="input mono" id="f-url" value="https://greenplate.example/plant-protein-class"></div>
    </div>`,
    `<div class="stack">
      <div class="field"><label for="f-ev">Supporting evidence for any claims</label><textarea class="input" id="f-ev">No health claims. Recipes include full nutrition facts per serving.</textarea></div>
      <div class="field"><label for="f-disc">Disclaimer</label><input class="input" id="f-disc" value="Recipes are for general education, not individual medical advice."></div>
      <div class="lockrow">${ic("lock", "sm")} <span><b>Sponsored placement</b>: set only by the marketplace team.</span></div>
      <div class="lockrow">${ic("lock", "sm")} <span><b>Price verified</b>: checked by a reviewer against your booking page.</span></div>
    </div>`,
    `<div class="row" style="gap:16px;align-items:flex-start;flex-wrap:wrap">
      <div class="lcard" style="width:200px;flex:none;position:relative">${art(L)}<span class="body"><span class="eyebrow">Events & Programs</span><b>${L.title}</b><span class="small muted">GreenPlate Coaching</span><span class="price num">$25 <span class="small muted" style="font-weight:500">per person</span></span></span></div>
      <div class="stack" style="flex:1;min-width:220px">
        <b>Ready to submit</b>
        <div class="flags">${L.flags.map(([k, t]) => `<div class="flag ${k}">${ic(k === "ok" ? "check" : "alert", "sm")} ${t}</div>`).join("")}</div>
        <div class="small muted">After you submit, the marketplace team reviews the listing. You'll see its status change on your dashboard.</div>
      </div>
    </div>`,
  ][st];
  return `
  <div class="rise"><span class="eyebrow">New listing</span><h2>Create a listing</h2></div>
  <div class="stepper rise" style="--i:1">${steps.map((s, i) => `${i ? '<span class="ln"></span>' : ""}<span class="${i <= st ? "on" : ""}"><i>${i < st ? "✓" : i + 1}</i>${s}</span>`).join("")}</div>
  <div class="card rise" style="--i:2;padding:18px">${pane}</div>
  <div class="row between rise" style="--i:3">
    <button class="btn btn-ghost" data-act="vstep" data-n="${st - 1}" ${st === 0 ? "disabled" : ""}>${ic("back", "sm")} Back</button>
    ${st < 3 ? `<button class="btn btn-primary" data-act="vstep" data-n="${st + 1}">Continue ${ic("chev", "sm")}</button>`
      : `<button class="btn btn-primary" data-act="vsubmit" ${listing("gp-plant") ? "disabled" : ""}>${ic("send", "sm")} ${listing("gp-plant") ? "Already submitted" : "Submit for review"}</button>`}
  </div>`;
};

SCREENS.vinbox = () => {
  const mine = [...S.sentInquiries.filter((q) => q.vendor === "greenplate").map((q) => ({ who: "Jordan M.", email: "jordan.m@example.com", listing: q.listing, when: "Just now", msg: q.msg, fresh: true })), ...INQUIRIES];
  return `
  <div class="rise"><span class="eyebrow">Inquiries</span><h2>Questions from app users</h2></div>
  <div class="note rise" style="--i:1">${ic("lock", "sm")} You only receive the name, email and message each person chose to share. No health data from the app is included.</div>
  <div class="card rise" style="--i:2;padding:0">${mine.map((q) => `<div class="inq" ${q.fresh ? 'style="background:var(--citrus-soft)"' : ""}>
    <div class="row between"><b>${esc(q.who)} <span class="small muted" style="font-weight:500">· ${esc(q.email)}</span></b><span class="tiny muted">${q.when}</span></div>
    <span class="tiny muted">About: ${esc(q.listing)}</span><span>${esc(q.msg)}</span>
    <div><button class="btn btn-ghost" style="padding:6px 10px;margin-top:4px" data-act="toast" data-msg="In the live app, replies go out by email">${ic("send", "sm")} Reply by email</button></div>
  </div>`).join("")}</div>`;
};

// ===================== admin console =====================
SCREENS.aqueue = () => {
  const q = S.listings.filter((l) => l.status === "pending");
  if (!q.length) return `<div class="rise"><span class="eyebrow">Review queue</span><h2>All caught up</h2></div>
    <div class="card rise" style="--i:1;text-align:center;padding:40px"><div style="display:inline-grid;place-items:center;width:64px;height:64px;border-radius:50%;background:var(--leaf-soft);color:var(--leaf);animation:pop .6s">${ic("check", "xl")}</div><p class="muted">No listings waiting for review.</p></div>`;
  if (!S.admin.sel || !q.find((l) => l.id === S.admin.sel)) S.admin.sel = q[0].id;
  const l = listing(S.admin.sel);
  const checks = [["claims", "Claims supported by evidence"], ["price", "Pricing verified (or hidden)"], ["disc", "Disclaimers and disclosures present"]];
  if (l.regulated) checks.push(["legal", "Legal & advertising sign-off recorded"]);
  const ok = checks.every(([k]) => S.admin.checks[k]);
  const reasons = l.id === "apex-burn" ? ["Unsupported weight-loss claim", "Missing ingredient list", "Vendor not verified"] : ["Needs clearer pricing", "Missing disclaimer", "Claim needs evidence"];
  return `
  <div class="row between rise" style="flex-wrap:wrap"><div><span class="eyebrow">Review queue</span><h2>${q.length} listing${q.length === 1 ? "" : "s"} waiting</h2></div>
    <span class="small muted">Nothing goes live until a reviewer publishes it.</span></div>
  <div class="split">
    <div class="stack rise" style="--i:1">${q.map((x) => `<button class="qitem" aria-current="${x.id === l.id}" data-act="asel" data-id="${x.id}">
      <div class="row between"><b style="font-size:13.5px">${esc(x.title)}</b>${x.fresh ? `<span class="pill new">New</span>` : ""}</div>
      <span class="tiny muted">${esc(vendorName(x))} · submitted ${x.submitted}</span>
      <span class="row" style="gap:4px">${statusPill("pending")}${x.regulated ? `<span class="pill reg">Regulated</span>` : ""}${x.flags && x.flags.some((f) => f[0] === "bad") ? `<span class="pill st-rejected">${x.flags.filter((f) => f[0] === "bad").length} issues</span>` : ""}</span>
    </button>`).join("")}</div>
    <div class="card stack rise" style="--i:2;padding:18px;gap:14px" id="reviewCard">
      <div class="row" style="align-items:flex-start;gap:14px">
        <div class="thumbbox" style="width:90px;height:70px;border-radius:14px">${art(l)}</div>
        <div style="min-width:0;flex:1"><h3 style="font-size:19px">${esc(l.title)}</h3><div class="small muted">${esc(vendorName(l))} · ${esc(cat(l.cat).name)} · <span class="num">${money(l.price)}</span> ${esc(l.note)}</div>
        <div class="small" style="margin-top:4px">“${esc(l.summary)}”</div></div>
      </div>
      <div><div class="eyebrow" style="margin-bottom:6px">Automatic checks</div><div class="flags">${(l.flags || []).map(([k, t]) => `<div class="flag ${k}">${ic(k === "ok" ? "check" : "alert", "sm")} ${t}</div>`).join("")}</div></div>
      <div><div class="eyebrow" style="margin-bottom:6px">Reviewer checklist</div><div class="checklist">${checks.map(([k, t]) => `<label class="check ${S.admin.checks[k] ? "on" : ""}"><input type="checkbox" id="chk-${k}" data-act="acheck" data-k="${k}" ${S.admin.checks[k] ? "checked" : ""}> ${t}</label>`).join("")}</div></div>
      <div class="row" style="flex-wrap:wrap;gap:8px">
        <button class="btn btn-primary" data-act="apublish" ${ok ? "" : "disabled"}>${ic("check", "sm")} Publish</button>
        <button class="btn btn-ghost" data-act="achanges">Request changes</button>
        <span class="tiny muted">${ok ? "Ready to publish" : "Tick every checklist item to publish"}</span>
      </div>
      <div class="stack" style="gap:6px;border-top:1px solid var(--line);padding-top:12px">
        <span class="flabel">Or reject with a reason the vendor will see</span>
        <div class="reasons">${reasons.map((r) => `<button class="chip" aria-pressed="${S.admin.reason === r}" data-act="areason" data-v="${r}">${r}</button>`).join("")}</div>
        <div><button class="btn btn-danger" data-act="areject" ${S.admin.reason ? "" : "disabled"}>${ic("x", "sm")} Reject</button></div>
      </div>
      <div><div class="eyebrow" style="margin-bottom:8px">History</div><div class="timeline">
        <div><b>Submitted for review</b> <span class="muted">· ${l.submitted} · ${esc(vendorName(l))}</span></div>
        <div><b>Draft created</b> <span class="muted">· ${l.fresh ? "Today" : "Oct 22"}</span></div>
      </div></div>
    </div>
  </div>`;
};

SCREENS.alistings = () => `
  <div class="rise"><span class="eyebrow">All listings</span><h2>${S.listings.length} listings</h2></div>
  <div class="tablewrap rise" style="--i:1"><table><thead><tr><th>Listing</th><th>Business</th><th>Status</th><th>Sponsored</th><th class="num">Clicks</th></tr></thead>
  <tbody>${S.listings.map((l) => `<tr><td><b>${esc(l.title)}</b><div class="tiny muted">${esc(cat(l.cat).name)}</div></td><td>${esc(vendorName(l))}</td><td>${statusPill(l.status)}</td><td>${l.sponsored ? `<span class="pill sponsor">Sponsored</span>` : `<span class="tiny muted">—</span>`}</td><td class="num">${l.clicks || "—"}</td></tr>`).join("")}</tbody></table></div>`;

SCREENS.avendors = () => `
  <div class="rise"><span class="eyebrow">Vendors</span><h2>Business accounts</h2></div>
  <div class="note rise" style="--i:1">${ic("info", "sm")} Businesses apply from the app. They can't create listings until a reviewer approves their credentials.</div>
  <div class="tablewrap rise" style="--i:2"><table><thead><tr><th>Business</th><th>Credentials</th><th>Applied</th><th>Status</th><th></th></tr></thead>
  <tbody>${S.vendors.map((v) => `<tr><td><b>${esc(v.name)}</b><div class="tiny muted">${esc(v.owner)}</div></td><td class="small">${esc(v.creds)}</td><td class="small muted">${v.applied}</td>
    <td><span class="pill ${v.status === "approved" ? "st-published" : v.status === "pending" ? "st-pending" : "st-rejected"}">${v.status[0].toUpperCase() + v.status.slice(1)}</span></td>
    <td style="text-align:right;white-space:nowrap">${v.status === "pending" ? `<button class="btn btn-primary" style="padding:6px 10px" data-act="avendor" data-id="${v.id}" data-v="approved">Approve</button> <button class="btn btn-ghost" style="padding:6px 10px" data-act="avendor" data-id="${v.id}" data-v="declined">Decline</button>` : v.status === "approved" ? `<button class="btn btn-ghost" style="padding:6px 10px" data-act="avendor" data-id="${v.id}" data-v="suspended">Suspend</button>` : `<button class="btn btn-ghost" style="padding:6px 10px" data-act="avendor" data-id="${v.id}" data-v="approved">Reinstate</button>`}</td></tr>`).join("")}</tbody></table></div>`;

SCREENS.abrands = () => `
  <div class="rise"><span class="eyebrow">Brands</span><h2>Featured Partners</h2></div>
  <div class="stack">${Object.entries(BRANDS).map(([id, B], i) => `<div class="card row rise" style="--i:${i + 1};padding:16px;flex-wrap:wrap">
    <div style="width:48px;height:48px;border-radius:14px;background:var(--surface-2);display:grid;place-items:center">${brandLogo(id, 28)}</div>
    <div style="flex:1;min-width:200px"><b style="font-size:16px">${B.name}</b> <span class="pill aff">Affiliated</span><div class="small muted">${B.tagline}</div><div class="tiny muted" style="margin-top:4px">Disclosure: “${B.disclosure}”</div></div>
    <div class="row"><span class="small" style="font-weight:600">Featured in Market</span><button class="toggle" role="switch" aria-checked="${S.featured[id]}" data-act="afeature" data-id="${id}" aria-label="Feature ${B.name}"></button></div>
  </div>`).join("")}</div>
  <div class="note rise" style="--i:3">${ic("info", "sm")} Turn a brand off here and it disappears from the Featured Partners row in the app. Switch to App user to see the change.</div>`;

SCREENS.aanalytics = () => {
  const top = live().slice().sort((a, b) => (b.clicks || 0) - (a.clicks || 0)).slice(0, 6);
  const total = CLICKS_14.reduce((a, b) => a + b, 0);
  return `
  <div class="rise"><span class="eyebrow">Analytics</span><h2>Marketplace performance</h2></div>
  <div class="kpis">
    <div class="kpi rise" style="--i:1"><span class="k">${ic("click", "sm")} Outbound clicks · 14 d</span>${counter(total)}<span class="d">↑ 22% vs prior 14 days</span></div>
    <div class="kpi rise" style="--i:2"><span class="k">${ic("inbox", "sm")} Inquiries · 14 d</span>${counter(61 + S.sentInquiries.length)}<span class="d">all with consent</span></div>
    <div class="kpi rise" style="--i:3"><span class="k">${ic("eye", "sm")} Live listings</span>${counter(live().length)}<span class="d">${S.listings.filter((l) => l.status === "pending").length} in review</span></div>
    <div class="kpi rise" style="--i:4"><span class="k">${ic("users", "sm")} Approved vendors</span>${counter(S.vendors.filter((v) => v.status === "approved").length)}<span class="d">${S.vendors.filter((v) => v.status === "pending").length} applications</span></div>
  </div>
  <div class="card chart rise" style="--i:5"><div class="row between" style="margin-bottom:6px;flex-wrap:wrap"><b>Outbound clicks per day</b><span class="tiny muted">anonymous daily totals · no user IDs</span></div>
    ${barChart(CLICKS_14, CLICKS_14.map((_, i) => "Oct " + (13 + i)).map((s, i) => (i % 2 ? "" : s)), { W: 700, H: 190, hl: 13, unit: " clicks" })}</div>
  <div class="tablewrap rise" style="--i:6"><table><thead><tr><th>Top listings</th><th>Business</th><th class="num">Clicks</th><th>Share</th></tr></thead>
    <tbody>${top.map((l) => `<tr><td><b>${esc(l.title)}</b> ${l.sponsored ? `<span class="pill sponsor">Sponsored</span>` : ""}</td><td>${esc(vendorName(l))}</td><td class="num">${(l.clicks || 0).toLocaleString()}</td>
      <td style="min-width:120px"><div class="goalbar" style="height:7px"><i style="width:${Math.round(((l.clicks || 0) / top[0].clicks) * 100)}%"></i></div></td></tr>`).join("")}</tbody></table></div>`;
};

// ===================== guide rail content =====================
const GUIDE = {
  home: ["Home stays about nutrition", ["Calories, macros, water and the AI coach work exactly as today.", "The coach's advice is labelled “No sponsored content”: it never recommends marketplace products or TriggerMD."], ["Tap the water glasses", "water3"]],
  meals: ["Meals: logging is unchanged", ["Log food by day; totals update the Home ring.", "Marketplace items never appear inside meal plans."], ["Add a dinner", "addDinner"]],
  progress: ["Progress: charts stay private", ["Weight and calorie history drive the user's own charts only.", "None of this data is shared with or used by the Market."], null],
  market: ["Market: the new fifth tab", ["TriggerMD and XIMMD sit in a Featured Partners row with Sponsored and Affiliated labels and a disclosure line.", "Seven categories, search, and the latest reviewed listings.", "Only listings a reviewer has published appear here."], ["Open TriggerMD", "openTmd"]],
  brand: ["Brand page", ["Logo, description, service categories, areas, eligibility and clinical review info.", "The disclosure box explains the affiliation.", "The Visit button leads to the brand's own site. There's no in-app checkout."], ["Tap the Visit button", "visitBrand"]],
  listing: ["Listing detail", ["Price, how it works, ingredients, evidence and disclaimers, shown only when provided.", "Clinical services always show the licensed-third-party notice.", "Providers can be asked a question. Sending requires the user's consent."], null],
  profile: ["Profile & privacy", ["The “Use my health data in the Market” switch is locked off, so it's clear the Market never uses health data.", "Users can see the questions they've sent to providers."], null],
  vdash: ["Vendor portal", ["Approved businesses see their listings, statuses, clicks and inquiries.", "A rejected listing shows the reviewer's reason so the vendor can fix it."], ["Create a new listing", "goNew"]],
  vnew: ["Creating a listing", ["Four steps: basics, details, compliance, review.", "Sponsored placement and price verification are locked for vendors.", "Submitting sends the listing to the review queue, not straight to the Market."], ["Jump to the last step", "lastStep"]],
  vinbox: ["Inquiries", ["Questions arrive with only what the user chose to share.", "In the live app, the vendor also gets an email."], null],
  aqueue: ["Review queue", ["Each listing shows automatic checks and a reviewer checklist.", "Publish stays disabled until every item is ticked. Regulated services also need legal sign-off.", "Rejections carry a reason the vendor sees."], ["Tick all the checks", "tickAll"]],
  alistings: ["All listings", ["Every listing in every status, with sponsorship clearly marked."], null],
  avendors: ["Vendor approvals", ["Businesses can't list anything until their credentials are approved.", "Accounts can be suspended at any time."], null],
  abrands: ["Brand settings", ["Turn TriggerMD or XIMMD on or off in the Featured Partners row.", "Disclosure text is managed here."], null],
  aanalytics: ["Analytics", ["Outbound clicks and inquiries, counted as anonymous daily totals.", "No individual user tracking and no health data."], null],
};

const TOUR = [
  { role: "user", go: () => resetUser("home"), t: "Your nutrition app, unchanged", b: "Home keeps calories, macros, water and the AI coach. The coach is marked “No sponsored content”: paid partners never influence nutrition advice." },
  { role: "user", go: () => resetUser("market"), t: "Meet the Market tab", b: "A fifth tab sits next to Meals and Progress. TriggerMD and XIMMD lead as Featured Partners, clearly labelled Sponsored and Affiliated." },
  { role: "user", go: () => pushUser("brand", { id: "triggermd" }), t: "TriggerMD's brand page", b: "Service areas, 18+ eligibility, how it works, clinical review info and a disclosure. “Visit TriggerMD” takes people to TriggerMD's own site." },
  { role: "user", go: () => pushUser("listing", { id: "xim-greens" }), t: "An XIMMD product", b: "Ingredients, specifications, shipping and refund terms, supporting evidence and the required disclaimer. Purchases happen on ximmd.com." },
  { role: "user", go: () => { resetUser("market"); pushUser("listing", { id: "gp-coaching" }); }, t: "Ask a provider", b: "For dietitians and coaches, users can send a question. They must tick a consent box, and no health data is attached." },
  { role: "vendor", go: () => { S.vendor.s = "vdash"; }, t: "The vendor portal", b: "GreenPlate Coaching, an approved dietitian, manages listings here. One is in review and one was rejected with the reviewer's reason." },
  { role: "vendor", go: () => { S.vendor.s = "vnew"; S.vendor.step = 3; }, t: "Submit a new listing", b: "Press “Submit for review”. The listing goes to the marketplace team. Vendors can't publish or make themselves sponsored." },
  { role: "admin", go: () => { S.admin.s = "aqueue"; }, t: "The review queue", b: "Pick a listing, tick the checklist, then Publish. Try rejecting BurnMax: its weight-loss claim has no evidence." },
  { role: "admin", go: () => { S.admin.s = "aanalytics"; }, t: "Analytics", b: "Clicks and inquiries as anonymous totals: enough to show partners value without tracking anyone's health." },
  { role: "user", go: () => resetUser("market"), t: "Back in the Market", b: "Anything you published now appears here with a “New” badge. The loop is complete: vendor submits, reviewer approves, members see it." },
];

function lifecycle() {
  const l = listing("gp-plant") || listing("gp-workshop");
  const order = ["draft", "pending", "approved", "published"];
  const idx = l.status === "rejected" ? 1 : order.indexOf(l.status);
  return `<div class="pcard life">
    <h3>Listing journey</h3>
    <div class="small muted">Tracking “${esc(l.title)}”</div>
    <div class="track">${["Draft", "In review", "Approved", "Published"].map((n, i) => `<div class="node ${i < idx || (l.status === "published" && i === idx) ? "done" : i === idx ? "cur" : ""}"><i>${i < idx || l.status === "published" ? "✓" : i + 1}</i>${n}</div>`).join("")}</div>
    ${l.status === "rejected" ? `<div class="flag bad">${ic("x", "sm")} Rejected: ${esc(l.reason)}</div>` : ""}
    <div class="tiny muted">${l.status === "published" ? "Live in the Market now." : l.status === "rejected" ? "The vendor sees the reason and can resubmit." : l.id === "gp-plant" ? "Waiting for a reviewer in Admin → Review queue." : "Submit a new listing as Vendor to watch it move."}</div>
  </div>`;
}

function renderPanel() {
  const s = curScreen();
  const g = GUIDE[s] || ["", [], null];
  const tour = S.tour !== null ? TOUR[S.tour] : null;
  $("#panel").innerHTML = `
    ${tour ? `<div class="pcard tour" style="animation:fadeUp .4s">
      <div class="row between"><span class="eyebrow" style="color:inherit;opacity:.7">Guided tour · ${S.tour + 1} of ${TOUR.length}</span><button class="link" style="color:inherit" data-act="tourEnd">Exit</button></div>
      <div class="bar"><i style="width:${((S.tour + 1) / TOUR.length) * 100}%"></i></div>
      <h2>${tour.t}</h2><p style="margin:0" class="muted">${tour.b}</p>
      <div class="row between"><button class="btn btn-ghost" data-act="tourPrev" ${S.tour === 0 ? "disabled" : ""}>${ic("back", "sm")} Back</button>
        ${S.tour < TOUR.length - 1 ? `<button class="btn btn-citrus" data-act="tourNext">Next ${ic("chev", "sm")}</button>` : `<button class="btn btn-citrus" data-act="tourEnd">Finish</button>`}</div>
    </div>` : ""}
    <div class="pcard" style="animation:fadeUp .4s">
      <span class="eyebrow">${{ user: "App user view", vendor: "Vendor view", admin: "Admin view" }[S.role]}</span>
      <h2>${g[0]}</h2>
      <ul>${g[1].map((x) => `<li>${x}</li>`).join("")}</ul>
      ${g[2] ? `<button class="btn btn-ghost trybtn" data-act="try" data-v="${g[2][1]}">${ic("play", "sm")} Try it: ${g[2][0]}</button>` : ""}
    </div>
    ${lifecycle()}
    <div class="pcard">
      <h3>Built-in guardrails</h3>
      <div class="guards">
        <div>${ic("lock", "sm")} Health, meal and weight data never choose or rank listings</div>
        <div>${ic("star", "sm")} Sponsored and affiliated items are always labelled</div>
        <div>${ic("shield", "sm")} Nothing goes live without a reviewer</div>
        <div>${ic("message", "sm")} Questions to providers need the user's consent</div>
        <div>${ic("click", "sm")} Clicks are counted anonymously</div>
        <div>${ic("pkg", "sm")} No in-app checkout and no prescription storefront</div>
      </div>
    </div>
    <p class="mockflag">Mockup for review. All people, prices and numbers are sample data. TriggerMD and XIMMD details are placeholders until verified content is supplied.</p>`;
}

// ===================== navigation & render =====================
function curScreen() { return S.role === "user" ? S.user.stack.at(-1).s : S[S.role].s; }
function resetUser(s) { S.user.stack = [{ s }]; S.dir = "fade"; }
function pushUser(s, p = {}) { S.user.stack.push({ s, ...p }); S.dir = "fwd"; }

const URLS = { vdash: "vendor", vnew: "vendor/listings/new", vinbox: "vendor/inquiries", aqueue: "admin/marketplace/review", alistings: "admin/marketplace/listings", avendors: "admin/marketplace/vendors", abrands: "admin/marketplace/brands", aanalytics: "admin/marketplace/analytics" };

function render(keepScroll = false) {
  const frame = $("#frame");
  frame.className = "frame " + (S.role === "user" ? "phone" : "browser");
  const s = curScreen();
  const screen = $("#screen");
  const top = screen.scrollTop;
  // In-place updates (keepScroll) skip entry animations so the screen doesn't replay.
  screen.classList.toggle("calm", keepScroll);
  if (S.role === "user") {
    const p = S.user.stack.at(-1);
    screen.innerHTML = `<div class="view ${S.dir}">${SCREENS[s](p)}</div>`;
  } else {
    screen.innerHTML = consoleShell(S.role, SCREENS[s]());
  }
  $("#url").innerHTML = `${ic("lock", "sm")} app.yournutrition.com/${URLS[s] || ""}`;
  const tabs = [["home", "Home", "home"], ["meals", "Meals", "meals"], ["progress", "Progress", "progress"], ["market", "Market", "market"], ["profile", "Profile", "profile"]];
  const rootTab = S.user.stack[0].s;
  const hasNew = listing("gp-plant")?.status === "published" && !S.seenNew;
  $("#tabbar").innerHTML = tabs.map(([k, l, i]) => `<button data-act="tab" data-s="${k}" aria-current="${rootTab === k ? "page" : "false"}">${ic(i)}${l}${k === "market" && hasNew && rootTab !== "market" ? '<span class="newdot">New</span>' : ""}</button>`).join("");
  renderOverlay();
  renderPanel();
  renderSeg();
  if (keepScroll) screen.scrollTop = top; else screen.scrollTop = 0;
  S.dir = "fade";
  if (!keepScroll) animateCounters();
  const qi = $("#q");
  if (qi && S.focusQ) { qi.focus(); qi.setSelectionRange(qi.value.length, qi.value.length); S.focusQ = false; }
}

function renderSeg() {
  ["user", "vendor", "admin"].forEach((r) => $("#r-" + r).setAttribute("aria-pressed", S.role === r));
  const b = $("#r-" + S.role), th = $("#segThumb");
  th.style.left = b.offsetLeft + "px"; th.style.width = b.offsetWidth + "px";
}

function animateCounters() {
  document.querySelectorAll("[data-count]").forEach((el) => {
    const to = +el.dataset.count, pre = el.dataset.prefix || "";
    if (reduced || to < 2) return;
    const t0 = performance.now(), d = 900;
    const tick = (t) => { const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3); el.textContent = pre + Math.round(to * e).toLocaleString("en-US"); if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
}

function toast(msg, icon = "check") {
  const t = document.createElement("div");
  t.className = "toast"; t.innerHTML = ic(icon, "sm") + `<span>${msg}</span>`;
  $("#toasts").appendChild(t);
  setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 400); }, 2800);
}

// ===================== overlays =====================
function renderOverlay() {
  const o = S.overlay, el = $("#overlay");
  if (!o) { el.innerHTML = ""; return; }
  let body = "";
  if (o.kind === "addMeal") {
    body = `<h3>Add to dinner</h3><div class="small muted">Quick picks based on your usual meals</div>
      <div class="quick">${FOODS.map((f, i) => `<button data-act="addFood" data-i="${i}"><div class="art ${f.g}">${ic(f.icon)}</div><div><b>${f.name}</b><div class="tiny muted num">P ${f.p} g · C ${f.c} g · F ${f.f} g</div></div><span class="num" style="font-weight:700">${f.kcal}</span></button>`).join("")}</div>
      <button class="btn btn-ghost block" data-act="close">Cancel</button>`;
  } else if (o.kind === "visit") {
    const B = o.brand ? BRANDS[o.brand] : null;
    const l = o.id ? listing(o.id) : null;
    const site = B ? B.site : l.vendor === "greenplate" ? "greenplate.example" : (vendorName(l).toLowerCase().replace(/[^a-z]/g, "") + ".example");
    const campaign = l ? l.id : o.brand;
    body = `<div style="display:grid;place-items:center;width:56px;height:56px;border-radius:18px;background:var(--leaf-soft);color:var(--leaf);animation:pop .5s">${ic("external", "lg")}</div>
      <h3>You're leaving the app</h3>
      <p class="small" style="margin:0;color:var(--ink-2)">Opening <b>${site}</b> in a new tab. Purchases and bookings happen there, not in the app.</p>
      <div class="utm">https://${site}/?<b>utm_source=nutrition-app</b>&amp;<b>utm_medium=marketplace</b>&amp;<b>utm_campaign=${campaign}</b></div>
      <div class="note">${ic("lock", "sm")} The link tells ${B ? B.name : "the business"} the visit came from the Market. Your name and health data are never included. We count the click anonymously.</div>
      <button class="btn btn-primary block" data-act="visitGo">Continue to ${site} ${ic("external", "sm")}</button>
      <button class="btn btn-ghost block" data-act="close">Stay in the app</button>`;
  } else if (o.kind === "ask") {
    const l = listing(o.id);
    body = `<h3>Ask ${esc(vendorName(l))}</h3><div class="small muted">About “${esc(l.title)}”</div>
      <div class="field"><label for="a-name">Your name</label><input class="input" id="a-name" value="Jordan Miles"></div>
      <div class="field"><label for="a-email">Email</label><input class="input" id="a-email" type="email" value="jordan.m@example.com"></div>
      <div class="field"><label for="a-msg">Message</label><textarea class="input" id="a-msg" maxlength="2000">Hi! Do you offer evening sessions? I work until 6pm ET.</textarea></div>
      <label class="check"><input type="checkbox" id="a-consent" ${o.consent ? "checked" : ""} data-act="consent"> I agree to share my name, email and message with this business. No meal, weight or health data is included.</label>
      <button class="btn btn-primary block" data-act="sendAsk" ${o.consent ? "" : "disabled"} id="sendAsk">${ic("send", "sm")} Send question</button>
      <button class="btn btn-ghost block" data-act="close">Cancel</button>`;
  }
  el.innerHTML = `<div class="scrim" data-act="close"></div><div class="sheet" role="dialog" aria-modal="true">${body}</div>`;
}

// ===================== actions =====================
const A = {
  role: (d) => {
    if (S.role === d.v) return;
    S.role = d.v; S.overlay = null; S.dir = "fade";
    if (d.v === "vendor" && S.tour === null) S.vendor.s = "vdash";
    render();
  },
  tab: (d) => { resetUser(d.s); render(); },
  open: (d) => { pushUser(d.s, { id: d.id }); render(); },
  back: () => { if (S.user.stack.length > 1) S.user.stack.pop(); S.dir = "back"; render(); },
  water: (d) => { const n = +d.n; S.water = S.water === n ? n - 1 : n; S.justWater = true; render(true); S.justWater = false; if (S.water === 8) toast("Water goal reached", "drop"); },
  day: (d) => { S.day = +d.n; render(true); },
  addMeal: () => { S.overlay = { kind: "addMeal" }; renderOverlay(); },
  addFood: (d) => {
    const f = FOODS[+d.i]; S.meals.Dinner.push(clone(f)); S.overlay = null;
    render(true); toast(`${f.name} added · ${f.kcal} kcal`);
  },
  close: () => { S.overlay = null; renderOverlay(); },
  cat: (d) => { S.marketCat = d.v; render(true); },
  visit: (d) => { S.overlay = { kind: "visit", id: d.id, brand: d.brand }; renderOverlay(); },
  visitGo: () => { const o = S.overlay; const l = o.id && listing(o.id); if (l) l.clicks = (l.clicks || 0) + 1; S.overlay = null; renderOverlay(); toast("Mockup: the live app opens the partner site in a new tab", "external"); },
  ask: (d) => { S.overlay = { kind: "ask", id: d.id, consent: false }; renderOverlay(); },
  consent: (d, el) => { S.overlay.consent = el.checked; $("#sendAsk").disabled = !el.checked; },
  sendAsk: () => {
    const l = listing(S.overlay.id);
    const msg = $("#a-msg").value.trim() || "(no message)";
    S.sentInquiries.unshift({ to: vendorName(l), listing: l.title, vendor: l.vendor, msg });
    if (l.vendor === "greenplate") l.inquiries = (l.inquiries || 0) + 1;
    S.overlay = null; renderOverlay(); toast(`Sent to ${esc(vendorName(l))}`, "send");
  },
  flip: (d, el) => { el.setAttribute("aria-checked", el.getAttribute("aria-checked") !== "true"); },
  toast: (d) => toast(d.msg, "info"),
  cnav: (d) => { S[S.role].s = d.s; render(); },
  vupload: () => { S.vendor.uploaded = true; render(true); toast("Image uploaded", "upload"); },
  vstep: (d) => { S.vendor.step = Math.max(0, Math.min(3, +d.n)); render(true); },
  vsubmit: () => {
    if (listing("gp-plant")) return;
    S.listings.splice(S.listings.findIndex((l) => l.vendor === "greenplate"), 0, clone(NEW_LISTING));
    S.vendor.s = "vdash"; S.vendor.step = 0; S.vendor.flash = true;
    render(); S.vendor.flash = false;
    toast("Submitted for review. Switch to Admin to approve it", "send");
  },
  vresubmit: (d) => { const l = listing(d.id); l.status = "pending"; l.submitted = "Today"; l.flags = [["ok", "Vendor is a verified Registered Dietitian"], ["warn", l.reason ? "Previously rejected: check the fix" : "First submission"]]; render(true); toast("Sent to the review queue", "send"); },
  vedit: (d) => { const l = listing(d.id); l.status = "pending"; l.submitted = "Today"; l.flags = [["warn", "Edited while live: back in review"], ["ok", "Vendor is a verified Registered Dietitian"]]; render(true); toast("Edits saved. The listing is back in review and hidden until approved", "info"); },
  asel: (d) => { S.admin.sel = d.id; S.admin.checks = {}; S.admin.reason = ""; render(true); },
  acheck: (d, el) => { S.admin.checks[d.k] = el.checked; render(true); },
  areason: (d) => { S.admin.reason = S.admin.reason === d.v ? "" : d.v; render(true); },
  apublish: () => {
    const l = listing(S.admin.sel); l.status = "published"; l.flags = null;
    if (l.fresh) S.seenNew = false;
    S.admin.sel = null; S.admin.checks = {}; S.admin.reason = "";
    render(true); toast(`Published: “${esc(l.title)}” is live in the Market`, "check");
  },
  areject: () => {
    const l = listing(S.admin.sel); l.status = "rejected"; l.reason = S.admin.reason + ".";
    S.admin.sel = null; S.admin.checks = {}; S.admin.reason = "";
    render(true); toast(`Rejected. ${esc(vendorName(l))} will see the reason`, "x");
  },
  achanges: () => {
    const l = listing(S.admin.sel); l.status = "draft";
    S.admin.sel = null; S.admin.checks = {}; S.admin.reason = "";
    render(true); toast("Sent back to the vendor as a draft", "edit");
  },
  avendor: (d) => { const v = S.vendors.find((x) => x.id === d.id); v.status = d.v; render(true); toast(`${esc(v.name)}: ${d.v}`, d.v === "approved" ? "check" : "info"); },
  afeature: (d) => { S.featured[d.id] = !S.featured[d.id]; render(true); toast(`${BRANDS[d.id].name} ${S.featured[d.id] ? "is featured" : "removed from Featured Partners"}`, "star"); },
  try: (d) => TRY[d.v](),
  tourStart: () => { S.tour = 0; runTour(); },
  tourNext: () => { S.tour = Math.min(TOUR.length - 1, S.tour + 1); runTour(); },
  tourPrev: () => { S.tour = Math.max(0, S.tour - 1); runTour(); },
  tourEnd: () => { S.tour = null; render(true); },
  reset: () => { const t = S.tour; S = fresh(); S.tour = t; render(); toast("Sample data reset", "rotate"); },
};

const TRY = {
  water3: () => { S.role = "user"; resetUser("home"); S.water = Math.min(8, S.water + 1); render(); toast("Logged a glass of water", "drop"); },
  addDinner: () => { S.role = "user"; resetUser("meals"); render(); A.addMeal(); },
  openTmd: () => { S.role = "user"; resetUser("market"); pushUser("brand", { id: "triggermd" }); render(); },
  visitBrand: () => { const p = S.user.stack.at(-1); A.visit({ brand: p.id }); },
  goNew: () => { S.vendor.s = "vnew"; S.vendor.step = 0; render(); },
  lastStep: () => { S.vendor.step = 3; render(); },
  tickAll: () => { const l = listing(S.admin.sel); if (!l) return; ["claims", "price", "disc", "legal"].forEach((k) => (S.admin.checks[k] = true)); render(true); toast("Checklist complete: Publish is enabled", "list"); },
};

function runTour() {
  const step = TOUR[S.tour];
  S.overlay = null; S.role = step.role; step.go(); render();
}

// ===================== events =====================
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]");
  if (!el || el.disabled) return;
  if (el.tagName === "INPUT") return; // checkboxes handled on change
  const fn = A[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el.dataset, el); }
});
document.addEventListener("change", (e) => {
  const el = e.target.closest("input[data-act]");
  if (el && A[el.dataset.act]) A[el.dataset.act](el.dataset, el);
});
document.addEventListener("input", (e) => {
  if (e.target.id === "q") { S.q = e.target.value; S.focusQ = true; render(true); }
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && S.overlay) A.close(); });
addEventListener("resize", renderSeg);

// ===================== boot =====================
$("#markIcon").innerHTML = ICONS.leaf;
$("#sig").innerHTML = ic("zap", "sm");
$("#tourBtn").innerHTML = ic("play", "sm") + " Guided tour";
$("#resetBtn").innerHTML = ic("rotate", "sm") + " Reset";
render();
document.fonts && document.fonts.ready.then(renderSeg);

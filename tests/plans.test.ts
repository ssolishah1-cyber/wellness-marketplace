import { describe, expect, it } from "vitest";
import { ALL_PRODUCT_IDS, COMMISSION_USD, PLANS, perMonth, productId, termPrice } from "@/lib/plans";
import { access, computeAccess, isLive, type Subscription } from "@/lib/access";
import { setDemoPersona } from "@/lib/demoApi";
import { DEMO_USERS } from "@/lib/demoData";

const days = (n: number) => new Date(Date.now() + n * 86400e3).toISOString();
const sub = (plan: Subscription["plan"], status: Subscription["status"] = "active", end = days(10)): Subscription =>
  ({ plan, term_months: 1, status, store: "app_store", current_period_end: end });

describe("plan prices (Ben's Nov 2 pricing)", () => {
  it("charges $9.99 / $19.99 / $29.99 a month", () => {
    expect(PLANS.map((p) => [p.id, p.monthly])).toEqual([["starter_nutrition", 9.99], ["starter_fitness", 9.99], ["visionary", 19.99], ["max", 29.99]]);
  });
  it("discounts 3/6/12 months by 20/40/50%, rounded up to .99", () => {
    expect([3, 6, 12].map((m) => termPrice(9.99, m as 3))).toEqual([23.99, 35.99, 59.99]);
    expect([3, 6, 12].map((m) => termPrice(19.99, m as 3))).toEqual([47.99, 71.99, 119.99]);
    expect([3, 6, 12].map((m) => termPrice(29.99, m as 3))).toEqual([71.99, 107.99, 179.99]);
    expect(perMonth(29.99, 12)).toBe(15);
  });
  it("has one store product per plan and term", () => {
    expect(ALL_PRODUCT_IDS).toHaveLength(16);
    expect(productId("max", 12)).toBe("fitologika_max_12m");
    expect(ALL_PRODUCT_IDS.every((id) => /^fitologika_(starter_nutrition|starter_fitness|visionary|max)_(1|3|6|12)m$/.test(id))).toBe(true);
  });
  it("pays commission of $0.50 / $0.75 / $1.00", () => {
    expect(COMMISSION_USD).toEqual({ starter_nutrition: 0.5, starter_fitness: 0.5, visionary: 0.75, max: 1 });
  });
});

describe("who can use what", () => {
  it("unlocks everything while payments are off, and for staff", () => {
    expect(computeAccess({ paywall: false, staff: false, sub: null }).locked).toBe(false);
    expect([...computeAccess({ paywall: true, staff: true, sub: null }).features]).toHaveLength(3);
  });
  it("gives each plan its features", () => {
    const f = (s: Subscription | null) => [...computeAccess({ paywall: true, staff: false, sub: s }).features].sort();
    expect(f(null)).toEqual([]);
    expect(f(sub("starter_nutrition"))).toEqual(["nutrition"]);
    expect(f(sub("starter_fitness"))).toEqual(["fitness"]);
    expect(f(sub("visionary", "trialing"))).toEqual(["fitness", "nutrition"]);
    expect(f(sub("max", "canceled"))).toEqual(["education", "fitness", "nutrition"]); // until the period ends
    expect(f(sub("max", "active", days(-1)))).toEqual([]);
    expect(f(sub("max", "expired"))).toEqual([]);
  });
  it("trusts the store right after purchase, before the server catches up", () => {
    expect([...computeAccess({ paywall: true, staff: false, sub: null, storeEntitlements: ["fitness", "bogus"] }).features]).toEqual(["fitness"]);
    expect(isLive(sub("visionary", "past_due"))).toBe(true);
  });
});

describe("subscriptions admin (demo)", () => {
  it("switches payments, counts subscribers and commission, and ships books", async () => {
    setDemoPersona("member");
    await expect(access.setPaywall(true)).rejects.toThrow(/Admins only/);
    setDemoPersona("admin");
    await access.setPaywall(true);
    expect(await access.paywallEnabled()).toBe(true);
    await access.grant(DEMO_USERS.vendor.id, "max", 12);
    let s = await access.stats();
    expect(s).toMatchObject({ paywall_enabled: true, paying: 1, trialing: 1, commission_month_usd: 1 });
    setDemoPersona("member"); // in a Visionary trial: no free book yet
    await expect(access.claimBook({ full_name: "Jordan", address_line1: "1 Main St", city: "Austin", region: "TX", postal_code: "73301", country: "United States" })).rejects.toThrow(/paid Max/);
    setDemoPersona("vendor");
    await access.claimBook({ full_name: "Maya", address_line1: "1 Main St", city: "Austin", region: "TX", postal_code: "73301", country: "United States" });
    setDemoPersona("admin");
    s = await access.stats();
    expect(s.book_claims_waiting).toBe(1);
    await access.markShipped(DEMO_USERS.vendor.id);
    expect((await access.stats()).book_claims_waiting).toBe(0);
    await access.setPaywall(false);
  });
});

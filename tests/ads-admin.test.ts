import { beforeEach, describe, expect, it } from "vitest";
import { demoApi as api, setDemoPersona } from "@/lib/demoApi";
import { admin } from "@/lib/admin";
import { toCsv } from "@/pages/admin/ClientDetail";

describe("Market ads", () => {
  beforeEach(() => setDemoPersona("admin"));

  it("shows only live ads, with public fields only", async () => {
    setDemoPersona("visitor");
    const live = await api.listLiveAds();
    expect(live.map((a) => a.kind).sort()).toEqual(["category_sponsor", "featured_listing", "home_banner"]);
    expect(Object.keys(live[0])).not.toContain("price_cents");
    expect(Object.keys(live[0])).not.toContain("payment_status");
    expect(live.find((a) => a.kind === "featured_listing")!.listing_slug).toBeTruthy();
  });

  it("hides paused, scheduled, ended and unpublished-listing ads", async () => {
    const base = { kind: "home_banner" as const, advertiser: "Test", image_url: "https://img.example/a.jpg", link_url: "https://example.com" };
    const paused = await api.saveAd({ ...base, title: "Paused", is_active: false });
    const future = await api.saveAd({ ...base, title: "Future", starts_at: new Date(Date.now() + 86400e3).toISOString() });
    const ended = await api.saveAd({ ...base, title: "Ended", starts_at: new Date(Date.now() - 2 * 86400e3).toISOString(), ends_at: new Date(Date.now() - 86400e3).toISOString() });
    const draft = await api.saveAd({ kind: "featured_listing", title: "Draft listing", advertiser: "Test", listing_id: "l-gp-draft" });
    const live = (await api.listLiveAds()).map((a) => a.id);
    for (const a of [paused, future, ended, draft]) expect(live).not.toContain(a.id);
    const ok = await api.saveAd({ ...base, title: "Live now" });
    expect((await api.listLiveAds()).map((a) => a.id)).toContain(ok.id);
  });

  it("validates ads before saving", async () => {
    await expect(api.saveAd({ kind: "home_banner", title: "No image", advertiser: "X", link_url: "https://x.com" })).rejects.toThrow(/image/);
    await expect(api.saveAd({ kind: "featured_listing", title: "No listing", advertiser: "X", link_url: "https://x.com" })).rejects.toThrow(/listing/);
    await expect(api.saveAd({ kind: "category_sponsor", title: "No category", advertiser: "X", link_url: "https://x.com" })).rejects.toThrow(/category/);
    await expect(api.saveAd({ kind: "category_sponsor", title: "JS", advertiser: "X", category_id: "cat-fitness", link_url: "javascript:alert(1)" })).rejects.toThrow(/https/);
    await expect(api.saveAd({ kind: "category_sponsor", title: "Nowhere", advertiser: "X", category_id: "cat-fitness" })).rejects.toThrow(/where the ad goes/);
  });

  it("counts views and clicks only for live ads, and only staff manage ads", async () => {
    const [ad] = await api.listLiveAds();
    const before = (await api.listAdStats()).filter((s) => s.ad_id === ad.id).reduce((n, s) => n + s.clicks, 0);
    setDemoPersona("visitor");
    await api.recordAdEvent(ad.id, "click");
    await expect(api.listAds()).rejects.toThrow();
    await expect(api.saveAd({ kind: "home_banner", title: "x", advertiser: "x", image_url: "https://a.b/c.jpg", link_url: "https://a.b" })).rejects.toThrow();
    setDemoPersona("admin");
    const after = (await api.listAdStats()).filter((s) => s.ad_id === ad.id).reduce((n, s) => n + s.clicks, 0);
    expect(after).toBe(before + 1);
  });
});

describe("categories and brands", () => {
  beforeEach(() => setDemoPersona("admin"));
  it("adds, hides and reorders categories", async () => {
    const c = await api.saveCategory({ name: "Mental Wellness", description: "Mindfulness and sleep", icon: "moon" });
    expect((await api.listCategories()).some((x) => x.id === c.id)).toBe(true);
    await api.saveCategory({ id: c.id, name: c.name, is_active: false });
    expect((await api.listCategories()).some((x) => x.id === c.id)).toBe(false);
    expect((await api.listAllCategories()).some((x) => x.id === c.id)).toBe(true);
    await expect(api.saveCategory({ name: "Mental Wellness" })).rejects.toThrow(/already exists/);
  });
  it("creates brands, staff only", async () => {
    const b = await api.createBrand({ name: "Calm Co", website_url: "https://calm.example" });
    expect((await api.listBrands()).some((x) => x.id === b.id)).toBe(true);
    setDemoPersona("member");
    await expect(api.createBrand({ name: "Sneaky" })).rejects.toThrow();
  });
});

describe("admin client view", () => {
  it("opens a client's full record and logs the view", async () => {
    setDemoPersona("admin");
    const [jordan] = await admin.listUsers("member@");
    const d = await admin.clientDetail(jordan.user_id);
    expect(d.account.email).toBe("member@example.com");
    expect(d.food.length).toBeGreaterThan(5);
    expect(d.profile?.conditions).toEqual(["diabetes", "focus"]);
    expect((await admin.auditLog())[0]).toMatchObject({ action: "view_client", target_user_id: jordan.user_id });
    setDemoPersona("member");
    await expect(admin.clientDetail(jordan.user_id)).rejects.toThrow(/Admins only/);
  });
});

describe("CSV export", () => {
  it("quotes values and blocks spreadsheet formulas", () => {
    const csv = toCsv([{ name: 'Ann "A", B', note: "=HYPERLINK(1)", tags: ["a", "b"], empty: null }]);
    expect(csv.split("\n")[0]).toBe("name,note,tags,empty");
    expect(csv).toContain('"Ann ""A"", B"');
    expect(csv).toContain(`"'=HYPERLINK(1)"`);
    expect(csv).toContain('"a; b"');
  });
});

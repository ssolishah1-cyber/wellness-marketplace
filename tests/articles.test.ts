import { describe, expect, it } from "vitest";
import { articles, nextSlots, readMinutes, slugifyTitle } from "@/lib/articles";
import { admin } from "@/lib/admin";
import { setDemoPersona } from "@/lib/demoApi";

describe("article schedule helpers", () => {
  it("gives the next Tuesdays and Fridays at 10:00", () => {
    const slots = nextSlots(4, new Date(2026, 9, 30, 12)); // Fri 30 Oct, after 10:00
    expect(slots.map((d) => [d.getDay(), d.getDate(), d.getHours()])).toEqual([[2, 3, 10], [5, 6, 10], [2, 10, 10], [5, 13, 10]]);
    expect(nextSlots(1, new Date(2026, 10, 3, 9))[0].getDate()).toBe(3); // Tue before 10:00 counts
  });
  it("estimates reading time and makes clean slugs", () => {
    expect(readMinutes("word ".repeat(660))).toBe(3);
    expect(readMinutes("")).toBe(1);
    expect(slugifyTitle("Salt: where it hides & how to cut back!")).toBe("salt-where-it-hides-how-to-cut-back");
  });
});

describe("articles (demo)", () => {
  it("shows only published articles whose date has passed", async () => {
    setDemoPersona("visitor");
    const live = await articles.listPublished();
    expect(live.map((a) => a.slug)).toEqual(["balanced-plate-4-steps"]);
    expect(await articles.getPublished("where-salt-hides")).toBeNull(); // scheduled for later
  });
  it("lets staff write, schedule and delete; others can't", async () => {
    setDemoPersona("member");
    await expect(articles.save({ title: "Sneaky post", is_published: true })).rejects.toThrow(/staff/);
    setDemoPersona("admin");
    const a = await articles.save({ title: "Hydration basics", body: "Drink water.", is_published: true, publish_at: new Date(Date.now() - 1000).toISOString() });
    expect((await articles.listPublished()).some((x) => x.id === a.id)).toBe(true);
    const draft = await articles.save({ title: "Draft idea", body: "Later" });
    expect((await articles.listPublished()).some((x) => x.id === draft.id)).toBe(false);
    await articles.recordRead(a.id);
    expect((await articles.stats()).find((s) => s.article_id === a.id)?.reads).toBe(1);
    await articles.remove(a.id);
    expect((await articles.listAll()).some((x) => x.id === a.id)).toBe(false);
  });
});

describe("access invites (demo)", () => {
  it("grants existing users now and holds new emails until sign-up", async () => {
    setDemoPersona("admin");
    expect(await admin.invite("Jamie@Example.com", "reviewer")).toBe("granted");
    expect((await admin.listUsers("jamie"))[0].roles).toContain("reviewer");
    expect(await admin.invite("bniben60@gmail.com", "admin")).toBe("invited");
    expect(await admin.listInvites()).toEqual([expect.objectContaining({ email: "bniben60@gmail.com", role: "admin" })]);
    await admin.cancelInvite("bniben60@gmail.com");
    expect(await admin.listInvites()).toEqual([]);
    await expect(admin.invite("not-an-email", "admin")).rejects.toThrow(/valid email/);
    setDemoPersona("member");
    await expect(admin.invite("x@y.com", "admin")).rejects.toThrow(/Admins only/);
  });
});

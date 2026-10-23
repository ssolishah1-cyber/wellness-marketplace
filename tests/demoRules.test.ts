import { beforeEach, describe, expect, it } from "vitest";
import { demoApi as api, setDemoPersona } from "@/lib/demoApi";

// The demo store must apply the same rules as the database triggers/RLS.
describe("marketplace rules (demo store)", () => {
  beforeEach(() => setDemoPersona("vendor"));

  it("vendor cannot publish or mark a listing sponsored", async () => {
    const l = await api.saveListing({
      title: "Test", category_id: "cat-fitness", vendor_id: "vendor-greenplate", status: "published", is_sponsored: true,
    });
    expect(l.status).toBe("draft");
    expect(l.is_sponsored).toBe(false);
    await expect(api.saveListing({ id: l.id, title: "Test", category_id: "cat-fitness", status: "approved" }))
      .rejects.toThrow(/reviewers/);
  });

  it("vendor edit of a live listing goes back to review and disappears publicly", async () => {
    const before = await api.listPublishedListings();
    expect(before.some((l) => l.id === "l-gp-guide")).toBe(true);
    const l = await api.saveListing({ id: "l-gp-guide", title: "Meal-prep v2", category_id: "cat-books-education" });
    expect(l.status).toBe("pending_review");
    setDemoPersona("visitor");
    expect((await api.listPublishedListings()).some((x) => x.id === "l-gp-guide")).toBe(false);
  });

  it("vendor cannot edit another vendor's listing", async () => {
    await expect(api.saveListing({ id: "l-tmd-consult", title: "Hijack", category_id: "cat-telehealth" })).rejects.toThrow();
  });

  it("only staff can change status; changes are logged", async () => {
    await expect(api.setListingStatus("l-gp-workshop", "published")).rejects.toThrow();
    setDemoPersona("admin");
    await api.setListingStatus("l-gp-workshop", "published");
    const history = await api.listReviews("l-gp-workshop");
    expect(history[0]).toMatchObject({ from_status: "pending_review", to_status: "published" });
  });

  it("inquiries require sign-in and consent", async () => {
    setDemoPersona("visitor");
    const base = { listing_id: "l-fit-app", contact_name: "A", contact_email: "a@x.com", message: "hi" };
    await expect(api.sendInquiry({ ...base, consent_to_share: true })).rejects.toThrow(/sign in/);
    setDemoPersona("member");
    await expect(api.sendInquiry({ ...base, consent_to_share: false })).rejects.toThrow(/Consent/);
    await api.sendInquiry({ ...base, consent_to_share: true });
  });

  it("drafts are never public", async () => {
    setDemoPersona("visitor");
    expect(await api.getListing("greenplate-family-plan")).toBeNull();
  });
});

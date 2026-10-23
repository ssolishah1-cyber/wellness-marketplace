import { describe, expect, it } from "vitest";
import { isSafeHttpUrl, withUtm } from "@/lib/outbound";

describe("withUtm", () => {
  it("adds campaign tags without user data", () => {
    const u = new URL(withUtm("https://triggermd.example/start", "triggermd-consult", "listing"));
    expect(u.searchParams.get("utm_source")).toBe("nutrition-app");
    expect(u.searchParams.get("utm_medium")).toBe("marketplace");
    expect(u.searchParams.get("utm_campaign")).toBe("triggermd-consult");
    expect(u.searchParams.get("utm_content")).toBe("listing");
    expect([...u.searchParams.keys()].sort()).toEqual(["utm_campaign", "utm_content", "utm_medium", "utm_source"]);
  });

  it("keeps existing query params and never overrides partner-set tags", () => {
    const u = new URL(withUtm("https://ximmd.example/p?id=7&utm_source=partner", "kit"));
    expect(u.searchParams.get("id")).toBe("7");
    expect(u.searchParams.get("utm_source")).toBe("partner");
  });

  it("leaves non-http and invalid links untouched", () => {
    expect(withUtm("javascript:alert(1)", "x")).toBe("javascript:alert(1)");
    expect(withUtm("not a url", "x")).toBe("not a url");
  });
});

describe("isSafeHttpUrl", () => {
  it("accepts only http(s)", () => {
    expect(isSafeHttpUrl("https://a.com")).toBe(true);
    expect(isSafeHttpUrl("http://a.com")).toBe(true);
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("data:text/html,hi")).toBe(false);
    expect(isSafeHttpUrl(null)).toBe(false);
  });
});

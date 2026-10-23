// Adds campaign tags to links leaving the app so TriggerMD, XIMMD and partner
// sites can attribute marketplace traffic. Only listing/brand identifiers are
// added; nothing about the user is ever put in the URL.

export const UTM_SOURCE = (import.meta.env.VITE_UTM_SOURCE as string | undefined) || "nutrition-app";

export function withUtm(url: string, campaign: string, content?: string): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return url;
  const set = (k: string, v: string | undefined) => {
    if (v && !u.searchParams.has(k)) u.searchParams.set(k, v);
  };
  set("utm_source", UTM_SOURCE);
  set("utm_medium", "marketplace");
  set("utm_campaign", campaign);
  set("utm_content", content);
  return u.toString();
}

export function isSafeHttpUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const p = new URL(url).protocol;
    return p === "https:" || p === "http:";
  } catch {
    return false;
  }
}

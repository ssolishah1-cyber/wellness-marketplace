/** Absolute URL of an in-app path, respecting the /app base path (used in auth email links). */
export function appUrl(path = "/") {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return `${window.location.origin}${base}${path.startsWith("/") ? path : `/${path}`}`;
}

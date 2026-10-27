import { APP_SCHEME, isNative } from "./native";

/**
 * Absolute URL of an in-app path, used in sign-up and password-reset emails.
 * Web: https://<site>/app/<path>. Phone app: <app-id>://app/<path>, which opens the app.
 */
export function appUrl(path = "/") {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (isNative) return `${APP_SCHEME}://app${p}`;
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return `${window.location.origin}${base}${p}`;
}

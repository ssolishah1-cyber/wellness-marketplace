import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Share } from "@capacitor/share";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

/** True inside the iPhone / Android app, false in a web browser. */
export const isNative = Capacitor.isNativePlatform();

/** Custom URL scheme that opens the app, e.g. com.wellnessjumpstart.app://app/reset-password */
export const APP_SCHEME = (import.meta.env.VITE_APP_ID as string | undefined) || "com.wellnessjumpstart.app";

/** A light tap on supported phones; does nothing on the web. */
export function tap() {
  if (isNative) void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}

/**
 * One-time setup when the app starts on a phone: status bar, splash screen,
 * Android back button, external links, and links that open the app
 * (sign-up confirmation and password reset).
 */
export function initNative(opts: { navigate: (path: string) => void; onAuthLink: (url: URL) => Promise<void> }) {
  if (!isNative) return () => {};
  void StatusBar.setStyle({ style: Style.Light }).catch(() => {});
  void SplashScreen.hide().catch(() => {});

  const subs = [
    App.addListener("backButton", ({ canGoBack }) => (canGoBack ? window.history.back() : App.exitApp())),
    App.addListener("appUrlOpen", async ({ url }) => {
      try {
        const u = new URL(url);
        if (u.protocol.slice(0, -1).toLowerCase() !== APP_SCHEME.toLowerCase()) return;
        await opts.onAuthLink(u);
        opts.navigate(u.pathname && u.pathname !== "/" ? u.pathname : "/");
      } catch { /* ignore malformed links */ }
    }),
  ];

  // Open web links (partner sites, legal links to other domains) in the in-app browser
  // instead of replacing the app.
  const onClick = (e: MouseEvent) => {
    const a = (e.target as HTMLElement | null)?.closest?.("a");
    if (!a || !a.href) return;
    const href = new URL(a.href, window.location.href);
    if ((href.protocol === "https:" || href.protocol === "http:") && href.origin !== window.location.origin) {
      e.preventDefault();
      void Browser.open({ url: href.toString() });
    }
  };
  document.addEventListener("click", onClick, true);

  return () => {
    subs.forEach((s) => void s.then((h) => h.remove()));
    document.removeEventListener("click", onClick, true);
  };
}

/** Save a text file and open the share sheet (phones), or download it (web). */
export async function saveFile(name: string, content: string, mime = "application/json") {
  if (isNative) {
    const res = await Filesystem.writeFile({ path: name, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: name, url: res.uri, dialogTitle: "Save or send your data" });
    return;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------- reminders (local notifications; no server, no personal data) ----------
export type ReminderKind = "log" | "water";
const REMINDERS: Record<ReminderKind, { id: number; hour: number; minute: number; title: string; body: string }[]> = {
  log: [{ id: 101, hour: 20, minute: 0, title: "Log today's meals", body: "A minute now keeps your streak going." }],
  water: [
    { id: 201, hour: 11, minute: 0, title: "Water break", body: "Time for a glass of water." },
    { id: 202, hour: 14, minute: 30, title: "Water break", body: "Time for a glass of water." },
    { id: 203, hour: 17, minute: 30, title: "Water break", body: "Time for a glass of water." },
  ],
};
const PREF_KEY = (k: ReminderKind) => `reminder-${k}`;

export function reminderEnabled(k: ReminderKind) {
  try { return localStorage.getItem(PREF_KEY(k)) === "on"; } catch { return false; }
}

/** Turns a daily reminder on or off. Returns false if the user declined notification permission. */
export async function setReminder(k: ReminderKind, on: boolean): Promise<boolean> {
  if (!isNative) return false;
  const ids = REMINDERS[k].map((r) => ({ id: r.id }));
  if (!on) {
    await LocalNotifications.cancel({ notifications: ids });
    try { localStorage.setItem(PREF_KEY(k), "off"); } catch { /* ignore */ }
    return true;
  }
  let perm = await LocalNotifications.checkPermissions();
  if (perm.display !== "granted") perm = await LocalNotifications.requestPermissions();
  if (perm.display !== "granted") return false;
  await LocalNotifications.cancel({ notifications: ids });
  await LocalNotifications.schedule({
    notifications: REMINDERS[k].map((r) => ({
      id: r.id, title: r.title, body: r.body,
      schedule: { on: { hour: r.hour, minute: r.minute }, repeats: true, allowWhileIdle: true },
    })),
  });
  try { localStorage.setItem(PREF_KEY(k), "on"); } catch { /* ignore */ }
  return true;
}

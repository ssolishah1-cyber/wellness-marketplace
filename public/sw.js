// Offline shell for the installed app. Caches only the app's own static files
// (HTML shell, JS, CSS, icons). API calls to Supabase, and therefore all
// personal data, are never cached and always go to the network.
const CACHE = "nutrition-shell-v1";
const SCOPE = new URL(self.registration.scope).pathname; // e.g. "/app/"

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([SCOPE, `${SCOPE}manifest.webmanifest`, `${SCOPE}icons/icon-192.png`])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return;

  // Page loads: network first so updates show immediately; cached shell when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(SCOPE, copy));
        return res;
      }).catch(() => caches.match(SCOPE)),
    );
    return;
  }

  // Hashed build files and icons never change: cache first.
  if (url.pathname.startsWith(`${SCOPE}assets/`) || url.pathname.startsWith(`${SCOPE}icons/`)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })),
    );
  }
});

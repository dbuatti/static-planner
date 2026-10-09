/* ── sw.js — network-first service worker (fresh deploys, offline fallback) ── */
const VERSION = "planner-v5";
const CORE = [
  "./",
  "./index.html",
  "./plan.html",
  "./practice.html",
  "./spending.html",
  "./more.html",
  "./data/schedule.js",
  "./assets/css/styles.css",
  "./assets/css/plan.css",
  "./assets/js/store.js",
  "./assets/js/nav.js",
  "./assets/js/helpers.js",
  "./assets/js/recurring.js",
  "./assets/js/practice.js",
  "./assets/js/spending.js",
  "./assets/js/plan.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./manifest.webmanifest"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  // Mutable app files (HTML, JS, CSS, data): network-first so each commit shows up
  // immediately; cache is only the offline fallback. Immutable assets (icons/fonts):
  // cache-first.
  if (/\.(png|ico|svg|jpg|jpeg|webp|gif|webmanifest|ttf|woff2?)$/i.test(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then((hit) => {
        const network = fetch(e.request).then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(VERSION).then((c) => c.put(e.request, clone));
          }
          return res;
        });
        return hit || network;
      })
    );
    return;
  }

  e.respondWith(
    fetch(e.request, { cache: "reload" })
      .then((res) => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
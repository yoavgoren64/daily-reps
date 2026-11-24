// Service worker: keeps a copy of the app on your phone so it works offline (e.g. in a gym
// with no signal). When you're online it always fetches the newest version first.

const CACHE = "daily-reps-v1";
const FILES = [
  "./", "index.html", "style.css",
  "exercises.js", "animations.js", "figures.js", "app.js",
  "manifest.webmanifest", "apple-touch-icon.png", "icon-192.png", "icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

// Network first, fall back to the saved copy when offline
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});

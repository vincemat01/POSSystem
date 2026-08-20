// Minimal app-shell service worker. Sales/data offline support comes from IndexedDB + the sync
// engine (src/lib/offline) — this worker only keeps the shell available so the app can boot with
// no network at all.
//
// Strategy: content-hashed static assets (/_next/static/...) are cache-first — safe, since their
// URL changes whenever their content does. Everything else (pages, RSC payloads) is
// network-first with cache only as a genuine offline fallback — a cache-first strategy there
// would (and did) keep serving a stale page indefinitely after every deploy, since the same URL
// never changes even though its content does.
const CACHE_NAME = "kompass-shell-v2";
const SHELL_ASSETS = ["/", "/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never cache API/data routes — those go through the sync engine's own offline handling.
  if (url.pathname.startsWith("/api/")) return;

  const isImmutableAsset = url.pathname.startsWith("/_next/static/");

  if (isImmutableAsset) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          }),
      ),
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached ?? Response.error())),
  );
});

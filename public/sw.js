const CACHE_NAME = "macro-tracker-v1";
const STATIC_ASSETS = ["/", "/history", "/settings"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // No cachear APIs ni uploads
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/uploads/")) {
    return;
  }

  // Cache-first para assets estáticos (_next/static)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        });
      })
    );
    return;
  }

  // Network-first para navegación (páginas)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
  }
});

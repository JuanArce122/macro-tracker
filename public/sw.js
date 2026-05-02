const CACHE_NAME = "macro-tracker-v2";
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

  // No cachear uploads ni export
  if (url.pathname.startsWith("/uploads/") || url.pathname.startsWith("/api/export")) {
    return;
  }

  // Stale-while-revalidate para API de comidas y metas (historial offline)
  if (url.pathname.startsWith("/api/meals") || url.pathname.startsWith("/api/history") || url.pathname.startsWith("/api/goals")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        }).catch(() => cached);
        return cached ?? fetchPromise;
      })
    );
    return;
  }

  // No cachear otras APIs
  if (url.pathname.startsWith("/api/")) {
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

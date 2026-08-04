// Bump v5: NO precacheamos HTML de páginas porque el HTML referencia
// chunks JS con hashes que cambian en cada deploy. Si pre-cacheamos /
// + /history + /settings con el SW viejo, tras un deploy el HTML viejo
// apunta a chunks que ya no existen → la app queda en blanco / no abre.
//
// Estrategia v5:
//   - install: solo skipWaiting (sin precaching de HTML)
//   - activate: borra todos los caches viejos para liberar al usuario
//   - fetch: cache-first SOLO para /_next/static/* (hashes inmutables);
//            stale-while-revalidate para APIs idempotentes;
//            network-first para navegación (HTML).
const CACHE_NAME = "macro-tracker-v6";

// APIs con datos del usuario (stale-while-revalidate en GET; invalidación en
// mutaciones). El bump a v6 fuerza el borrado de los caches v5 en activate.
const CACHEABLE_API = ["/api/meals", "/api/history", "/api/goals"];

async function invalidateApiCache() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  await Promise.all(
    keys
      .filter((req) => CACHEABLE_API.some((p) => new URL(req.url).pathname.startsWith(p)))
      .map((req) => cache.delete(req))
  );
}

// P4: página de fallback offline (mínima, inline) para cuando una navegación
// falla y no hay nada cacheado — antes el usuario veía el error del navegador.
function offlineFallback() {
  return new Response(
    '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      "<title>Sin conexión</title><style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;" +
      "background:#FAFAF9;color:#1A1A1A;display:flex;align-items:center;justify-content:center;" +
      "min-height:100vh;margin:0;text-align:center;padding:24px}h1{font-size:20px;margin:0 0 8px}" +
      "p{color:#6B6B6B;font-size:14px}</style></head><body><div><h1>Sin conexión</h1>" +
      "<p>Revisa tu internet e intenta de nuevo.</p></div></body></html>",
    { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 }
  );
}

// ─── Instalación ──────────────────────────────────────────────────────────────

self.addEventListener("install", () => {
  // Sin precaching de HTML — evita chunks JS huérfanos tras deploys.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Borrar caches viejos (v4 y previos)
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      await self.clients.claim();
      // Notificar a todas las pestañas abiertas para que recarguen y
      // tomen el HTML/chunks frescos (fix del bug donde HTML viejo
      // referenciaba chunks JS borrados tras un deploy).
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        client.postMessage({ type: "SW_UPDATED", version: CACHE_NAME });
      }
    })()
  );
});

// ─── Fetch (cache) ────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.startsWith("/uploads/") || url.pathname.startsWith("/api/export")) return;

  if (CACHEABLE_API.some((p) => url.pathname.startsWith(p))) {
    if (request.method !== "GET") {
      // Mutación (POST/PUT/DELETE): a la red e invalida el cache de estos GET
      // para no servir datos viejos tras crear/editar/borrar (P2). No hacemos
      // cache.put de no-GET — la Cache API lo rechaza (antes: unhandled
      // rejection en cada mutación, P8).
      event.respondWith(
        fetch(request).then((res) => {
          if (res.ok) invalidateApiCache();
          return res;
        })
      );
      return;
    }
    // GET: stale-while-revalidate
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((res) => { if (res.ok) cache.put(request, res.clone()); return res; })
          .catch(() => cached);
        return cached ?? fetchPromise;
      })
    );
    return;
  }

  if (url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          // Solo cachear respuestas OK: un 404/500 transitorio de un chunk NO
          // debe quedar cacheado para siempre (ChunkLoadError permanente) (P1).
          if (res.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, res.clone()));
          }
          return res;
        });
      })
    );
    return;
  }

  if (request.mode === "navigate") {
    // Network-first; cachea respuestas OK para que offline funcione sin
    // precaching del install (que generaba el bug de chunks huérfanos).
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(async () => (await caches.match(request)) ?? offlineFallback())
    );
  }
});

// ─── Notificaciones ───────────────────────────────────────────────────────────

// Timers activos (se reinician cuando la página envía el schedule)
const activeTimers = new Map();

/**
 * Parsea "HH:MM" y retorna los ms hasta esa hora hoy (o mañana si ya pasó).
 */
function msUntil(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  let diff = target - now;
  if (diff <= 0) diff += 24 * 60 * 60 * 1000; // mañana
  return diff;
}

const NOTIFICATION_TITLES = {
  breakfast: "🍳 Hora del desayuno",
  lunch:     "🥗 Hora del almuerzo",
  dinner:    "🍽️ Hora de la cena",
  summary:   "📊 Resumen del día",
};

const NOTIFICATION_BODIES = {
  breakfast: "Registra tu desayuno para empezar el día con buen pie.",
  lunch:     "¿Ya comiste? Anota tu almuerzo antes de que se te olvide.",
  dinner:    "Cierra el día registrando tu cena.",
  summary:   "Revisa cómo quedaron tus macros de hoy.",
};

function scheduleNotification(key, timeStr) {
  // Cancelar timer previo si existe
  if (activeTimers.has(key)) clearTimeout(activeTimers.get(key));

  const delay = msUntil(timeStr);

  const timer = setTimeout(async () => {
    // Mostrar siempre (la app puede estar en background o cerrada)
    self.registration.showNotification(NOTIFICATION_TITLES[key], {
      body: NOTIFICATION_BODIES[key],
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: key,            // reemplaza notificación previa del mismo tipo
      renotify: true,
      data: { url: "/" }, // URL a abrir al hacer clic
    });

    // Reprogramar para mañana a la misma hora
    scheduleNotification(key, timeStr);
  }, delay);

  activeTimers.set(key, timer);
}

function cancelNotification(key) {
  if (activeTimers.has(key)) {
    clearTimeout(activeTimers.get(key));
    activeTimers.delete(key);
  }
}

/**
 * La página envía el schedule completo cada vez que lo cambia.
 * Formato del mensaje: { type: "SCHEDULE_NOTIFICATIONS", schedule: { breakfast: { enabled, time }, ... } }
 */
self.addEventListener("message", (event) => {
  // P3: al cerrar sesión el cliente pide limpiar el cache para que el próximo
  // usuario en el mismo dispositivo no vea datos cacheados del anterior.
  if (event.data?.type === "CLEAR_CACHE") {
    event.waitUntil(caches.delete(CACHE_NAME));
    return;
  }
  if (!event.data || event.data.type !== "SCHEDULE_NOTIFICATIONS") return;

  const { schedule } = event.data;
  if (!schedule) return;

  const keys = ["breakfast", "lunch", "dinner", "summary"];
  for (const key of keys) {
    const item = schedule[key];
    if (item?.enabled && item?.time) {
      scheduleNotification(key, item.time);
    } else {
      cancelNotification(key);
    }
  }
});

// ─── Web Push (HU-09: coaching contextual) ────────────────────────────────────
//
// Recibe pushes del servidor (lib/push.ts) y muestra la notificación.
// El payload es un JSON: { title, body, url, insightId }.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Macro Tracker", body: event.data.text(), url: "/" };
  }

  const { title, body, url, insightId } = payload;

  event.waitUntil(
    self.registration.showNotification(title ?? "Macro Tracker", {
      body: body ?? "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: insightId ? `insight-${insightId}` : "macros-push",
      renotify: true,
      data: { url: url ?? "/", insightId },
    })
  );
});

// ─── Clic en notificación ─────────────────────────────────────────────────────

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Si ya hay una ventana abierta, enfocarla
      const existing = clients.find((c) => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      // Si no, abrir nueva
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ─── Periodic Background Sync (Chrome/Android) ────────────────────────────────

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "check-notifications") {
    // El SW se despertó — el schedule se restaurará cuando la página
    // vuelva a enviar el mensaje SCHEDULE_NOTIFICATIONS
  }
});

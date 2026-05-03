"use client";

import { useEffect } from "react";

const NOTIF_STORAGE_KEY = "notification_schedule";

async function restoreSchedule(reg: ServiceWorkerRegistration) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (!raw) return;
    const schedule = JSON.parse(raw);
    const sw = reg.active ?? reg.installing ?? reg.waiting;
    sw?.postMessage({ type: "SCHEDULE_NOTIFICATIONS", schedule });
  } catch { /* silencioso */ }
}

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Restaurar schedule cuando el SW está activo
        if (reg.active) {
          restoreSchedule(reg);
        } else {
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            newWorker?.addEventListener("statechange", () => {
              if (newWorker.state === "activated") restoreSchedule(reg);
            });
          });
        }
      })
      .catch((err) => console.error("[SW] Error al registrar:", err));
  }, []);

  return null;
}

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

    // Escuchar SW_UPDATED del nuevo SW para recargar y tomar HTML/chunks
    // frescos. Sin esto, una pestaña que ya cargó HTML del SW viejo
    // sigue con chunks JS que ya no existen tras el deploy.
    let reloaded = false;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "SW_UPDATED" && !reloaded) {
        reloaded = true;
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);

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

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, []);

  return null;
}

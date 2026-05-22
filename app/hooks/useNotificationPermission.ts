"use client";

import { useSyncExternalStore } from "react";

const CHANGE_EVENT = "notification-permission-change";

function subscribe(callback: () => void) {
  let detach: (() => void) | null = null;

  // Permissions API: dispara "change" cuando el usuario otorga/revoca.
  if (typeof navigator !== "undefined" && "permissions" in navigator) {
    navigator.permissions
      .query({ name: "notifications" as PermissionName })
      .then((status) => {
        status.addEventListener("change", callback);
        detach = () => status.removeEventListener("change", callback);
      })
      .catch(() => {
        /* Permissions API no soporta "notifications" en este navegador */
      });
  }

  // Custom event para refrescar manualmente tras requestPermission()
  // en navegadores sin Permissions API.
  window.addEventListener(CHANGE_EVENT, callback);

  return () => {
    detach?.();
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getSnapshot(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "default";
  return Notification.permission;
}

function getServerSnapshot(): NotificationPermission {
  return "default";
}

export function useNotificationPermission(): NotificationPermission {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Notifica manualmente un cambio de permiso (útil tras requestPermission). */
export function notifyPermissionChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

"use client";

import { useSyncExternalStore, useCallback } from "react";

export type ReminderKey = "breakfast" | "lunch" | "dinner" | "summary";

export type ReminderItem = {
  enabled: boolean;
  time: string;
};

export type Schedule = Record<ReminderKey, ReminderItem>;

export const DEFAULT_SCHEDULE: Schedule = {
  breakfast: { enabled: false, time: "08:00" },
  lunch:     { enabled: false, time: "13:00" },
  dinner:    { enabled: false, time: "20:00" },
  summary:   { enabled: false, time: "21:00" },
};

const STORAGE_KEY = "notification_schedule";
const CHANGE_EVENT = "notification-schedule-change";

// Cache para referencia estable entre snapshots: useSyncExternalStore
// requiere que getSnapshot devuelva la misma referencia si el storage
// no cambió. JSON.parse cada render rompería esa garantía.
let cachedRaw: string | null | undefined = undefined;
let cachedValue: Schedule = DEFAULT_SCHEDULE;

function readSchedule(): Schedule {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedValue;
    cachedRaw = raw;
    cachedValue = raw
      ? { ...DEFAULT_SCHEDULE, ...JSON.parse(raw) }
      : DEFAULT_SCHEDULE;
    return cachedValue;
  } catch {
    return DEFAULT_SCHEDULE;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getSnapshot(): Schedule {
  return readSchedule();
}

function getServerSnapshot(): Schedule {
  return DEFAULT_SCHEDULE;
}

function getCountSnapshot(): number {
  return Object.values(readSchedule()).filter((v) => v.enabled).length;
}

function getServerCountSnapshot(): number {
  return 0;
}

export function useNotificationSchedule(): [Schedule, (next: Schedule) => void] {
  const schedule = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setSchedule = useCallback((next: Schedule) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* silencioso */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [schedule, setSchedule];
}

export function useActiveNotifCount(): number {
  return useSyncExternalStore(subscribe, getCountSnapshot, getServerCountSnapshot);
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { EggFried, Salad, UtensilsCrossed, BarChart3, Bell, AlertTriangle, Info } from "lucide-react";
import Icon from "@/app/components/ui/Icon";

type ReminderKey = "breakfast" | "lunch" | "dinner" | "summary";

type ReminderItem = {
  enabled: boolean;
  time: string;
};

type Schedule = Record<ReminderKey, ReminderItem>;

const DEFAULTS: Schedule = {
  breakfast: { enabled: false, time: "08:00" },
  lunch:     { enabled: false, time: "13:00" },
  dinner:    { enabled: false, time: "20:00" },
  summary:   { enabled: false, time: "21:00" },
};

const LABELS: Record<ReminderKey, { icon: LucideIcon; title: string; desc: string }> = {
  breakfast: { icon: EggFried,        title: "Desayuno",      desc: "Recuerda registrar tu desayuno" },
  lunch:     { icon: Salad,           title: "Almuerzo",      desc: "Recuerda registrar tu almuerzo" },
  dinner:    { icon: UtensilsCrossed, title: "Cena",          desc: "Recuerda registrar tu cena" },
  summary:   { icon: BarChart3,       title: "Resumen diario", desc: "Revisa cómo quedaron tus macros" },
};

const STORAGE_KEY = "notification_schedule";
const KEYS: ReminderKey[] = ["breakfast", "lunch", "dinner", "summary"];

function loadSchedule(): Schedule {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function saveSchedule(schedule: Schedule) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
  } catch { /* silencioso */ }
}

async function sendScheduleToSW(schedule: Schedule) {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg?.active) return;
  reg.active.postMessage({ type: "SCHEDULE_NOTIFICATIONS", schedule });
}

export default function NotificationsPage() {
  const router = useRouter();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [schedule, setSchedule] = useState<Schedule>(DEFAULTS);
  const [requesting, setRequesting] = useState(false);

  // Detectar soporte iOS
  const isIOS = typeof navigator !== "undefined" &&
    /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isIOSOld = isIOS && typeof navigator !== "undefined" &&
    !("standalone" in navigator) ||
    (typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      Number(navigator.userAgent.match(/OS (\d+)_/)?.[1] ?? 0) < 16);

  useEffect(() => {
    // Leer permiso actual
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
    // Leer schedule guardado
    setSchedule(loadSchedule());
  }, []);

  const updateItem = useCallback((key: ReminderKey, patch: Partial<ReminderItem>) => {
    setSchedule((prev) => {
      const next = { ...prev, [key]: { ...prev[key], ...patch } };
      saveSchedule(next);
      // Solo enviar al SW si tenemos permiso
      if (Notification.permission === "granted") {
        sendScheduleToSW(next);
      }
      return next;
    });
  }, []);

  async function requestPermission() {
    if (!("Notification" in window)) return;
    setRequesting(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        await sendScheduleToSW(schedule);
      }
    } finally {
      setRequesting(false);
    }
  }

  const granted = permission === "granted";
  const denied  = permission === "denied";

  return (
    <div className="flex flex-col flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 pt-5 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 dark:text-gray-500 p-1 -ml-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Notificaciones</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-10 flex flex-col gap-5">

        {/* Banner de permiso */}
        {!granted && !denied && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5">
                <Icon icon={Bell} size={24} />
              </span>
              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Activa las notificaciones</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5 leading-relaxed">
                  Para recibir recordatorios necesitamos tu permiso. Solo recibirás lo que configures aquí.
                </p>
              </div>
            </div>
            <button
              onClick={requestPermission}
              disabled={requesting}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white font-semibold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2"
            >
              {requesting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Solicitando…
                </>
              ) : "Activar notificaciones"}
            </button>
          </div>
        )}

        {denied && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/50 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5">
              <Icon icon={AlertTriangle} size={20} />
            </span>
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Notificaciones bloqueadas</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                Bloqueaste las notificaciones. Para activarlas ve a{" "}
                <strong>Ajustes del navegador → Privacidad → Notificaciones</strong>.
              </p>
            </div>
          </div>
        )}

        {granted && (
          <div className="flex items-center gap-2 px-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Notificaciones activadas</p>
          </div>
        )}

        {/* Aviso iOS */}
        {isIOS && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5">
              <Icon icon={Info} size={20} />
            </span>
            <div>
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Nota para iPhone / iPad</p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5 leading-relaxed">
                Las notificaciones en iOS requieren iOS 16.4+ y que la app esté instalada en la pantalla de inicio.
                {isIOSOld ? " Tu versión puede no ser compatible." : " Toca «Compartir → Añadir a inicio» si aún no lo hiciste."}
              </p>
            </div>
          </div>
        )}

        {/* Recordatorios */}
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 mb-2">Recordatorios de comidas</p>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden divide-y divide-gray-50 dark:divide-gray-700">
            {KEYS.map((key) => {
              const item = schedule[key];
              const meta = LABELS[key];
              return (
                <div key={key} className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="w-8 flex items-center justify-center text-gray-500 dark:text-gray-400 flex-shrink-0">
                      <Icon icon={meta.icon} size={20} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{meta.title}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{meta.desc}</p>
                    </div>
                    {/* Toggle */}
                    <button
                      onClick={() => updateItem(key, { enabled: !item.enabled })}
                      disabled={denied}
                      aria-label={item.enabled ? "Desactivar" : "Activar"}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                        item.enabled && !denied
                          ? "bg-emerald-500"
                          : "bg-gray-200 dark:bg-gray-600"
                      } disabled:opacity-40`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          item.enabled && !denied ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Selector de hora (solo si activado) */}
                  {item.enabled && !denied && (
                    <div className="mt-3 ml-11 flex items-center gap-3">
                      <label className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">Hora:</label>
                      <input
                        type="time"
                        value={item.time}
                        onChange={(e) => updateItem(key, { time: e.target.value })}
                        className="border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      />
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {msUntilLabel(item.time)}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Nota general */}
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center leading-relaxed px-2">
          Los recordatorios se activan mientras la app está abierta o instalada en pantalla de inicio.
          Los cambios se guardan automáticamente.
        </p>
      </div>
    </div>
  );
}

/** Devuelve "en X h Y min" o "mañana a las HH:MM" */
function msUntilLabel(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  let diff = target.getTime() - now.getTime();
  if (diff <= 0) diff += 24 * 60 * 60 * 1000;

  const totalMin = Math.round(diff / 60_000);
  if (totalMin < 60) return `en ${totalMin} min`;
  const hours = Math.floor(totalMin / 60);
  const mins  = totalMin % 60;
  if (hours < 20) return mins > 0 ? `en ${hours}h ${mins}min` : `en ${hours}h`;
  return `mañana a las ${timeStr}`;
}

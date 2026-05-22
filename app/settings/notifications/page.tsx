"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { EggFried, Salad, UtensilsCrossed, BarChart3, Bell, AlertTriangle, Info, ChevronLeft, Loader2 } from "lucide-react";
import Button from "@/app/components/ui/Button";
import Icon from "@/app/components/ui/Icon";
import {
  useNotificationSchedule,
  type ReminderKey,
  type ReminderItem,
  type Schedule,
} from "@/app/hooks/useNotificationSchedule";
import {
  useNotificationPermission,
  notifyPermissionChange,
} from "@/app/hooks/useNotificationPermission";

const LABELS: Record<ReminderKey, { icon: LucideIcon; title: string; desc: string }> = {
  breakfast: { icon: EggFried,        title: "Desayuno",      desc: "Recuerda registrar tu desayuno" },
  lunch:     { icon: Salad,           title: "Almuerzo",      desc: "Recuerda registrar tu almuerzo" },
  dinner:    { icon: UtensilsCrossed, title: "Cena",          desc: "Recuerda registrar tu cena" },
  summary:   { icon: BarChart3,       title: "Resumen diario", desc: "Revisa cómo quedaron tus macros" },
};

const KEYS: ReminderKey[] = ["breakfast", "lunch", "dinner", "summary"];

async function sendScheduleToSW(schedule: Schedule) {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg?.active) return;
  reg.active.postMessage({ type: "SCHEDULE_NOTIFICATIONS", schedule });
}

export default function NotificationsPage() {
  const router = useRouter();
  const permission = useNotificationPermission();
  const [schedule, setSchedule] = useNotificationSchedule();
  const [requesting, setRequesting] = useState(false);

  // Detectar soporte iOS
  const isIOS = typeof navigator !== "undefined" &&
    /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isIOSOld = isIOS && typeof navigator !== "undefined" &&
    !("standalone" in navigator) ||
    (typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      Number(navigator.userAgent.match(/OS (\d+)_/)?.[1] ?? 0) < 16);

  const updateItem = useCallback((key: ReminderKey, patch: Partial<ReminderItem>) => {
    const next: Schedule = { ...schedule, [key]: { ...schedule[key], ...patch } };
    setSchedule(next);
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      sendScheduleToSW(next);
    }
  }, [schedule, setSchedule]);

  async function requestPermission() {
    if (!("Notification" in window)) return;
    setRequesting(true);
    try {
      const result = await Notification.requestPermission();
      notifyPermissionChange();
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
    <div className="flex flex-col flex-1 bg-bg-primary">
      {/* Header */}
      <div className="px-5 pt-7 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-text-tertiary active:text-text-primary p-1 -ml-1 transition-colors duration-200 ease-[var(--ease-editorial)]">
          <Icon icon={ChevronLeft} size={20} />
        </button>
        <h1 className="font-serif text-3xl tracking-[-0.02em] text-text-primary">Notificaciones</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-10 flex flex-col gap-4">

        {/* Banner de permiso */}
        {!granted && !denied && (
          <div className="bg-bg-secondary border border-border rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="text-text-secondary flex-shrink-0 mt-0.5">
                <Icon icon={Bell} size={24} />
              </span>
              <div>
                <p className="text-sm font-medium text-text-primary">Activa las notificaciones</p>
                <p className="text-xs text-text-tertiary mt-1 leading-relaxed">
                  Para recibir recordatorios necesitamos tu permiso. Solo recibirás lo que configures aquí.
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              onClick={requestPermission}
              disabled={requesting}
              leadingIcon={requesting ? <Icon icon={Loader2} size={16} className="animate-spin" /> : undefined}
              className="w-full"
            >
              {requesting ? "Solicitando…" : "Activar notificaciones"}
            </Button>
          </div>
        )}

        {denied && (
          <div className="bg-bg-secondary border border-border rounded-xl p-5 flex items-start gap-3">
            <span className="text-accent-warm flex-shrink-0 mt-0.5">
              <Icon icon={AlertTriangle} size={20} />
            </span>
            <div>
              <p className="text-sm font-medium text-text-primary">Notificaciones bloqueadas</p>
              <p className="text-xs text-text-tertiary mt-1 leading-relaxed">
                Bloqueaste las notificaciones. Para activarlas ve a{" "}
                <strong className="text-text-secondary">Ajustes del navegador → Privacidad → Notificaciones</strong>.
              </p>
            </div>
          </div>
        )}

        {granted && (
          <div className="flex items-center gap-2 px-1">
            <div className="w-2 h-2 rounded-full bg-macro-protein flex-shrink-0" />
            <p className="text-xs text-text-secondary font-medium">Notificaciones activadas</p>
          </div>
        )}

        {/* Aviso iOS */}
        {isIOS && (
          <div className="bg-bg-secondary border border-border rounded-xl p-5 flex items-start gap-3">
            <span className="text-text-secondary flex-shrink-0 mt-0.5">
              <Icon icon={Info} size={20} />
            </span>
            <div>
              <p className="text-sm font-medium text-text-primary">Nota para iPhone / iPad</p>
              <p className="text-xs text-text-tertiary mt-1 leading-relaxed">
                Las notificaciones en iOS requieren iOS 16.4+ y que la app esté instalada en la pantalla de inicio.
                {isIOSOld ? " Tu versión puede no ser compatible." : " Toca «Compartir → Añadir a inicio» si aún no lo hiciste."}
              </p>
            </div>
          </div>
        )}

        {/* Recordatorios */}
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary px-1 pt-2 pb-2">Recordatorios de comidas</p>
          <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden divide-y divide-border">
            {KEYS.map((key) => {
              const item = schedule[key];
              const meta = LABELS[key];
              return (
                <div key={key} className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 flex items-center justify-center text-text-secondary flex-shrink-0">
                      <Icon icon={meta.icon} size={20} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary">{meta.title}</p>
                      <p className="text-xs text-text-tertiary mt-0.5 truncate">{meta.desc}</p>
                    </div>
                    {/* Toggle */}
                    <button
                      onClick={() => updateItem(key, { enabled: !item.enabled })}
                      disabled={denied}
                      aria-label={item.enabled ? "Desactivar" : "Activar"}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-[var(--ease-editorial)] flex-shrink-0 ${
                        item.enabled && !denied
                          ? "bg-text-primary"
                          : "bg-bg-tertiary"
                      } disabled:opacity-40`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-bg-primary rounded-full transition-transform duration-200 ease-[var(--ease-editorial)] ${
                          item.enabled && !denied ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Selector de hora (solo si activado) */}
                  {item.enabled && !denied && (
                    <div className="mt-3 ml-11 flex items-center gap-3">
                      <label className="text-xs text-text-tertiary flex-shrink-0">Hora:</label>
                      <input
                        type="time"
                        value={item.time}
                        onChange={(e) => updateItem(key, { time: e.target.value })}
                        className="bg-bg-primary border border-border rounded-xl px-3 py-1.5 text-sm font-medium text-text-primary tabular-nums focus:outline-none focus:border-text-primary transition-colors duration-200 ease-[var(--ease-editorial)]"
                      />
                      <p className="text-xs text-text-tertiary tabular-nums">
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
        <p className="text-xs text-text-tertiary text-center leading-relaxed px-2 pt-2">
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

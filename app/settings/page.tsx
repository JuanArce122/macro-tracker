"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BottomNav from "@/app/components/BottomNav";
import SettingsRow from "@/app/components/SettingsRow";
import { useTheme } from "@/app/hooks/useTheme";

type Profile = {
  name: string | null;
  avatarEmoji: string | null;
  fitnessGoal: string | null;
};

type Goals = { calories: number; protein: number; carbs: number; fat: number } | null;

const GOAL_LABELS: Record<string, string> = {
  lose: "Perder grasa",
  maintain: "Mantener peso",
  gain: "Ganar músculo",
};

function ProfileCard({ profile }: { profile: Profile | null }) {
  const avatar = profile?.avatarEmoji ?? "🙂";
  const name = profile?.name ?? "Mi perfil";
  const goal = profile?.fitnessGoal ? GOAL_LABELS[profile.fitnessGoal] : "Sin objetivo configurado";

  return (
    <Link href="/settings/profile">
      <div className="mx-4 mt-4 mb-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex items-center gap-4 active:bg-gray-50 dark:active:bg-gray-700/50 transition-colors">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
          <span className="text-4xl">{avatar}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 dark:text-gray-100 text-base truncate">{name}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{goal}</p>
        </div>
        <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-5 pt-5 pb-1">
      {label}
    </p>
  );
}

function RowGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden divide-y divide-gray-50 dark:divide-gray-700">
      {children}
    </div>
  );
}

const THEME_LABELS: Record<string, string> = {
  system: "Sistema",
  light: "Claro",
  dark: "Oscuro",
};

const NOTIF_STORAGE_KEY = "notification_schedule";

function getActiveNotifCount(): number {
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (!raw) return 0;
    const s = JSON.parse(raw);
    return Object.values(s).filter((v: unknown) => (v as { enabled: boolean }).enabled).length;
  } catch {
    return 0;
  }
}

async function restoreNotifSchedule() {
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (!raw) return;
    const schedule = JSON.parse(raw);
    const reg = await navigator.serviceWorker.getRegistration();
    reg?.active?.postMessage({ type: "SCHEDULE_NOTIFICATIONS", schedule });
  } catch { /* silencioso */ }
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [goals, setGoals] = useState<Goals>(null);
  const [myFoodsCount, setMyFoodsCount] = useState(0);
  const [activeNotifs, setActiveNotifs] = useState(0);
  const { theme } = useTheme();

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then(setProfile)
      .catch(() => null);

    fetch("/api/goals")
      .then((r) => r.json())
      .then(setGoals)
      .catch(() => null);

    fetch("/api/foods/user")
      .then((r) => r.json())
      .then((d) => setMyFoodsCount(d.myFoods?.length ?? 0))
      .catch(() => null);

    setActiveNotifs(getActiveNotifCount());
    restoreNotifSchedule();
  }, []);

  const goalsSubtitle = goals
    ? `${goals.calories.toFixed(0)} kcal · ${goals.protein.toFixed(0)}g P · ${goals.carbs.toFixed(0)}g C · ${goals.fat.toFixed(0)}g G`
    : "Configura tus metas diarias";

  const foodsSubtitle = myFoodsCount > 0
    ? `${myFoodsCount} alimento${myFoodsCount !== 1 ? "s" : ""} guardado${myFoodsCount !== 1 ? "s" : ""}`
    : "Agrega tus alimentos habituales";

  const notifSubtitle = activeNotifs > 0
    ? `${activeNotifs} recordatorio${activeNotifs !== 1 ? "s" : ""} activo${activeNotifs !== 1 ? "s" : ""}`
    : "Recordatorios de comidas";

  return (
    <div className="flex flex-col flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 pt-5 pb-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Ajustes</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Tarjeta de perfil */}
        <ProfileCard profile={profile} />

        {/* NUTRICIÓN */}
        <SectionLabel label="Nutrición" />
        <RowGroup>
          <SettingsRow
            icon="🎯"
            title="Metas diarias"
            subtitle={goalsSubtitle}
            href="/settings/goals"
          />
          <SettingsRow
            icon="🥗"
            title="Mis alimentos"
            subtitle={foodsSubtitle}
            href="/settings/foods"
          />
        </RowGroup>

        {/* PREFERENCIAS */}
        <SectionLabel label="Preferencias" />
        <RowGroup>
          <SettingsRow
            icon="🔔"
            title="Notificaciones"
            subtitle={notifSubtitle}
            href="/settings/notifications"
          />
          <SettingsRow
            icon="🎨"
            title="Apariencia"
            subtitle={THEME_LABELS[theme] ?? "Sistema"}
            href="/settings/appearance"
          />
        </RowGroup>

        {/* PRIVACIDAD */}
        <SectionLabel label="Privacidad" />
        <RowGroup>
          <SettingsRow
            icon="📊"
            title="Mis datos"
            subtitle="Exportar CSV · Borrar historial"
            href="/settings/data"
          />
        </RowGroup>

        {/* INFO */}
        <SectionLabel label="Info" />
        <RowGroup>
          <SettingsRow
            icon="ℹ️"
            title="Sobre Macro Tracker"
            subtitle="v1.0.0 · Créditos"
            href="/settings/about"
          />
        </RowGroup>
      </div>

      <BottomNav />
    </div>
  );
}

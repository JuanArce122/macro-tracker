"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Target, Salad, Scale, Bell, Palette, Apple, Watch, BarChart3, Info, ChevronRight, LogOut, CalendarDays } from "lucide-react";
import BottomNav from "@/app/components/BottomNav";
import SettingsRow from "@/app/components/SettingsRow";
import Avatar from "@/app/components/ui/Avatar";
import Icon from "@/app/components/ui/Icon";
import { useTheme } from "@/app/hooks/useTheme";
import { useActiveNotifCount } from "@/app/hooks/useNotificationSchedule";

type Profile = {
  name: string | null;
  fitnessGoal: string | null;
};

type Goals = { calories: number; protein: number; carbs: number; fat: number } | null;

const GOAL_LABELS: Record<string, string> = {
  lose: "Perder grasa",
  maintain: "Mantener peso",
  gain: "Ganar músculo",
};

function ProfileCard({ profile }: { profile: Profile | null }) {
  const name = profile?.name ?? "Mi perfil";
  const goal = profile?.fitnessGoal ? GOAL_LABELS[profile.fitnessGoal] : "Sin objetivo configurado";

  return (
    <Link href="/settings/profile">
      <div className="mx-4 mt-4 mb-2 bg-bg-secondary rounded-xl border border-border p-5 flex items-center gap-4 active:bg-bg-tertiary transition-colors duration-200 ease-[var(--ease-editorial)]">
        <Avatar name={profile?.name} size="xl" />
        <div className="flex-1 min-w-0">
          <p className="font-display text-xl tracking-[-0.02em] font-medium text-text-primary truncate leading-tight">{name}</p>
          <p className="text-sm text-text-tertiary mt-1">{goal}</p>
        </div>
        <span className="text-text-tertiary flex-shrink-0">
          <Icon icon={ChevronRight} size={18} />
        </span>
      </div>
    </Link>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-xs uppercase tracking-[0.08em] font-medium text-text-tertiary px-5 pt-6 pb-2">
      {label}
    </p>
  );
}

function RowGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-4 bg-bg-secondary rounded-xl border border-border overflow-hidden divide-y divide-border">
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
  const activeNotifs = useActiveNotifCount();
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
    <div className="flex flex-col flex-1 bg-bg-primary">
      {/* Header */}
      <div className="px-5 pt-7 pb-2">
        <h1 className="font-display text-[40px] leading-[1.1] tracking-[-0.02em] font-medium text-text-primary">Ajustes</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Tarjeta de perfil */}
        <ProfileCard profile={profile} />

        {/* NUTRICIÓN */}
        <SectionLabel label="Nutrición" />
        <RowGroup>
          <SettingsRow
            icon={Target}
            title="Metas diarias"
            subtitle={goalsSubtitle}
            href="/settings/goals"
          />
          <SettingsRow
            icon={Scale}
            title="Peso"
            subtitle="Registrar peso y ver tendencia"
            href="/settings/weight"
          />
          <SettingsRow
            icon={Salad}
            title="Mis alimentos"
            subtitle={foodsSubtitle}
            href="/settings/foods"
          />
          <SettingsRow
            icon={CalendarDays}
            title="Plan semanal"
            subtitle="Genera tu plan de comidas con recetas"
            href="/plan"
          />
        </RowGroup>

        {/* PREFERENCIAS */}
        <SectionLabel label="Preferencias" />
        <RowGroup>
          <SettingsRow
            icon={Bell}
            title="Notificaciones"
            subtitle={notifSubtitle}
            href="/settings/notifications"
          />
          <SettingsRow
            icon={Apple}
            title="Modo de tracking"
            subtitle="Macros exactos o porciones visuales"
            href="/settings/tracking-mode"
          />
          <SettingsRow
            icon={Watch}
            title="Dispositivos"
            subtitle="Fitbit, Oura — pasos, sueño, HRV"
            href="/settings/wearables"
          />
          <SettingsRow
            icon={Palette}
            title="Apariencia"
            subtitle={THEME_LABELS[theme] ?? "Sistema"}
            href="/settings/appearance"
          />
        </RowGroup>

        {/* PRIVACIDAD */}
        <SectionLabel label="Privacidad" />
        <RowGroup>
          <SettingsRow
            icon={BarChart3}
            title="Mis datos"
            subtitle="Exportar CSV · Borrar historial"
            href="/settings/data"
          />
        </RowGroup>

        {/* INFO */}
        <SectionLabel label="Info" />
        <RowGroup>
          <SettingsRow
            icon={Info}
            title="Sobre Macro Tracker"
            subtitle="v1.0.0 · Créditos"
            href="/settings/about"
          />
        </RowGroup>

        {/* CERRAR SESIÓN */}
        <div className="mx-4 mt-4 mb-6">
          <button
            onClick={() => signOut({ callbackUrl: "/auth" })}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-bg-secondary border border-border text-red-600 font-medium text-sm active:bg-bg-tertiary transition-colors duration-200 ease-[var(--ease-editorial)]"
          >
            <Icon icon={LogOut} size={16} />
            Cerrar sesión
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Monitor, Sun, Moon } from "lucide-react";
import { useTheme, type Theme } from "@/app/hooks/useTheme";
import Icon from "@/app/components/ui/Icon";

const OPTIONS: { value: Theme; label: string; icon: LucideIcon; desc: string }[] = [
  { value: "system", label: "Sistema",  icon: Monitor, desc: "Sigue la preferencia del dispositivo" },
  { value: "light",  label: "Claro",    icon: Sun,     desc: "Interfaz siempre en modo claro" },
  { value: "dark",   label: "Oscuro",   icon: Moon,    desc: "Interfaz siempre en modo oscuro" },
];

export default function AppearancePage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 pt-5 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 dark:text-gray-500 p-1 -ml-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Apariencia</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-10 flex flex-col gap-4">
        <p className="text-xs text-gray-400 dark:text-gray-500 px-1">
          El cambio se aplica de inmediato y se recuerda entre sesiones.
        </p>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden divide-y divide-gray-50 dark:divide-gray-700">
          {OPTIONS.map(({ value, label, icon, desc }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className="w-full flex items-center gap-4 px-4 py-4 text-left active:bg-gray-50 dark:active:bg-gray-700/50 transition-colors"
            >
              <span className="w-9 flex items-center justify-center text-gray-500 dark:text-gray-400 flex-shrink-0">
                <Icon icon={icon} size={22} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{desc}</p>
              </div>
              {theme === value ? (
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-gray-200 dark:border-gray-600 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>

        {/* Vista previa */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Vista previa</p>
          <div className="flex gap-3">
            <div className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
              <div className="h-2 w-16 bg-emerald-400 rounded-full mb-2" />
              <div className="h-1.5 w-24 bg-gray-200 dark:bg-gray-600 rounded-full mb-1.5" />
              <div className="h-1.5 w-20 bg-gray-200 dark:bg-gray-600 rounded-full" />
            </div>
            <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 flex flex-col items-center justify-center gap-1">
              <div className="w-8 h-8 rounded-full bg-emerald-400 dark:bg-emerald-500" />
              <div className="h-1.5 w-14 bg-emerald-300 dark:bg-emerald-700 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

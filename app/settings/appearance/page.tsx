"use client";

import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Monitor, Sun, Moon, Check, ChevronLeft } from "lucide-react";
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
    <div className="flex flex-col flex-1 bg-bg-primary">
      {/* Header */}
      <div className="px-5 pt-7 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-text-tertiary active:text-text-primary p-1 -ml-1 transition-colors duration-200 ease-[var(--ease-editorial)]">
          <Icon icon={ChevronLeft} size={20} />
        </button>
        <h1 className="font-display text-3xl tracking-[-0.02em] font-medium text-text-primary">Apariencia</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-10 flex flex-col gap-4">
        <p className="text-xs text-text-tertiary px-1">
          El cambio se aplica de inmediato y se recuerda entre sesiones.
        </p>

        <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden divide-y divide-border">
          {OPTIONS.map(({ value, label, icon, desc }) => {
            const isActive = theme === value;
            return (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left active:bg-bg-tertiary transition-colors duration-200 ease-[var(--ease-editorial)]"
              >
                <span className="w-9 flex items-center justify-center text-text-secondary flex-shrink-0">
                  <Icon icon={icon} size={20} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">{label}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">{desc}</p>
                </div>
                {isActive ? (
                  <span className="w-5 h-5 rounded-full bg-text-primary flex items-center justify-center text-bg-primary flex-shrink-0">
                    <Icon icon={Check} size={12} />
                  </span>
                ) : (
                  <span className="w-5 h-5 rounded-full border border-border flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Vista previa */}
        <div className="bg-bg-secondary rounded-xl border border-border p-5">
          <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary mb-3">Vista previa</p>
          <div className="flex gap-3">
            <div className="flex-1 bg-bg-tertiary rounded-xl p-4">
              <div className="h-2 w-16 bg-accent-primary rounded-full mb-2" />
              <div className="h-1.5 w-24 bg-border rounded-full mb-1.5" />
              <div className="h-1.5 w-20 bg-border rounded-full" />
            </div>
            <div className="flex-1 bg-bg-tertiary rounded-xl p-4 flex flex-col items-center justify-center gap-1.5">
              <div className="w-8 h-8 rounded-full bg-accent-primary" />
              <div className="h-1.5 w-14 bg-border rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

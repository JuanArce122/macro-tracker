"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Target, Apple, Check, Loader2, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Icon from "@/app/components/ui/Icon";

type TrackingMode = "macros" | "habits";

const OPTIONS: { value: TrackingMode; label: string; icon: LucideIcon; desc: string }[] = [
  {
    value: "macros",
    label: "Macros (recomendado)",
    icon: Target,
    desc: "Dashboard tradicional con calorías y macros exactos. Ideal para metas precisas de composición corporal.",
  },
  {
    value: "habits",
    label: "Hábitos",
    icon: Apple,
    desc: "Cuenta porciones visuales (proteína, vegetales, etc.) sin números. Menos preciso, más tranquilo. Bueno si quieres bajarle a la ansiedad con los números.",
  },
];

export default function TrackingModePage() {
  const router = useRouter();
  const [mode, setMode] = useState<TrackingMode>("macros");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d: { trackingMode?: TrackingMode }) => {
        setMode(d.trackingMode ?? "macros");
      })
      .finally(() => setLoading(false));
  }, []);

  async function selectMode(next: TrackingMode) {
    if (next === mode) return;
    setMode(next);
    setSaving(true);
    setSaved(false);
    try {
      // Necesitamos pasar todos los demás campos para que ProfileUpdateSchema
      // los preserve. Hacemos fetch del current state y luego update.
      const current = await fetch("/api/profile").then((r) => r.json());
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: current.name ?? null,
          avatarEmoji: current.avatarEmoji ?? null,
          age: current.age ?? null,
          sex: current.sex ?? null,
          weightKg: current.weightKg ?? null,
          heightCm: current.heightCm ?? null,
          activityLevel: current.activityLevel ?? null,
          fitnessGoal: current.fitnessGoal ?? null,
          countryCode: current.countryCode ?? null,
          trackingMode: next,
        }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      // Revertir si falla
      setMode(mode);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 bg-bg-primary">
      <div className="px-5 pt-7 pb-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-text-tertiary active:text-text-primary p-1 -ml-1 transition-colors duration-200 ease-[var(--ease-editorial)]"
          aria-label="Volver"
        >
          <Icon icon={ChevronLeft} size={20} />
        </button>
        <h1 className="font-serif text-3xl tracking-[-0.02em] text-text-primary">Modo de tracking</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10 flex flex-col gap-4">
        {loading ? (
          <p className="text-text-tertiary text-sm text-center py-12">Cargando…</p>
        ) : (
          <>
            <p className="text-xs text-text-tertiary px-1 leading-relaxed">
              Elige cómo prefieres registrar tus comidas. Puedes cambiar de modo cuando quieras —
              tu historial de macros se conserva.
            </p>

            <div className="flex flex-col gap-3">
              {OPTIONS.map(({ value, label, icon, desc }) => {
                const isActive = mode === value;
                return (
                  <button
                    key={value}
                    onClick={() => selectMode(value)}
                    disabled={saving}
                    aria-pressed={isActive}
                    className={`flex items-start gap-3 px-5 py-4 rounded-xl text-left transition-colors duration-200 ease-[var(--ease-editorial)] border ${
                      isActive
                        ? "bg-text-primary text-bg-primary border-text-primary"
                        : "bg-bg-secondary border-border text-text-primary active:bg-bg-tertiary"
                    } disabled:opacity-60`}
                  >
                    <Icon icon={icon} size={20} className="flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium flex items-center gap-2">
                        {label}
                        {isActive && saved && <Icon icon={Check} size={14} className="opacity-70" />}
                        {isActive && saving && <Icon icon={Loader2} size={14} className="animate-spin opacity-70" />}
                      </p>
                      <p className={`text-xs mt-1.5 leading-relaxed ${isActive ? "opacity-80" : "text-text-tertiary"}`}>
                        {desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="bg-bg-secondary border border-border rounded-xl p-4 flex items-start gap-3">
              <span className="text-text-tertiary flex-shrink-0 mt-0.5">
                <Icon icon={Info} size={16} />
              </span>
              <p className="text-xs text-text-tertiary leading-relaxed">
                El modo hábitos es ideal si te has sentido ansioso/a con los números, si vienes saliendo de un
                periodo intenso de tracking, o si simplemente quieres una relación más relajada con la comida.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

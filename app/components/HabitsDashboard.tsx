"use client";

import { useEffect, useState } from "react";
import { Plus, Minus, Loader2 } from "lucide-react";
import Icon from "@/app/components/ui/Icon";

type Portion = "protein" | "veg" | "carb" | "fat" | "fruit";

type HabitEntry = {
  date: string;
  proteinPortions: number;
  vegPortions: number;
  carbPortions: number;
  fatPortions: number;
  fruitPortions: number;
};

type Props = {
  date: string;
  /** Goals fitness para definir metas por porciones (lose / maintain / gain) */
  fitnessGoal?: "lose" | "maintain" | "gain" | null;
};

// ─── Metas de porciones por fitnessGoal (referencia visual, no estricta) ──

const PORTION_GOALS: Record<NonNullable<Props["fitnessGoal"]> | "default", Record<Portion, number>> = {
  lose:     { protein: 4, veg: 5, carb: 3, fat: 2, fruit: 2 },
  maintain: { protein: 5, veg: 5, carb: 4, fat: 3, fruit: 3 },
  gain:     { protein: 6, veg: 5, carb: 5, fat: 3, fruit: 3 },
  default:  { protein: 5, veg: 5, carb: 4, fat: 3, fruit: 3 },
};

const PORTION_META: { key: Portion; field: keyof HabitEntry; label: string; icon: string; hint: string }[] = [
  { key: "protein", field: "proteinPortions", label: "Proteína", icon: "🍗", hint: "~palma de mano" },
  { key: "veg",     field: "vegPortions",     label: "Verdura",  icon: "🥦", hint: "~puño" },
  { key: "carb",    field: "carbPortions",    label: "Carbo",    icon: "🍚", hint: "~puño cerrado" },
  { key: "fat",     field: "fatPortions",     label: "Grasa",    icon: "🥑", hint: "~pulgar" },
  { key: "fruit",   field: "fruitPortions",   label: "Fruta",    icon: "🍎", hint: "~puño" },
];

export default function HabitsDashboard({ date, fitnessGoal }: Props) {
  const [entry, setEntry] = useState<HabitEntry | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pendingPortion, setPendingPortion] = useState<Portion | null>(null);
  const goals = PORTION_GOALS[fitnessGoal ?? "default"] ?? PORTION_GOALS.default;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/habits?date=${encodeURIComponent(date)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: HabitEntry | null) => { if (!cancelled && d) setEntry(d); })
      .catch(() => { /* silent */ })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [date]);

  async function update(portion: Portion, delta: number) {
    if (!entry) return;
    const meta = PORTION_META.find((m) => m.key === portion);
    if (!meta) return;

    const current = entry[meta.field] as number;
    const next = Math.max(0, Math.min(99, current + delta));
    if (next === current) return;

    // Optimistic update
    const prevEntry = entry;
    setEntry({ ...entry, [meta.field]: next });
    setPendingPortion(portion);

    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, [meta.field]: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setEntry(prevEntry);
    } finally {
      setPendingPortion(null);
    }
  }

  if (!entry) {
    // F13: si terminó de cargar y no hay entry, la carga falló → mensaje en vez
    // de un spinner eterno.
    return (
      <div className="bg-bg-secondary border border-border rounded-xl p-5 mx-4 my-3 flex items-center justify-center h-32 text-center">
        {loaded ? (
          <p className="text-xs text-text-tertiary">No pudimos cargar tus hábitos. Reintenta más tarde.</p>
        ) : (
          <Icon icon={Loader2} size={20} className="text-text-tertiary animate-spin" />
        )}
      </div>
    );
  }

  // Calcular progreso global como suma de % de cada categoría
  const totalCurrent = PORTION_META.reduce((s, m) => s + (entry[m.field] as number), 0);
  const totalGoal = Object.values(goals).reduce((s, g) => s + g, 0);
  const overall = totalGoal > 0 ? Math.min(1, totalCurrent / totalGoal) : 0;

  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-5 mx-4 my-3 flex flex-col gap-3">
      <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary">Hábitos de hoy</p>

      {PORTION_META.map((m) => {
        const current = entry[m.field] as number;
        const goal = goals[m.key];
        const isPending = pendingPortion === m.key;
        return (
          <div
            key={m.key}
            className="flex items-center justify-between py-2 border-b border-border last:border-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl flex-shrink-0">{m.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">{m.label}</p>
                <p className="text-xs text-text-tertiary tabular-nums">
                  {current} / {goal} porc. · {m.hint}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => update(m.key, -1)}
                disabled={isPending || current === 0}
                aria-label={`Quitar porción de ${m.label}`}
                className="w-8 h-8 rounded-full bg-bg-tertiary text-text-primary flex items-center justify-center active:opacity-70 transition-opacity disabled:opacity-30"
              >
                <Icon icon={Minus} size={14} />
              </button>
              <span className="w-6 text-center text-sm font-medium tabular-nums">
                {isPending ? <Icon icon={Loader2} size={12} className="animate-spin inline" /> : current}
              </span>
              <button
                onClick={() => update(m.key, 1)}
                disabled={isPending || current >= 99}
                aria-label={`Añadir porción de ${m.label}`}
                className="w-8 h-8 rounded-full bg-text-primary text-bg-primary flex items-center justify-center active:opacity-90 transition-opacity disabled:opacity-30"
              >
                <Icon icon={Plus} size={14} />
              </button>
            </div>
          </div>
        );
      })}

      <div className="pt-2">
        <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-text-primary transition-all duration-300 ease-[var(--ease-editorial)]"
            style={{ width: `${overall * 100}%` }}
          />
        </div>
        <p className="text-xs text-text-tertiary text-center mt-2 tabular-nums">
          {Math.round(overall * 100)}% del día
        </p>
      </div>
    </div>
  );
}

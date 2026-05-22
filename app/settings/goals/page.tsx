"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check, Loader2 } from "lucide-react";
import Icon from "@/app/components/ui/Icon";

type Goals = { calories: number; protein: number; carbs: number; fat: number };

const MACRO_FIELDS: { key: keyof Goals; label: string; unit: string; textColor: string }[] = [
  { key: "calories", label: "Calorías",      unit: "kcal", textColor: "text-text-primary" },
  { key: "protein",  label: "Proteína",      unit: "g",    textColor: "text-macro-protein" },
  { key: "carbs",    label: "Carbohidratos", unit: "g",    textColor: "text-macro-carbs" },
  { key: "fat",      label: "Grasa",         unit: "g",    textColor: "text-macro-fat" },
];

type SaveStatus = "idle" | "saving" | "saved";

export default function GoalsPage() {
  const router = useRouter();
  const [goals, setGoals] = useState<Goals>({ calories: 2000, protein: 150, carbs: 200, fat: 65 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then((d) => setGoals({ calories: d.calories, protein: d.protein, carbs: d.carbs, fat: d.fat }))
      .finally(() => setLoading(false));
  }, []);

  // Auto-save con debounce de 700ms. Todos los setStatus ocurren dentro
  // de callbacks async (setTimeout, .then/.catch), nunca sync en el
  // body del efecto.
  useEffect(() => {
    if (loading) return;

    let cancelled = false;
    let clearTimer: ReturnType<typeof setTimeout> | null = null;

    const debounceTimer = setTimeout(async () => {
      setStatus("saving");
      try {
        await fetch("/api/goals", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(goals),
        });
        if (cancelled) return;
        setStatus("saved");
        clearTimer = setTimeout(() => {
          if (!cancelled) setStatus("idle");
        }, 2000);
      } catch {
        if (!cancelled) setStatus("idle");
      }
    }, 700);

    return () => {
      cancelled = true;
      clearTimeout(debounceTimer);
      if (clearTimer) clearTimeout(clearTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals]);

  const saving = status === "saving";
  const saved = status === "saved";

  const pPct = Math.round((goals.protein * 4 / (goals.calories || 1)) * 100);
  const cPct = Math.round((goals.carbs   * 4 / (goals.calories || 1)) * 100);
  const fPct = Math.round((goals.fat     * 9 / (goals.calories || 1)) * 100);

  return (
    <div className="flex flex-col flex-1 bg-bg-primary">
      {/* Header */}
      <div className="px-5 pt-7 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.back()} className="text-text-tertiary active:text-text-primary p-1 -ml-1 transition-colors duration-200 ease-[var(--ease-editorial)]">
            <Icon icon={ChevronLeft} size={20} />
          </button>
          <h1 className="font-serif text-3xl tracking-[-0.02em] text-text-primary truncate">Metas diarias</h1>
        </div>
        {/* Indicador auto-save */}
        <div className="h-6 flex items-center flex-shrink-0">
          {saving && (
            <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
              <Icon icon={Loader2} size={12} className="animate-spin" />
              Guardando
            </div>
          )}
          {saved && !saving && (
            <div className="flex items-center gap-1 text-xs text-macro-protein">
              <Icon icon={Check} size={14} />
              Guardado
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-8 flex flex-col gap-3">
        {loading ? (
          <p className="text-text-tertiary text-sm text-center py-12">Cargando…</p>
        ) : (
          <>
            <p className="text-xs text-text-tertiary px-1 pb-2">
              Las metas se guardan automáticamente al editar.
            </p>

            {MACRO_FIELDS.map(({ key, label, unit, textColor }) => (
              <div key={key} className="bg-bg-secondary rounded-xl border border-border p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase tracking-[0.08em] text-text-tertiary">{label}</span>
                  <span className="text-xs text-text-tertiary">{unit} / día</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={goals[key] || ""}
                    onChange={(e) => {
                      setGoals((prev) => ({ ...prev, [key]: Number(e.target.value) || 0 }));
                    }}
                    className={`flex-1 bg-transparent border-0 outline-none font-serif text-4xl leading-none tabular-nums tracking-[-0.02em] ${textColor} focus:outline-none p-0`}
                  />
                  <span className="text-text-tertiary text-sm font-medium w-10">{unit}</span>
                </div>
              </div>
            ))}

            {/* Distribución calórica */}
            <div className="bg-bg-secondary rounded-xl border border-border p-5">
              <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary mb-3">Distribución calórica estimada</p>
              <div className="flex gap-0.5 h-2 rounded-full overflow-hidden mb-3 bg-bg-tertiary">
                <div className="bg-macro-protein transition-all duration-200 ease-[var(--ease-editorial)]" style={{ width: `${pPct}%` }} />
                <div className="bg-macro-carbs transition-all duration-200 ease-[var(--ease-editorial)]" style={{ width: `${cPct}%` }} />
                <div className="bg-macro-fat transition-all duration-200 ease-[var(--ease-editorial)]" style={{ width: `${fPct}%` }} />
              </div>
              <div className="flex justify-between text-xs tabular-nums">
                <span><span className="text-macro-protein font-medium">P</span> <span className="text-text-secondary">{pPct}%</span></span>
                <span><span className="text-macro-carbs font-medium">C</span> <span className="text-text-secondary">{cPct}%</span></span>
                <span><span className="text-macro-fat font-medium">G</span> <span className="text-text-secondary">{fPct}%</span></span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

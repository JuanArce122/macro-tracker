"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Goals = { calories: number; protein: number; carbs: number; fat: number };

const MACRO_FIELDS: { key: keyof Goals; label: string; unit: string; color: string; ring: string }[] = [
  { key: "calories", label: "Calorías",      unit: "kcal", color: "text-emerald-600", ring: "focus:ring-emerald-300 border-emerald-200 dark:border-emerald-800" },
  { key: "protein",  label: "Proteína",      unit: "g",    color: "text-blue-500",    ring: "focus:ring-blue-300 border-blue-200 dark:border-blue-800" },
  { key: "carbs",    label: "Carbohidratos", unit: "g",    color: "text-amber-500",   ring: "focus:ring-amber-300 border-amber-200 dark:border-amber-800" },
  { key: "fat",      label: "Grasa",         unit: "g",    color: "text-violet-500",  ring: "focus:ring-violet-300 border-violet-200 dark:border-violet-800" },
];

export default function GoalsPage() {
  const router = useRouter();
  const [goals, setGoals] = useState<Goals>({ calories: 2000, protein: 150, carbs: 200, fat: 65 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then((d) => setGoals({ calories: d.calories, protein: d.protein, carbs: d.carbs, fat: d.fat }))
      .finally(() => setLoading(false));
  }, []);

  // Auto-save con debounce de 700ms
  useEffect(() => {
    if (loading) return;
    setSaved(false);
    const t = setTimeout(async () => {
      setSaving(true);
      await fetch("/api/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goals),
      });
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 700);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals]);

  const pPct = Math.round((goals.protein * 4 / (goals.calories || 1)) * 100);
  const cPct = Math.round((goals.carbs   * 4 / (goals.calories || 1)) * 100);
  const fPct = Math.round((goals.fat     * 9 / (goals.calories || 1)) * 100);

  return (
    <div className="flex flex-col flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 dark:text-gray-500 p-1 -ml-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Metas diarias</h1>
        </div>
        {/* Indicador auto-save */}
        <div className="h-6 flex items-center">
          {saving && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Guardando
            </div>
          )}
          {saved && !saving && (
            <div className="flex items-center gap-1 text-xs text-emerald-500">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Guardado
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-8 flex flex-col gap-4">
        {loading ? (
          <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-12">Cargando…</p>
        ) : (
          <>
            <p className="text-xs text-gray-400 dark:text-gray-500 px-1">
              Las metas se guardan automáticamente al editar.
            </p>

            {MACRO_FIELDS.map(({ key, label, unit, color, ring }) => (
              <div key={key} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`font-semibold text-sm ${color}`}>{label}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{unit} / día</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={goals[key] || ""}
                    onChange={(e) => {
                      setGoals((prev) => ({ ...prev, [key]: Number(e.target.value) || 0 }));
                    }}
                    className={`flex-1 border dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-4 py-3 text-2xl font-bold focus:outline-none focus:ring-2 ${ring}`}
                  />
                  <span className="text-gray-400 dark:text-gray-500 font-medium text-sm w-10">{unit}</span>
                </div>
              </div>
            ))}

            {/* Distribución calórica */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-3">Distribución calórica estimada</p>
              <div className="flex gap-1 h-3 rounded-full overflow-hidden mb-3">
                <div className="bg-blue-400 transition-all" style={{ width: `${pPct}%` }} />
                <div className="bg-amber-400 transition-all" style={{ width: `${cPct}%` }} />
                <div className="bg-violet-400 transition-all" style={{ width: `${fPct}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span><span className="text-blue-500 font-semibold">P</span> {pPct}%</span>
                <span><span className="text-amber-500 font-semibold">C</span> {cPct}%</span>
                <span><span className="text-violet-500 font-semibold">G</span> {fPct}%</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

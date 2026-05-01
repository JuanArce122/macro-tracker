"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/app/components/BottomNav";

type Goals = { calories: number; protein: number; carbs: number; fat: number };

const FIELDS: { key: keyof Goals; label: string; unit: string; color: string; emoji: string }[] = [
  { key: "calories", label: "Calorías",      unit: "kcal", color: "emerald", emoji: "🔥" },
  { key: "protein",  label: "Proteína",      unit: "g",    color: "blue",    emoji: "💪" },
  { key: "carbs",    label: "Carbohidratos", unit: "g",    color: "amber",   emoji: "🌾" },
  { key: "fat",      label: "Grasa",         unit: "g",    color: "violet",  emoji: "🥑" },
];

const COLOR_MAP: Record<string, string> = {
  emerald: "focus:ring-emerald-300 border-emerald-200",
  blue:    "focus:ring-blue-300 border-blue-200",
  amber:   "focus:ring-amber-300 border-amber-200",
  violet:  "focus:ring-violet-300 border-violet-200",
};

const LABEL_COLOR: Record<string, string> = {
  emerald: "text-emerald-600",
  blue:    "text-blue-500",
  amber:   "text-amber-500",
  violet:  "text-violet-500",
};

export default function SettingsPage() {
  const [goals, setGoals] = useState<Goals>({ calories: 2000, protein: 150, carbs: 200, fat: 65 });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then((data) => setGoals({ calories: data.calories, protein: data.protein, carbs: data.carbs, fat: data.fat }))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(goals),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleChange(key: keyof Goals, val: string) {
    setGoals((prev) => ({ ...prev, [key]: Number(val) || 0 }));
    setSaved(false);
  }

  return (
    <div className="flex flex-col flex-1 bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 pt-5 pb-4">
        <h1 className="text-2xl font-bold text-gray-800">Ajustes</h1>
        <p className="text-sm text-gray-400 mt-0.5">Configura tus metas diarias de macros</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-24 flex flex-col gap-4">
        {loading ? (
          <p className="text-gray-400 text-sm text-center py-12">Cargando…</p>
        ) : (
          <>
            {FIELDS.map(({ key, label, unit, color, emoji }) => (
              <div key={key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{emoji}</span>
                  <span className={`font-semibold text-sm ${LABEL_COLOR[color]}`}>{label}</span>
                  <span className="text-xs text-gray-400 ml-auto">por día</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={goals[key] || ""}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className={`flex-1 border rounded-xl px-4 py-3 text-2xl font-bold focus:outline-none focus:ring-2 ${COLOR_MAP[color]}`}
                  />
                  <span className="text-gray-400 font-medium text-sm w-10">{unit}</span>
                </div>
              </div>
            ))}

            {/* Resumen visual */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-medium text-gray-400 mb-3">Resumen de metas</p>
              <div className="grid grid-cols-4 gap-2 text-center">
                {FIELDS.map(({ key, label, unit, color }) => (
                  <div key={key}>
                    <p className={`text-lg font-bold ${LABEL_COLOR[color]}`}>{goals[key]}</p>
                    <p className="text-xs text-gray-400">{unit}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50">
                <p className="text-xs text-gray-400 text-center">
                  Distribución calórica: {Math.round((goals.protein * 4 / goals.calories) * 100)}% P · {Math.round((goals.carbs * 4 / goals.calories) * 100)}% C · {Math.round((goals.fat * 9 / goals.calories) * 100)}% G
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Botón guardar fijo */}
      <div className="fixed bottom-16 left-0 right-0 px-4 pb-2 max-w-[430px] mx-auto">
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className={`w-full font-semibold rounded-2xl py-4 transition-all flex items-center justify-center gap-2 shadow-lg ${
            saved
              ? "bg-emerald-500 text-white"
              : "bg-gray-800 text-white hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400"
          }`}
        >
          {saving ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Guardando…
            </>
          ) : saved ? (
            <>✓ Metas guardadas</>
          ) : (
            "Guardar metas"
          )}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/app/components/BottomNav";
import type { Food } from "@/lib/foods";

type Goals = { calories: number; protein: number; carbs: number; fat: number };

type Profile = {
  gender: "male" | "female";
  age: string;
  weightKg: string;
  heightCm: string;
  activity: "sedentary" | "light" | "moderate" | "active" | "very_active";
  goal: "lose" | "maintain" | "gain";
};

type TDEEResult = { bmr: number; tdee: number; calories: number; protein: number; carbs: number; fat: number } | null;

const ACTIVITY_LABELS: Record<Profile["activity"], string> = {
  sedentary: "Sedentario (sin ejercicio)",
  light: "Ligero (1-2 días/sem)",
  moderate: "Moderado (3-4 días/sem)",
  active: "Activo (5-6 días/sem)",
  very_active: "Muy activo (2x/día)",
};

const GOAL_LABELS: Record<Profile["goal"], string> = {
  lose: "Perder grasa",
  maintain: "Mantener peso",
  gain: "Ganar músculo",
};

const MACRO_FIELDS: { key: keyof Goals; label: string; unit: string; color: string }[] = [
  { key: "calories", label: "Calorías",      unit: "kcal", color: "emerald" },
  { key: "protein",  label: "Proteína",      unit: "g",    color: "blue"    },
  { key: "carbs",    label: "Carbohidratos", unit: "g",    color: "amber"   },
  { key: "fat",      label: "Grasa",         unit: "g",    color: "violet"  },
];

const LABEL_COLOR: Record<string, string> = {
  emerald: "text-emerald-600", blue: "text-blue-500", amber: "text-amber-500", violet: "text-violet-500",
};
const RING_COLOR: Record<string, string> = {
  emerald: "focus:ring-emerald-300 border-emerald-200", blue: "focus:ring-blue-300 border-blue-200",
  amber: "focus:ring-amber-300 border-amber-200", violet: "focus:ring-violet-300 border-violet-200",
};

const CUSTOM_KEY = "custom_foods";

function loadCustomFoods(): Food[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? "[]"); } catch { return []; }
}

function calcTDEE(p: Profile): TDEEResult {
  const w = Number(p.weightKg), h = Number(p.heightCm), a = Number(p.age);
  if (!w || !h || !a) return null;
  const bmr = Math.round(p.gender === "male" ? 10*w + 6.25*h - 5*a + 5 : 10*w + 6.25*h - 5*a - 161);
  const factors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  const tdee = Math.round(bmr * factors[p.activity]);
  const calories = p.goal === "lose" ? tdee - 400 : p.goal === "gain" ? tdee + 300 : tdee;
  const protein = Math.round(p.goal === "maintain" ? w * 1.6 : w * 2.0);
  const fat = Math.round(w * 0.8);
  const carbs = Math.max(50, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { bmr, tdee, calories, protein, carbs, fat };
}

type NewFoodForm = { nombre: string; cal: string; p: string; c: string; f: string };

export default function SettingsPage() {
  const [goals, setGoals] = useState<Goals>({ calories: 2000, protein: 150, carbs: 200, fat: 65 });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const [showTDEE, setShowTDEE] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    gender: "male", age: "", weightKg: "", heightCm: "",
    activity: "moderate", goal: "maintain",
  });
  const tdeeResult = calcTDEE(profile);

  const [customFoods, setCustomFoods] = useState<Food[]>([]);
  const [showAddFood, setShowAddFood] = useState(false);
  const [newFood, setNewFood] = useState<NewFoodForm>({ nombre: "", cal: "", p: "", c: "", f: "" });

  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then((d) => setGoals({ calories: d.calories, protein: d.protein, carbs: d.carbs, fat: d.fat }))
      .finally(() => setLoading(false));
    setCustomFoods(loadCustomFoods());
  }, []);

  async function handleSave() {
    setSaving(true); setSaved(false);
    await fetch("/api/goals", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(goals) });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function applyTDEE() {
    if (!tdeeResult) return;
    setGoals({ calories: tdeeResult.calories, protein: tdeeResult.protein, carbs: tdeeResult.carbs, fat: tdeeResult.fat });
    setShowTDEE(false);
  }

  function handleAddFood() {
    const { nombre, cal, p, c, f } = newFood;
    if (!nombre.trim() || !Number(cal)) return;
    const nextId = 10000 + customFoods.length + Date.now() % 1000;
    const food: Food = {
      id: nextId,
      nombre: nombre.trim(),
      categoria: "proteina",
      cal: Number(cal), p: Number(p) || 0, c: Number(c) || 0, f: Number(f) || 0,
    };
    const next = [...customFoods, food];
    setCustomFoods(next);
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
    setNewFood({ nombre: "", cal: "", p: "", c: "", f: "" });
    setShowAddFood(false);
  }

  function deleteCustomFood(id: number) {
    const next = customFoods.filter((f) => f.id !== id);
    setCustomFoods(next);
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
  }

  return (
    <div className="flex flex-col flex-1 bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 pt-5 pb-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Ajustes</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Metas diarias, calculadora y mis alimentos</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-32 flex flex-col gap-4">
        {loading ? <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-12">Cargando…</p> : (
          <>
            {/* ── METAS ─────────────────────────────────────────────── */}
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">Metas diarias</p>

            {MACRO_FIELDS.map(({ key, label, unit, color }) => (
              <div key={key} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`font-semibold text-sm ${LABEL_COLOR[color]}`}>{label}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{unit} / día</span>
                </div>
                <div className="flex items-center gap-3">
                  <input type="number" inputMode="numeric" value={goals[key] || ""}
                    onChange={(e) => { setGoals((prev) => ({ ...prev, [key]: Number(e.target.value) || 0 })); setSaved(false); }}
                    className={`flex-1 border dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-4 py-3 text-2xl font-bold focus:outline-none focus:ring-2 ${RING_COLOR[color]}`} />
                  <span className="text-gray-400 dark:text-gray-500 font-medium text-sm w-10">{unit}</span>
                </div>
              </div>
            ))}

            {/* Distribución */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">Distribución calórica estimada</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {Math.round((goals.protein * 4 / (goals.calories || 1)) * 100)}% P ·{" "}
                {Math.round((goals.carbs   * 4 / (goals.calories || 1)) * 100)}% C ·{" "}
                {Math.round((goals.fat     * 9 / (goals.calories || 1)) * 100)}% G
              </p>
            </div>

            {/* ── CALCULADORA TDEE ──────────────────────────────────── */}
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 mt-2">Calcular metas</p>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowTDEE((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-4 active:bg-gray-50 dark:active:bg-gray-700"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🧮</span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Calculadora TDEE</span>
                </div>
                <svg className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${showTDEE ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showTDEE && (
                <div className="border-t border-gray-100 dark:border-gray-700 px-4 pb-4 flex flex-col gap-3">
                  {/* Género */}
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {(["male", "female"] as const).map((g) => (
                      <button key={g} onClick={() => setProfile((p) => ({ ...p, gender: g }))}
                        className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          profile.gender === g ? "bg-emerald-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                        {g === "male" ? "♂ Hombre" : "♀ Mujer"}
                      </button>
                    ))}
                  </div>

                  {/* Datos básicos */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Edad", key: "age" as const, placeholder: "25", suffix: "años" },
                      { label: "Peso", key: "weightKg" as const, placeholder: "70", suffix: "kg" },
                      { label: "Altura", key: "heightCm" as const, placeholder: "175", suffix: "cm" },
                    ].map(({ label, key, placeholder, suffix }) => (
                      <div key={key}>
                        <label className="text-xs text-gray-400 dark:text-gray-500 block mb-1">{label}</label>
                        <div className="relative">
                          <input type="number" inputMode="decimal" placeholder={placeholder}
                            value={profile[key]}
                            onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
                            className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500">{suffix}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actividad */}
                  <div>
                    <label className="text-xs text-gray-400 dark:text-gray-500 block mb-1">Actividad</label>
                    <select value={profile.activity}
                      onChange={(e) => setProfile((p) => ({ ...p, activity: e.target.value as Profile["activity"] }))}
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-gray-700 dark:text-gray-100">
                      {(Object.entries(ACTIVITY_LABELS) as [Profile["activity"], string][]).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Objetivo */}
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(GOAL_LABELS) as [Profile["goal"], string][]).map(([k, v]) => (
                      <button key={k} onClick={() => setProfile((p) => ({ ...p, goal: k }))}
                        className={`py-2.5 rounded-xl text-xs font-medium transition-colors text-center ${
                          profile.goal === k ? "bg-emerald-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                        {v}
                      </button>
                    ))}
                  </div>

                  {/* Resultado */}
                  {tdeeResult && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl p-3 flex flex-col gap-2">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                        BMR {tdeeResult.bmr} · TDEE {tdeeResult.tdee} kcal/día
                      </p>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div><p className="text-base font-bold text-emerald-600">{tdeeResult.calories}</p><p className="text-xs text-gray-400 dark:text-gray-500">kcal</p></div>
                        <div><p className="text-base font-bold text-blue-500">{tdeeResult.protein}g</p><p className="text-xs text-gray-400 dark:text-gray-500">prot.</p></div>
                        <div><p className="text-base font-bold text-amber-500">{tdeeResult.carbs}g</p><p className="text-xs text-gray-400 dark:text-gray-500">carbs</p></div>
                        <div><p className="text-base font-bold text-violet-500">{tdeeResult.fat}g</p><p className="text-xs text-gray-400 dark:text-gray-500">grasa</p></div>
                      </div>
                      <button onClick={applyTDEE}
                        className="w-full bg-emerald-500 text-white font-semibold rounded-xl py-2.5 text-sm active:bg-emerald-600 transition-colors">
                        Aplicar estas metas
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── MIS ALIMENTOS ─────────────────────────────────────── */}
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 mt-2">Mis alimentos</p>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              {customFoods.length > 0 && customFoods.map((food) => (
                <div key={food.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{food.nombre}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{food.cal} kcal · {food.p}g P · {food.c}g C · {food.f}g G — por 100g</p>
                  </div>
                  <button onClick={() => deleteCustomFood(food.id)} className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-400 active:text-red-500 transition-colors flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}

              {/* Formulario añadir */}
              {showAddFood ? (
                <div className="px-4 py-4 flex flex-col gap-3 border-t border-gray-50 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Nuevo alimento</p>
                  <input type="text" placeholder="Nombre *" value={newFood.nombre}
                    onChange={(e) => setNewFood((p) => ({ ...p, nombre: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                  <p className="text-xs text-gray-400 dark:text-gray-500 -mb-1">Por cada 100g:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Calorías (kcal) *", key: "cal" as const },
                      { label: "Proteína (g)",      key: "p"   as const },
                      { label: "Carbohidratos (g)", key: "c"   as const },
                      { label: "Grasa (g)",         key: "f"   as const },
                    ].map(({ label, key }) => (
                      <div key={key}>
                        <label className="text-xs text-gray-400 dark:text-gray-500 block mb-1">{label}</label>
                        <input type="number" inputMode="decimal" placeholder="0" value={newFood[key]}
                          onChange={(e) => setNewFood((p) => ({ ...p, [key]: e.target.value }))}
                          className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowAddFood(false); setNewFood({ nombre: "", cal: "", p: "", c: "", f: "" }); }}
                      className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium rounded-xl py-2.5 text-sm active:bg-gray-50 dark:active:bg-gray-700">
                      Cancelar
                    </button>
                    <button onClick={handleAddFood} disabled={!newFood.nombre.trim() || !Number(newFood.cal)}
                      className="flex-[2] bg-emerald-500 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 text-white font-semibold rounded-xl py-2.5 text-sm active:bg-emerald-600">
                      Guardar
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAddFood(true)}
                  className="w-full flex items-center gap-2 px-4 py-3.5 text-sm font-medium text-emerald-600 active:bg-gray-50 dark:active:bg-gray-700 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar alimento
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Guardar metas */}
      <div className="fixed bottom-16 left-0 right-0 px-4 pb-2 max-w-[430px] mx-auto">
        <button onClick={handleSave} disabled={saving || loading}
          className={`w-full font-semibold rounded-2xl py-4 transition-all flex items-center justify-center gap-2 shadow-lg ${
            saved ? "bg-emerald-500 text-white" : "bg-gray-800 dark:bg-gray-700 text-white hover:bg-gray-700 dark:hover:bg-gray-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500"}`}>
          {saving ? (
            <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>Guardando…</>
          ) : saved ? <>✓ Metas guardadas</> : "Guardar metas"}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

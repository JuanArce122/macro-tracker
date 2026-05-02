"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { MealItem } from "./add/StepCamera";
import { calcMacros } from "@/lib/foods";
import type { Food } from "@/lib/foods";
import { useFoodSearch } from "@/app/hooks/useFoodSearch";

type Meal = {
  id: number;
  category: string;
  name: string;
  weightG: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  items?: string | null;
};

type Category = "desayuno" | "almuerzo" | "cena" | "snack";

const CATEGORIES: { key: Category; label: string; emoji: string }[] = [
  { key: "desayuno", label: "Desayuno", emoji: "🌅" },
  { key: "almuerzo", label: "Almuerzo", emoji: "☀️" },
  { key: "cena",     label: "Cena",     emoji: "🌙" },
  { key: "snack",    label: "Snack",    emoji: "🍎" },
];

type EditableItem = MealItem & {
  id: string;
  _baseWeight: number;
  _baseCalorias: number;
  _baseProteina: number;
  _baseCarbs: number;
  _baseGrasa: number;
};

function makeEditable(items: MealItem[]): EditableItem[] {
  return items.map((item, i) => ({
    ...item,
    id: `${i}-${Date.now()}`,
    _baseWeight: item.pesoG,
    _baseCalorias: item.calorias,
    _baseProteina: item.proteina,
    _baseCarbs: item.carbs,
    _baseGrasa: item.grasa,
  }));
}

function calcTotals(items: EditableItem[]) {
  return items.reduce(
    (acc, item) => ({
      pesoG: acc.pesoG + item.pesoG,
      calorias: acc.calorias + item.calorias,
      proteina: acc.proteina + item.proteina,
      carbs: acc.carbs + item.carbs,
      grasa: acc.grasa + item.grasa,
    }),
    { pesoG: 0, calorias: 0, proteina: 0, carbs: 0, grasa: 0 }
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 0.85) return <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Alta</span>;
  if (confidence >= 0.6)  return <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Media</span>;
  return <span className="text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Baja</span>;
}

function FoodDropdown({ query, onSelect }: { query: string; onSelect: (food: Food) => void }) {
  const { results, loading } = useFoodSearch(query);
  if (loading) return (
    <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl px-4 py-3 flex items-center gap-2">
      <svg className="w-4 h-4 text-emerald-400 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      <span className="text-sm text-gray-400">Buscando…</span>
    </div>
  );
  if (results.length === 0) return null;
  return (
    <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden">
      {results.map((food) => (
        <button key={food.id} type="button"
          onMouseDown={(e) => { e.preventDefault(); onSelect(food); }}
          className="w-full flex items-start gap-2 px-4 py-2.5 text-left active:bg-emerald-50 dark:active:bg-emerald-900/20 border-b border-gray-50 dark:border-gray-700 last:border-0">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-800 dark:text-gray-100 font-medium truncate">{food.nombre}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-gray-400 dark:text-gray-500">{food.cal} kcal/100g</span>
              {food.source === "openfoodfacts" && (
                <span className="text-[10px] font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full">OFF</span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

type Props = {
  meal: Meal | null;
  onClose: () => void;
};

export default function EditMealSheet({ meal, onClose }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState<Category>("snack");
  const [name, setName] = useState("");
  const [items, setItems] = useState<EditableItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nameSearch, setNameSearch] = useState<{ id: string; query: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNameSearch(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function applyFoodFromDB(itemId: string, food: Food, currentWeight: number) {
    const weight = currentWeight > 0 ? currentWeight : 100;
    const macros = calcMacros(food, weight);
    setItems((prev) =>
      prev.map((item) =>
        item.id !== itemId ? item : {
          ...item,
          nombre: food.nombre,
          pesoG: weight,
          calorias: macros.calorias,
          proteina: macros.proteina,
          carbs: macros.carbs,
          grasa: macros.grasa,
          _baseWeight: weight,
          _baseCalorias: macros.calorias,
          _baseProteina: macros.proteina,
          _baseCarbs: macros.carbs,
          _baseGrasa: macros.grasa,
        }
      )
    );
    setNameSearch(null);
  }

  // Modo sin ítems (comidas viejas sin segregación)
  const [weightG, setWeightG] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  const hasItems = items.length > 0;

  useEffect(() => {
    if (!meal) return;
    setCategory(meal.category as Category);
    setName(meal.name);
    setError(null);
    setExpandedId(null);

    if (meal.items) {
      try {
        const parsed: MealItem[] = JSON.parse(meal.items);
        setItems(makeEditable(parsed));
      } catch {
        setItems([]);
      }
    } else {
      setItems([]);
    }

    setWeightG(String(meal.weightG));
    setCalories(String(meal.calories));
    setProtein(String(meal.protein));
    setCarbs(String(meal.carbs));
    setFat(String(meal.fat));
  }, [meal]);

  function updateItem(id: string, field: keyof MealItem, value: string | number) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: typeof value === "string" ? Number(value) || 0 : value } : item
      )
    );
  }

  function updateItemWeight(id: string, newWeight: number) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const ratio = item._baseWeight > 0 ? newWeight / item._baseWeight : 0;
        return {
          ...item,
          pesoG: newWeight,
          calorias: Math.round(item._baseCalorias * ratio),
          proteina: Math.round(item._baseProteina * ratio * 10) / 10,
          carbs: Math.round(item._baseCarbs * ratio * 10) / 10,
          grasa: Math.round(item._baseGrasa * ratio * 10) / 10,
        };
      })
    );
  }

  function updateItemUnits(id: string, newUnits: number) {
    if (newUnits < 1) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const ratio = newUnits / item.unidades;
        const newPeso = Math.round(item.pesoG * ratio);
        const newCalorias = Math.round(item.calorias * ratio);
        const newProteina = Math.round(item.proteina * ratio * 10) / 10;
        const newCarbs = Math.round(item.carbs * ratio * 10) / 10;
        const newGrasa = Math.round(item.grasa * ratio * 10) / 10;
        return {
          ...item,
          unidades: newUnits,
          pesoG: newPeso,
          calorias: newCalorias,
          proteina: newProteina,
          carbs: newCarbs,
          grasa: newGrasa,
          _baseWeight: newPeso,
          _baseCalorias: newCalorias,
          _baseProteina: newProteina,
          _baseCarbs: newCarbs,
          _baseGrasa: newGrasa,
        };
      })
    );
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function addItem() {
    const newItem: EditableItem = {
      id: `manual-${Date.now()}`,
      nombre: "Ingrediente",
      unidades: 1,
      pesoG: 0,
      calorias: 0,
      proteina: 0,
      carbs: 0,
      grasa: 0,
      confianza: 1.0,
      _baseWeight: 0,
      _baseCalorias: 0,
      _baseProteina: 0,
      _baseCarbs: 0,
      _baseGrasa: 0,
    };
    setItems((prev) => [...prev, newItem]);
    setExpandedId(newItem.id);
  }

  function switchToItemsMode() {
    const initial: EditableItem = {
      id: `manual-${Date.now()}`,
      nombre: name,
      unidades: 1,
      pesoG: Number(weightG) || 0,
      calorias: Number(calories) || 0,
      proteina: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      grasa: Number(fat) || 0,
      confianza: 1.0,
      _baseWeight: Number(weightG) || 0,
      _baseCalorias: Number(calories) || 0,
      _baseProteina: Number(protein) || 0,
      _baseCarbs: Number(carbs) || 0,
      _baseGrasa: Number(fat) || 0,
    };
    setItems([initial]);
    setExpandedId(null);
  }

  async function handleSave() {
    if (!meal) return;
    setSaving(true);
    setError(null);

    try {
      let body: Record<string, unknown>;

      if (hasItems) {
        const totals = calcTotals(items);
        body = {
          category,
          name,
          weightG: totals.pesoG,
          calories: Math.round(totals.calorias),
          protein: Math.round(totals.proteina * 10) / 10,
          carbs: Math.round(totals.carbs * 10) / 10,
          fat: Math.round(totals.grasa * 10) / 10,
          items: items.length > 0 ? items.map(({ id: _id, ...item }) => item) : null,
        };
      } else {
        body = {
          category,
          name,
          weightG: Number(weightG),
          calories: Number(calories),
          protein: Number(protein),
          carbs: Number(carbs),
          fat: Number(fat),
          items: null,
        };
      }

      const res = await fetch(`/api/meals/${meal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Error al guardar.");
        return;
      }

      router.refresh();
      onClose();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  }

  if (!meal) return null;

  const totals = hasItems ? calcTotals(items) : null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white dark:bg-gray-900 rounded-t-3xl z-50 flex flex-col max-h-[90dvh]">
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Editar comida</h2>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
          {/* Categoría */}
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-2">Categoría</label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map(({ key, label, emoji }) => (
                <button
                  key={key}
                  onClick={() => setCategory(key)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-medium transition-colors ${
                    category === key ? "bg-emerald-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1.5">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>

          {/* Ítems (si tiene segregación) */}
          {hasItems ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Ingredientes ({items.length})</label>
                <button onClick={addItem} className="flex items-center gap-1 text-xs font-semibold text-emerald-600 active:opacity-70">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Ingrediente
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {items.map((item) => {
                  const isExpanded = expandedId === item.id;
                  return (
                    <div key={item.id} className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="flex-1 flex items-center gap-2 text-left min-w-0"
                        >
                          <svg
                            className={`w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{item.nombre}</p>
                              <ConfidenceBadge confidence={item.confianza} />
                            </div>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              {item.unidades > 1 ? `${item.unidades} und · ` : ""}{item.pesoG}g · {Math.round(item.calorias)} kcal
                            </p>
                          </div>
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 flex flex-col gap-3 bg-white dark:bg-gray-900">
                          <div className="relative" ref={nameSearch?.id === item.id ? dropdownRef : null}>
                            <label className="text-xs text-gray-400 dark:text-gray-500 block mb-1">Nombre</label>
                            <input
                              type="text"
                              value={nameSearch?.id === item.id ? nameSearch.query : item.nombre}
                              onChange={(e) => {
                                setNameSearch({ id: item.id, query: e.target.value });
                                if (!e.target.value.trim()) updateItem(item.id, "nombre", e.target.value);
                              }}
                              onFocus={() => setNameSearch({ id: item.id, query: item.nombre })}
                              className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                              placeholder="Busca un alimento…"
                              autoComplete="off"
                            />
                            {nameSearch?.id === item.id && nameSearch.query.trim().length > 1 && (
                              <FoodDropdown
                                query={nameSearch.query}
                                onSelect={(food) => applyFoodFromDB(item.id, food, item.pesoG)}
                              />
                            )}
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 dark:text-gray-500 block mb-1">Unidades</label>
                            <div className="flex items-center gap-3">
                              <button onClick={() => updateItemUnits(item.id, item.unidades - 1)} disabled={item.unidades <= 1}
                                className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-medium disabled:opacity-30">−</button>
                              <span className="text-lg font-bold text-gray-800 dark:text-gray-100 w-6 text-center">{item.unidades}</span>
                              <button onClick={() => updateItemUnits(item.id, item.unidades + 1)}
                                className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-medium">+</button>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 dark:text-gray-500 block mb-1">Peso total (g)</label>
                            <input type="number" inputMode="decimal" value={item.pesoG}
                              onChange={(e) => updateItemWeight(item.id, Number(e.target.value) || 0)}
                              className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { label: "Calorías (kcal)", field: "calorias" as keyof MealItem, val: item.calorias, color: "focus:ring-emerald-300" },
                              { label: "Proteína (g)", field: "proteina" as keyof MealItem, val: item.proteina, color: "focus:ring-blue-300" },
                              { label: "Carbohidratos (g)", field: "carbs" as keyof MealItem, val: item.carbs, color: "focus:ring-amber-300" },
                              { label: "Grasa (g)", field: "grasa" as keyof MealItem, val: item.grasa, color: "focus:ring-violet-300" },
                            ].map(({ label, field, val, color }) => (
                              <div key={label}>
                                <label className="text-xs text-gray-400 dark:text-gray-500 block mb-1">{label}</label>
                                <input type="number" inputMode="decimal" value={val}
                                  onChange={(e) => updateItem(item.id, field, e.target.value)}
                                  className={`w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${color}`} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Totales */}
              {totals && (
                <div className="mt-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl p-3">
                  <p className="text-xs font-medium text-emerald-600 mb-2">Total</p>
                  <div className="grid grid-cols-4 gap-1 text-center">
                    <div><p className="text-base font-bold text-emerald-600">{Math.round(totals.calorias)}</p><p className="text-xs text-gray-400">kcal</p></div>
                    <div><p className="text-base font-bold text-blue-500">{Math.round(totals.proteina * 10) / 10}g</p><p className="text-xs text-gray-400">prot</p></div>
                    <div><p className="text-base font-bold text-amber-500">{Math.round(totals.carbs * 10) / 10}g</p><p className="text-xs text-gray-400">carbs</p></div>
                    <div><p className="text-base font-bold text-violet-500">{Math.round(totals.grasa * 10) / 10}g</p><p className="text-xs text-gray-400">grasa</p></div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Modo plano (comidas sin segregación) */
            <>
              <button
                onClick={switchToItemsMode}
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 active:opacity-70 -mt-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Desglosar en ingredientes
              </button>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1.5">Peso (g)</label>
                <input type="number" inputMode="decimal" value={weightG} onChange={(e) => setWeightG(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-2">Macros</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Calorías (kcal)", val: calories, set: setCalories, color: "focus:ring-emerald-300" },
                    { label: "Proteína (g)", val: protein, set: setProtein, color: "focus:ring-blue-300" },
                    { label: "Carbohidratos (g)", val: carbs, set: setCarbs, color: "focus:ring-amber-300" },
                    { label: "Grasa (g)", val: fat, set: setFat, color: "focus:ring-violet-300" },
                  ].map(({ label, val, set, color }) => (
                    <div key={label}>
                      <label className="text-xs text-gray-400 dark:text-gray-500 block mb-1">{label}</label>
                      <input type="number" inputMode="decimal" value={val} onChange={(e) => set(e.target.value)}
                        className={`w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${color}`} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl p-3">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold rounded-2xl py-3.5 active:bg-gray-50 dark:active:bg-gray-800 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving || !name}
            className="flex-[2] bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 text-white font-semibold rounded-2xl py-3.5 transition-colors flex items-center justify-center gap-2">
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Guardando…
              </>
            ) : "Guardar"}
          </button>
        </div>
      </div>
    </>
  );
}

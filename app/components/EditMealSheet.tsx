"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Sunrise, Sun, Moon, Apple, X, Plus, ChevronRight, Loader2 } from "lucide-react";
import type { MealItem } from "./add/StepCamera";
import { calcMacros } from "@/lib/foods";
import type { Food } from "@/lib/foods";
import Button from "@/app/components/ui/Button";
import FoodDropdown from "@/app/components/ui/FoodDropdown";
import Icon from "@/app/components/ui/Icon";

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

const CATEGORIES: { key: Category; label: string; icon: LucideIcon }[] = [
  { key: "desayuno", label: "Desayuno", icon: Sunrise },
  { key: "almuerzo", label: "Almuerzo", icon: Sun },
  { key: "cena",     label: "Cena",     icon: Moon },
  { key: "snack",    label: "Snack",    icon: Apple },
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
  if (confidence >= 0.85) return <span className="text-[10px] uppercase tracking-[0.08em] font-semibold bg-bg-tertiary text-macro-protein px-2 py-0.5 rounded-full">Alta</span>;
  if (confidence >= 0.6)  return <span className="text-[10px] uppercase tracking-[0.08em] font-semibold bg-bg-tertiary text-macro-fat px-2 py-0.5 rounded-full">Media</span>;
  return <span className="text-[10px] uppercase tracking-[0.08em] font-semibold bg-bg-tertiary text-accent-warm px-2 py-0.5 rounded-full">Baja</span>;
}

const inputClass = "w-full bg-bg-secondary border border-border rounded-xl text-text-primary placeholder:text-text-tertiary px-4 py-3 text-sm focus:outline-none focus:border-text-primary transition-colors duration-200 ease-[var(--ease-editorial)]";
const inputClassSmall = "w-full bg-bg-secondary border border-border rounded-xl text-text-primary placeholder:text-text-tertiary px-3 py-2 text-sm focus:outline-none focus:border-text-primary transition-colors duration-200 ease-[var(--ease-editorial)] tabular-nums font-numbers tracking-[0.01em]";

type Props = {
  meal: Meal;
  onClose: () => void;
};

function parseItemsFromMeal(meal: Meal): EditableItem[] {
  if (!meal.items) return [];
  try {
    const parsed: MealItem[] = JSON.parse(meal.items);
    return makeEditable(parsed);
  } catch {
    return [];
  }
}

export default function EditMealSheet({ meal, onClose }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados inicializados directamente desde el prop. El parent monta
  // este componente con key={meal.id}, así que cada meal arranca con
  // estado fresco. No se necesita sync prop→state via useEffect.
  const [category, setCategory] = useState<Category>(meal.category as Category);
  const [name, setName] = useState(meal.name);
  const [items, setItems] = useState<EditableItem[]>(() => parseItemsFromMeal(meal));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nameSearch, setNameSearch] = useState<{ id: string; query: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Modo sin ítems (comidas viejas sin segregación)
  const [weightG, setWeightG] = useState(String(meal.weightG));
  const [calories, setCalories] = useState(String(meal.calories));
  const [protein, setProtein] = useState(String(meal.protein));
  const [carbs, setCarbs] = useState(String(meal.carbs));
  const [fat, setFat] = useState(String(meal.fat));

  const hasItems = items.length > 0;

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
    fetch(`/api/foods/${food.id}/use`, { method: "POST" }).catch(() => {});
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

  const totals = hasItems ? calcTotals(items) : null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-bg-primary rounded-t-xl z-50 flex flex-col max-h-[90dvh]">
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-bg-tertiary" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-shrink-0">
          <h2 className="font-display text-2xl tracking-[-0.02em] font-medium text-text-primary">Editar comida</h2>
          <button onClick={onClose} className="text-text-tertiary active:text-text-primary p-1 transition-colors duration-200 ease-[var(--ease-editorial)]" aria-label="Cerrar">
            <Icon icon={X} size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-5 flex flex-col gap-5">
          {/* Categoría */}
          <div>
            <label className="text-xs uppercase tracking-[0.08em] text-text-tertiary block mb-2">Categoría</label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setCategory(key)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-medium transition-colors duration-200 ease-[var(--ease-editorial)] ${
                    category === key
                      ? "bg-text-primary text-bg-primary"
                      : "bg-bg-tertiary text-text-secondary active:opacity-80"
                  }`}
                >
                  <Icon icon={icon} size={18} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="text-xs uppercase tracking-[0.08em] text-text-tertiary block mb-2">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Ítems (si tiene segregación) */}
          {hasItems ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs uppercase tracking-[0.08em] text-text-tertiary">Ingredientes ({items.length})</label>
                <button onClick={addItem} className="flex items-center gap-1 text-xs font-medium text-text-primary active:opacity-70">
                  <Icon icon={Plus} size={14} />
                  Ingrediente
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {items.map((item) => {
                  const isExpanded = expandedId === item.id;
                  return (
                    <div key={item.id} className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="flex-1 flex items-center gap-2 text-left min-w-0"
                        >
                          <span className={`text-text-tertiary flex-shrink-0 transition-transform duration-200 ease-[var(--ease-editorial)] ${isExpanded ? "rotate-90" : ""}`}>
                            <Icon icon={ChevronRight} size={16} />
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-text-primary truncate">{item.nombre}</p>
                              <ConfidenceBadge confidence={item.confianza} />
                            </div>
                            <p className="text-xs text-text-tertiary mt-0.5 tabular-nums">
                              {item.unidades > 1 && (
                                <><span className="font-numbers tracking-[0.01em]">{item.unidades}</span> und · </>
                              )}
                              <span className="font-numbers tracking-[0.01em]">{item.pesoG}</span>g ·{" "}
                              <span className="font-numbers tracking-[0.01em]">{Math.round(item.calorias)}</span> kcal
                            </p>
                          </div>
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 text-text-tertiary active:text-accent-warm transition-colors duration-200 ease-[var(--ease-editorial)] flex-shrink-0"
                          aria-label="Quitar ingrediente"
                        >
                          <Icon icon={X} size={16} />
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-border px-4 py-4 flex flex-col gap-3 bg-bg-tertiary/40">
                          <div className="relative" ref={nameSearch?.id === item.id ? dropdownRef : null}>
                            <label className="text-xs uppercase tracking-[0.08em] text-text-tertiary block mb-1.5">Nombre</label>
                            <input
                              type="text"
                              value={nameSearch?.id === item.id ? nameSearch.query : item.nombre}
                              onChange={(e) => {
                                setNameSearch({ id: item.id, query: e.target.value });
                                if (!e.target.value.trim()) updateItem(item.id, "nombre", e.target.value);
                              }}
                              onFocus={() => setNameSearch({ id: item.id, query: item.nombre })}
                              className={inputClassSmall}
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
                            <label className="text-xs uppercase tracking-[0.08em] text-text-tertiary block mb-1.5">Unidades</label>
                            <div className="flex items-center gap-3">
                              <button onClick={() => updateItemUnits(item.id, item.unidades - 1)} disabled={item.unidades <= 1}
                                className="w-9 h-9 rounded-xl bg-bg-secondary border border-border flex items-center justify-center text-text-primary font-medium disabled:opacity-30 active:opacity-80 transition-opacity duration-200 ease-[var(--ease-editorial)]">−</button>
                              <span className="font-numbers text-xl tabular-nums tracking-[0.01em] text-text-primary w-6 text-center">{item.unidades}</span>
                              <button onClick={() => updateItemUnits(item.id, item.unidades + 1)}
                                className="w-9 h-9 rounded-xl bg-bg-secondary border border-border flex items-center justify-center text-text-primary font-medium active:opacity-80 transition-opacity duration-200 ease-[var(--ease-editorial)]">+</button>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs uppercase tracking-[0.08em] text-text-tertiary block mb-1.5">Peso total (g)</label>
                            <input type="number" inputMode="decimal" value={item.pesoG}
                              onChange={(e) => updateItemWeight(item.id, Number(e.target.value) || 0)}
                              className={inputClassSmall} />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { label: "Calorías (kcal)", field: "calorias" as keyof MealItem, val: item.calorias },
                              { label: "Proteína (g)", field: "proteina" as keyof MealItem, val: item.proteina },
                              { label: "Carbohidratos (g)", field: "carbs" as keyof MealItem, val: item.carbs },
                              { label: "Grasa (g)", field: "grasa" as keyof MealItem, val: item.grasa },
                            ].map(({ label, field, val }) => (
                              <div key={label}>
                                <label className="text-xs uppercase tracking-[0.08em] text-text-tertiary block mb-1.5">{label}</label>
                                <input type="number" inputMode="decimal" value={val}
                                  onChange={(e) => updateItem(item.id, field, e.target.value)}
                                  className={inputClassSmall} />
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
                <div className="mt-4 bg-bg-secondary border border-border rounded-xl p-4">
                  <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary mb-3">Total</p>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div>
                      <p className="font-numbers text-xl leading-none tabular-nums tracking-[0.01em] text-text-primary">{Math.round(totals.calorias)}</p>
                      <p className="text-xs text-text-tertiary mt-1">kcal</p>
                    </div>
                    <div>
                      <p className="font-numbers text-xl leading-none tabular-nums tracking-[0.01em] text-macro-protein">{Math.round(totals.proteina * 10) / 10}<span className="font-sans text-xs text-text-tertiary">g</span></p>
                      <p className="text-xs text-text-tertiary mt-1">prot</p>
                    </div>
                    <div>
                      <p className="font-numbers text-xl leading-none tabular-nums tracking-[0.01em] text-macro-carbs">{Math.round(totals.carbs * 10) / 10}<span className="font-sans text-xs text-text-tertiary">g</span></p>
                      <p className="text-xs text-text-tertiary mt-1">carbs</p>
                    </div>
                    <div>
                      <p className="font-numbers text-xl leading-none tabular-nums tracking-[0.01em] text-macro-fat">{Math.round(totals.grasa * 10) / 10}<span className="font-sans text-xs text-text-tertiary">g</span></p>
                      <p className="text-xs text-text-tertiary mt-1">grasa</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Modo plano (comidas sin segregación) */
            <>
              <button
                onClick={switchToItemsMode}
                className="flex items-center gap-1.5 text-xs font-medium text-text-primary active:opacity-70 -mt-1 self-start"
              >
                <Icon icon={Plus} size={14} />
                Desglosar en ingredientes
              </button>
              <div>
                <label className="text-xs uppercase tracking-[0.08em] text-text-tertiary block mb-2">Peso (g)</label>
                <input type="number" inputMode="decimal" value={weightG} onChange={(e) => setWeightG(e.target.value)}
                  className={inputClass} />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.08em] text-text-tertiary block mb-2">Macros</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Calorías (kcal)", val: calories, set: setCalories },
                    { label: "Proteína (g)", val: protein, set: setProtein },
                    { label: "Carbohidratos (g)", val: carbs, set: setCarbs },
                    { label: "Grasa (g)", val: fat, set: setFat },
                  ].map(({ label, val, set }) => (
                    <div key={label}>
                      <label className="text-xs uppercase tracking-[0.08em] text-text-tertiary block mb-1.5">{label}</label>
                      <input type="number" inputMode="decimal" value={val} onChange={(e) => set(e.target.value)}
                        className={inputClassSmall} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="bg-bg-secondary border border-border rounded-xl p-3 flex items-start gap-2.5">
              <span className="text-accent-warm flex-shrink-0 mt-0.5">
                <Icon icon={X} size={16} />
              </span>
              <p className="text-text-primary text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-border flex-shrink-0">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={handleSave}
            disabled={saving || !name}
            leadingIcon={saving ? <Icon icon={Loader2} size={18} className="animate-spin" /> : undefined}
            className="flex-[2]"
          >
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>
    </>
  );
}

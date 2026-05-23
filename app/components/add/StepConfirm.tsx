"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Sunrise, Sun, Moon, Apple, ChevronLeft, ChevronRight, Plus, X, Loader2, Check } from "lucide-react";
import type { AnalysisResult, MealItem } from "./StepCamera";
import { calcMacros } from "@/lib/foods";
import type { Food } from "@/lib/foods";
import Button from "@/app/components/ui/Button";
import FoodDropdown from "@/app/components/ui/FoodDropdown";
import Icon from "@/app/components/ui/Icon";
import ConfidenceBadge from "./ConfidenceBadge";

type Category = "desayuno" | "almuerzo" | "cena" | "snack";

const CATEGORIES: { key: Category; label: string; icon: LucideIcon }[] = [
  { key: "desayuno", label: "Desayuno", icon: Sunrise },
  { key: "almuerzo", label: "Almuerzo", icon: Sun },
  { key: "cena",     label: "Cena",     icon: Moon },
  { key: "snack",    label: "Snack",    icon: Apple },
];

function defaultCategory(): Category {
  const h = new Date().getHours();
  if (h >= 5  && h < 11) return "desayuno";
  if (h >= 11 && h < 16) return "almuerzo";
  if (h >= 16 && h < 20) return "cena";
  return "snack";
}

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

type Props = {
  result: AnalysisResult;
  date: string;
  onBack: () => void;
  onSaved?: () => void;
};

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const inputClass = "w-full bg-bg-secondary border border-border rounded-xl text-text-primary placeholder:text-text-tertiary px-4 py-3 text-sm focus:outline-none focus:border-text-primary transition-colors duration-200 ease-[var(--ease-editorial)]";
const inputClassSmall = "w-full bg-bg-secondary border border-border rounded-xl text-text-primary placeholder:text-text-tertiary px-3 py-2 text-sm focus:outline-none focus:border-text-primary transition-colors duration-200 ease-[var(--ease-editorial)] tabular-nums font-numbers tracking-[0.01em]";

export default function StepConfirm({ result, date: _date, onBack, onSaved }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>(defaultCategory());
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [nombrePlato, setNombrePlato] = useState(result.nombrePlato);
  const [items, setItems] = useState<EditableItem[]>(makeEditable(result.items));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nameSearch, setNameSearch] = useState<{ id: string; query: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer click fuera
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

  // Modo manual: usado cuando items.length === 0 (IA falló o no detectó nada)
  const [flatWeight, setFlatWeight] = useState("");
  const [flatCalories, setFlatCalories] = useState("");
  const [flatProtein, setFlatProtein] = useState("");
  const [flatCarbs, setFlatCarbs] = useState("");
  const [flatFat, setFlatFat] = useState("");

  const totals = calcTotals(items);

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

  async function handleSave() {
    if (!nombrePlato) return;
    if (items.length === 0 && !Number(flatCalories)) return;
    setSaving(true);
    setError(null);

    try {
      const useFlatMode = items.length === 0;
      const body: Record<string, unknown> = {
        date: `${selectedDate}T${new Date().toISOString().split("T")[1]}`,
        dateLocal: selectedDate,
        category,
        name: nombrePlato,
        weightG:    useFlatMode ? (Number(flatWeight) || 0)   : totals.pesoG,
        calories:   useFlatMode ? (Number(flatCalories) || 0) : Math.round(totals.calorias),
        protein:    useFlatMode ? (Number(flatProtein) || 0)  : Math.round(totals.proteina * 10) / 10,
        carbs:      useFlatMode ? (Number(flatCarbs) || 0)    : Math.round(totals.carbs * 10) / 10,
        fat:        useFlatMode ? (Number(flatFat) || 0)      : Math.round(totals.grasa * 10) / 10,
        confidence: useFlatMode ? 0.5 : Math.min(...items.map((i) => i.confianza)),
        items:      useFlatMode ? null : items.map(({ id: _id, ...item }) => item),
      };

      if (result.imageBase64) {
        body.imageBase64 = result.imageBase64;
        body.mimeType = result.mimeType;
      }

      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Error al guardar. Intenta de nuevo.");
        return;
      }

      setSaved(true);
      onSaved?.();
      setTimeout(() => {
        router.push(`/day/${selectedDate}`);
        router.refresh();
      }, 700);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-y-auto bg-bg-primary">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
        <button onClick={onBack} className="text-text-tertiary active:text-text-primary transition-colors duration-200 ease-[var(--ease-editorial)]">
          <Icon icon={ChevronLeft} size={20} />
        </button>
        <h1 className="font-display text-2xl tracking-[-0.02em] font-medium text-text-primary">Confirmar plato</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6">
        {/* Foto */}
        {result.imagePreviewUrl && (
          <div className="w-full max-h-48 rounded-xl overflow-hidden bg-bg-tertiary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result.imagePreviewUrl} alt="Foto" className="w-full h-full object-cover" />
          </div>
        )}

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

        {/* Fecha */}
        <div>
          <label className="text-xs uppercase tracking-[0.08em] text-text-tertiary block mb-2">Fecha</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Nombre del plato */}
        <div>
          <label className="text-xs uppercase tracking-[0.08em] text-text-tertiary block mb-2">Nombre del plato</label>
          <input
            type="text"
            value={nombrePlato}
            onChange={(e) => setNombrePlato(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Ítems / modo manual */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs uppercase tracking-[0.08em] text-text-tertiary">
              {items.length > 0 ? `Ingredientes (${items.length})` : "Macros del plato"}
            </label>
            <button
              onClick={addItem}
              className="flex items-center gap-1 text-xs font-medium text-text-primary active:opacity-70"
            >
              <Icon icon={Plus} size={14} />
              Ingrediente
            </button>
          </div>

          {items.length === 0 ? (
            <div className="bg-bg-secondary border border-border rounded-xl p-5 flex flex-col gap-4">
              <p className="text-xs text-accent-warm bg-bg-tertiary rounded-lg px-3 py-2">
                La IA no detectó ingredientes. Ingresa los macros manualmente o toca «+ Ingrediente».
              </p>
              <div>
                <label className="text-xs uppercase tracking-[0.08em] text-text-tertiary block mb-1.5">Peso total (g)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="ej: 350"
                  value={flatWeight}
                  onChange={(e) => setFlatWeight(e.target.value)}
                  className={inputClassSmall}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Calorías (kcal)", val: flatCalories, set: setFlatCalories },
                  { label: "Proteína (g)",    val: flatProtein,  set: setFlatProtein  },
                  { label: "Carbs (g)",       val: flatCarbs,    set: setFlatCarbs    },
                  { label: "Grasa (g)",       val: flatFat,      set: setFlatFat      },
                ].map(({ label, val, set }) => (
                  <div key={label}>
                    <label className="text-xs uppercase tracking-[0.08em] text-text-tertiary block mb-1.5">{label}</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      className={inputClassSmall}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
          <div className="flex flex-col gap-2">
            {items.map((item) => {
              const isExpanded = expandedId === item.id;
              // HU-01: resaltado visual cuando la IA tiene baja confianza
              const lowConfidence = item.confianza < 0.6;
              return (
                <div
                  key={item.id}
                  className={`rounded-xl overflow-hidden border ${
                    lowConfidence
                      ? "bg-accent-warm/5 border-accent-warm/40"
                      : "bg-bg-secondary border-border"
                  }`}
                >
                  {/* Fila principal */}
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

                  {/* Panel expandido */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 py-4 flex flex-col gap-3 bg-bg-tertiary/40">
                      {/* Nombre con búsqueda */}
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
                        {/* Dropdown de sugerencias */}
                        {nameSearch?.id === item.id && nameSearch.query.trim().length > 1 && (
                          <FoodDropdown
                            query={nameSearch.query}
                            onSelect={(food) => applyFoodFromDB(item.id, food, item.pesoG)}
                          />
                        )}
                      </div>

                      {/* Unidades */}
                      <div>
                        <label className="text-xs uppercase tracking-[0.08em] text-text-tertiary block mb-1.5">Unidades</label>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updateItemUnits(item.id, item.unidades - 1)}
                            disabled={item.unidades <= 1}
                            className="w-9 h-9 rounded-xl bg-bg-secondary border border-border flex items-center justify-center text-text-primary font-medium disabled:opacity-30 active:opacity-80 transition-opacity duration-200 ease-[var(--ease-editorial)]"
                          >
                            −
                          </button>
                          <span className="font-numbers text-xl tabular-nums tracking-[0.01em] text-text-primary w-6 text-center">{item.unidades}</span>
                          <button
                            onClick={() => updateItemUnits(item.id, item.unidades + 1)}
                            className="w-9 h-9 rounded-xl bg-bg-secondary border border-border flex items-center justify-center text-text-primary font-medium active:opacity-80 transition-opacity duration-200 ease-[var(--ease-editorial)]"
                          >
                            +
                          </button>
                          <span className="text-xs text-text-tertiary">— escala los macros</span>
                        </div>
                      </div>

                      {/* Peso */}
                      <div>
                        <label className="text-xs uppercase tracking-[0.08em] text-text-tertiary block mb-1.5">Peso total (g)</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={item.pesoG}
                          onChange={(e) => updateItemWeight(item.id, Number(e.target.value) || 0)}
                          className={inputClassSmall}
                        />
                      </div>

                      {/* Macros */}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "Calorías (kcal)", field: "calorias" as keyof MealItem, val: item.calorias },
                          { label: "Proteína (g)",    field: "proteina" as keyof MealItem, val: item.proteina },
                          { label: "Carbohidratos (g)", field: "carbs" as keyof MealItem, val: item.carbs },
                          { label: "Grasa (g)",       field: "grasa" as keyof MealItem,   val: item.grasa },
                        ].map(({ label, field, val }) => (
                          <div key={label}>
                            <label className="text-xs uppercase tracking-[0.08em] text-text-tertiary block mb-1.5">{label}</label>
                            <input
                              type="number"
                              inputMode="decimal"
                              value={val}
                              onChange={(e) => updateItem(item.id, field, e.target.value)}
                              className={inputClassSmall}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* Totales */}
        {items.length > 0 && (
          <div className="bg-bg-secondary border border-border rounded-xl p-5">
            <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary mb-3">Total del plato</p>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="font-numbers text-2xl leading-none tabular-nums tracking-[0.01em] text-text-primary">{Math.round(totals.calorias)}</p>
                <p className="text-xs text-text-tertiary mt-1">kcal</p>
              </div>
              <div>
                <p className="font-numbers text-2xl leading-none tabular-nums tracking-[0.01em] text-macro-protein">{(Math.round(totals.proteina * 10) / 10)}<span className="font-body text-sm text-text-tertiary">g</span></p>
                <p className="text-xs text-text-tertiary mt-1">prot</p>
              </div>
              <div>
                <p className="font-numbers text-2xl leading-none tabular-nums tracking-[0.01em] text-macro-carbs">{(Math.round(totals.carbs * 10) / 10)}<span className="font-body text-sm text-text-tertiary">g</span></p>
                <p className="text-xs text-text-tertiary mt-1">carbs</p>
              </div>
              <div>
                <p className="font-numbers text-2xl leading-none tabular-nums tracking-[0.01em] text-macro-fat">{(Math.round(totals.grasa * 10) / 10)}<span className="font-body text-sm text-text-tertiary">g</span></p>
                <p className="text-xs text-text-tertiary mt-1">grasa</p>
              </div>
            </div>
          </div>
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

      {/* Botones fijos */}
      <div className="flex gap-3 px-5 py-4 border-t border-border bg-bg-primary flex-shrink-0">
        <Button variant="secondary" onClick={onBack} className="flex-1">
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          disabled={saving || saved || !nombrePlato || (items.length === 0 && !Number(flatCalories))}
          leadingIcon={saved ? <Icon icon={Check} size={18} /> : saving ? <Icon icon={Loader2} size={18} className="animate-spin" /> : undefined}
          className="flex-[2]"
        >
          {saved ? "Guardado" : saving ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

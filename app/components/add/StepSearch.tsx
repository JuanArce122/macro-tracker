"use client";

import { useState, useEffect } from "react";
import { calcMacros, type Food } from "@/lib/foods";
import { useFoodSearch, type FoodWithSource } from "@/app/hooks/useFoodSearch";
import type { AnalysisResult } from "./StepCamera";

async function registerUse(foodId: number) {
  try {
    await fetch(`/api/foods/${foodId}/use`, { method: "POST" });
  } catch {
    // Silencioso si falla
  }
}

type Props = {
  onResult: (result: AnalysisResult) => void;
  onBack: () => void;
  onPhotoSelected?: (file: File) => void;
  initialQuery?: string;
};

export default function StepSearch({ onResult, onBack, onPhotoSelected, initialQuery = "" }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState<FoodWithSource | null>(null);
  const [weightG, setWeightG] = useState<string>("");
  const [units, setUnits] = useState<number>(1);
  const [recentFoods, setRecentFoods] = useState<FoodWithSource[]>([]);
  const [customFoods, setCustomFoods] = useState<FoodWithSource[]>([]);

  useEffect(() => {
    fetch("/api/foods/user")
      .then((r) => r.ok ? r.json() : { myFoods: [], recentFoods: [] })
      .then((data) => {
        setCustomFoods((data.myFoods ?? []).map((f: { id: number; nombre: string; cal: number; p: number; c: number; f: number }) => ({ ...f, categoria: "user" as const, source: "user" })));
        setRecentFoods((data.recentFoods ?? []).map((f: { id: number; nombre: string; cal: number; p: number; c: number; f: number; gramsPerUnit?: number | null; unitLabel?: string | null; source: string }) => ({
          id: f.id, nombre: f.nombre, categoria: "proteina" as const,
          cal: f.cal, p: f.p, c: f.c, f: f.f,
          gramsPerUnit: f.gramsPerUnit ?? undefined,
          unitLabel: f.unitLabel ?? undefined,
          source: f.source,
        })));
      })
      .catch(() => {});
  }, []);

  const { results: dbResults, loading: searching } = useFoodSearch(query);
  const customMatches = customFoods.filter((f) => {
    if (!query.trim()) return false;
    return query.toLowerCase().split(/\s+/).every((w) => f.nombre.toLowerCase().includes(w));
  });
  const resultIds = new Set(dbResults.map((f) => f.id));
  const results = [...customMatches.filter((f) => !resultIds.has(f.id)), ...dbResults];

  const isUnitBased = !!(selected?.gramsPerUnit);
  const effectiveWeight = isUnitBased ? units * selected!.gramsPerUnit! : Number(weightG);
  const showRecents = !query.trim() && !selected && recentFoods.length > 0;

  function handleSelect(food: FoodWithSource) {
    setSelected(food);
    setQuery(food.nombre);
    setWeightG("");
    setUnits(1);
    registerUse(food.id);
  }

  function handleConfirm() {
    if (!selected) return;
    if (isUnitBased && units <= 0) return;
    if (!isUnitBased && (!weightG || Number(weightG) <= 0)) return;

    registerUse(selected.id);
    const macros = calcMacros(selected, effectiveWeight);
    onResult({
      nombrePlato: selected.nombre,
      items: [{
        nombre: selected.nombre,
        unidades: isUnitBased ? units : 1,
        pesoG: effectiveWeight,
        calorias: macros.calorias,
        proteina: macros.proteina,
        carbs: macros.carbs,
        grasa: macros.grasa,
        confianza: 1.0,
      }],
      imageBase64: "",
      mimeType: "",
      imagePreviewUrl: "",
    });
  }

  const canConfirm = selected && (isUnitBased ? units > 0 : (weightG && Number(weightG) > 0));

  function FoodRow({ food, isCustom }: { food: FoodWithSource; isCustom?: boolean }) {
    return (
      <button
        onClick={() => handleSelect(food)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-gray-700 last:border-0 active:bg-gray-50 dark:active:bg-gray-700/50 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{food.nombre}</p>
            {isCustom && (
              <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0">Mío</span>
            )}
            {food.source === "openfoodfacts" && (
              <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0">OFF</span>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {food.gramsPerUnit
              ? `${food.cal} kcal · ${food.p}g P · ${food.c}g C · ${food.f}g G — por ${food.gramsPerUnit}g (1 ${food.unitLabel})`
              : `${food.cal} kcal · ${food.p}g P · ${food.c}g C · ${food.f}g G — por 100g`}
          </p>
        </div>
        <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 ml-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    );
  }

  const customIds = new Set(customFoods.map((f) => f.id));

  return (
    <div className="flex flex-col flex-1 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={onBack} className="flex items-center gap-1 text-gray-400 dark:text-gray-500 text-sm -ml-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Cancelar
        </button>
        <h1 className="text-base font-bold text-gray-800 dark:text-gray-100">Agregar comida</h1>
        {/* Placeholder para centrar el título */}
        <div className="w-16" />
      </div>

      {/* Buscador + botones foto */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="ej: pechuga de pollo cruda"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
            autoFocus
            className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-xl pl-9 pr-9 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          {searching && (
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          {query && !searching && (
            <button onClick={() => { setQuery(""); setSelected(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Botón cámara — label directo sobre input */}
        {onPhotoSelected && (
          <label
            title="Abrir cámara"
            className="w-11 h-11 flex-shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center cursor-pointer active:bg-emerald-200 dark:active:bg-emerald-800/60 transition-colors"
          >
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPhotoSelected(file);
                e.target.value = "";
              }}
            />
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </label>
        )}

        {/* Botón galería — label directo sobre input */}
        {onPhotoSelected && (
          <label
            title="Subir desde galería"
            className="w-11 h-11 flex-shrink-0 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center cursor-pointer active:bg-violet-200 dark:active:bg-violet-800/60 transition-colors"
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPhotoSelected(file);
                e.target.value = "";
              }}
            />
            <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </label>
        )}
      </div>

      {/* Recientes */}
      {showRecents && (
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm mb-4">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 px-4 py-2.5 border-b border-gray-50 dark:border-gray-700">Recientes</p>
          {recentFoods.map((food) => (
            <FoodRow key={food.id} food={food} isCustom={customIds.has(food.id)} />
          ))}
        </div>
      )}

      {/* Resultados */}
      {!selected && query.trim() && (
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm mb-4">
          {results.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-6">Sin resultados para &quot;{query}&quot;</p>
          ) : (
            results.map((food) => (
              <FoodRow key={food.id} food={food} isCustom={customIds.has(food.id)} />
            ))
          )}
        </div>
      )}

      {/* Estado vacío: sin query, sin recientes, sin selección */}
      {!query.trim() && !selected && recentFoods.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 pb-10">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center">
            Escribe para buscar un alimento
          </p>
        </div>
      )}

      {/* Cantidad / Peso */}
      {selected && (
        <div className="flex flex-col gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-2xl p-4">
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">{selected.nombre}</p>
            <p className="text-xs text-blue-500 dark:text-blue-400">
              {selected.gramsPerUnit
                ? `${selected.cal} kcal · ${selected.p}g P · ${selected.c}g C · ${selected.f}g G — por ${selected.gramsPerUnit}g (1 ${selected.unitLabel})`
                : `${selected.cal} kcal · ${selected.p}g P · ${selected.c}g C · ${selected.f}g G por 100g`}
            </p>
          </div>

          {isUnitBased ? (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1.5">
                ¿Cuántos {selected.unitLabel}s?
              </label>
              <div className="flex items-center gap-4">
                <button onClick={() => setUnits((u) => Math.max(1, u - 1))}
                  className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xl font-medium active:bg-gray-200 dark:active:bg-gray-600 transition-colors">−</button>
                <span className="text-2xl font-bold text-gray-800 dark:text-gray-100 w-8 text-center">{units}</span>
                <button onClick={() => setUnits((u) => u + 1)}
                  className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xl font-medium active:bg-gray-200 dark:active:bg-gray-600 transition-colors">+</button>
                <span className="text-sm text-gray-400 dark:text-gray-500 ml-1">= {effectiveWeight}g</span>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1.5">Peso en gramos *</label>
              <input type="number" inputMode="decimal" placeholder="ej: 267" value={weightG}
                onChange={(e) => setWeightG(e.target.value)} autoFocus
                className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          )}

          {effectiveWeight > 0 && (() => {
            const m = calcMacros(selected, effectiveWeight);
            const label = isUnitBased
              ? `Para ${units} ${units === 1 ? selected.unitLabel : `${selected.unitLabel}s`} (${effectiveWeight}g):`
              : `Para ${weightG}g:`;
            return (
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-3">{label}</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div><p className="text-lg font-bold text-emerald-600">{m.calorias}</p><p className="text-xs text-gray-400 dark:text-gray-500">kcal</p></div>
                  <div><p className="text-lg font-bold text-blue-500">{m.proteina}g</p><p className="text-xs text-gray-400 dark:text-gray-500">proteína</p></div>
                  <div><p className="text-lg font-bold text-amber-500">{m.carbs}g</p><p className="text-xs text-gray-400 dark:text-gray-500">carbs</p></div>
                  <div><p className="text-lg font-bold text-violet-500">{m.grasa}g</p><p className="text-xs text-gray-400 dark:text-gray-500">grasa</p></div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <button onClick={handleConfirm} disabled={!canConfirm}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 text-white font-semibold rounded-2xl py-4 transition-colors mt-auto">
        Continuar
      </button>
    </div>
  );
}

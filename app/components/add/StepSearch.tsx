"use client";

import { useState } from "react";
import { searchFoods, calcMacros, type Food } from "@/lib/foods";
import type { AnalysisResult } from "./StepCamera";

type Props = {
  onResult: (result: AnalysisResult) => void;
  onBack: () => void;
};

export default function StepSearch({ onResult, onBack }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Food | null>(null);
  const [weightG, setWeightG] = useState<string>("");
  const [units, setUnits] = useState<number>(1);

  const results = searchFoods(query);
  const isUnitBased = !!(selected?.gramsPerUnit);
  const effectiveWeight = isUnitBased ? units * selected!.gramsPerUnit! : Number(weightG);

  function handleSelect(food: Food) {
    setSelected(food);
    setQuery(food.nombre);
    setWeightG("");
    setUnits(1);
  }

  function handleConfirm() {
    if (!selected) return;
    if (isUnitBased && units <= 0) return;
    if (!isUnitBased && (!weightG || Number(weightG) <= 0)) return;

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

  return (
    <div className="flex flex-col flex-1 p-5">
      <button onClick={onBack} className="flex items-center gap-1 text-gray-400 text-sm mb-6 -ml-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Atrás
      </button>

      <h1 className="text-xl font-bold text-gray-800 mb-5">Buscar alimento</h1>

      {/* Buscador */}
      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="ej: pechuga de pollo cruda"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
          autoFocus
          className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        {query && (
          <button onClick={() => { setQuery(""); setSelected(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Resultados */}
      {!selected && query.trim() && (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm mb-4">
          {results.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Sin resultados para &quot;{query}&quot;</p>
          ) : (
            results.map((food) => (
              <button
                key={food.id}
                onClick={() => handleSelect(food)}
                className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0 active:bg-gray-50 text-left"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{food.nombre}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {food.gramsPerUnit
                      ? `${food.cal} kcal · ${food.p}g P · ${food.c}g C · ${food.f}g G — por ${food.gramsPerUnit}g (1 ${food.unitLabel})`
                      : `${food.cal} kcal · ${food.p}g P · ${food.c}g C · ${food.f}g G — por 100g`
                    }
                  </p>
                </div>
                <svg className="w-4 h-4 text-gray-300 flex-shrink-0 ml-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))
          )}
        </div>
      )}

      {/* Cantidad / Peso y preview de cálculo */}
      {selected && (
        <div className="flex flex-col gap-4">
          <div className="bg-blue-50 rounded-2xl p-4">
            <p className="text-sm font-semibold text-blue-700 mb-1">{selected.nombre}</p>
            <p className="text-xs text-blue-500">
              {selected.gramsPerUnit
                ? `${selected.cal} kcal · ${selected.p}g P · ${selected.c}g C · ${selected.f}g G — por ${selected.gramsPerUnit}g (1 ${selected.unitLabel})`
                : `${selected.cal} kcal · ${selected.p}g P · ${selected.c}g C · ${selected.f}g G por 100g`
              }
            </p>
          </div>

          {isUnitBased ? (
            /* Stepper de unidades */
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1.5">
                ¿Cuántos {selected.unitLabel}s?
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setUnits((u) => Math.max(1, u - 1))}
                  className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 text-xl font-medium active:bg-gray-200 transition-colors"
                >
                  −
                </button>
                <span className="text-2xl font-bold text-gray-800 w-8 text-center">{units}</span>
                <button
                  onClick={() => setUnits((u) => u + 1)}
                  className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 text-xl font-medium active:bg-gray-200 transition-colors"
                >
                  +
                </button>
                <span className="text-sm text-gray-400 ml-1">= {effectiveWeight}g</span>
              </div>
            </div>
          ) : (
            /* Input de gramos */
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1.5">Peso en gramos *</label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="ej: 267"
                value={weightG}
                onChange={(e) => setWeightG(e.target.value)}
                autoFocus
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          )}

          {/* Preview de macros calculados */}
          {effectiveWeight > 0 && (() => {
            const m = calcMacros(selected, effectiveWeight);
            const label = isUnitBased
              ? `Para ${units} ${units === 1 ? selected.unitLabel : `${selected.unitLabel}s`} (${effectiveWeight}g):`
              : `Para ${weightG}g:`;
            return (
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-medium text-gray-400 mb-3">{label}</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-emerald-600">{m.calorias}</p>
                    <p className="text-xs text-gray-400">kcal</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-blue-500">{m.proteina}g</p>
                    <p className="text-xs text-gray-400">proteína</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-amber-500">{m.carbs}g</p>
                    <p className="text-xs text-gray-400">carbs</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-violet-500">{m.grasa}g</p>
                    <p className="text-xs text-gray-400">grasa</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <button
        onClick={handleConfirm}
        disabled={!canConfirm}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-2xl py-4 transition-colors mt-auto"
      >
        Continuar
      </button>
    </div>
  );
}

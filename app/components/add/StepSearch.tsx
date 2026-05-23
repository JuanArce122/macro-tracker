"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Search, X, Camera, Image as ImageIcon, Barcode, Mic, Loader2 } from "lucide-react";
import { calcMacros, type Food } from "@/lib/foods";
import { useFoodSearch, type FoodWithSource } from "@/app/hooks/useFoodSearch";
import { REGION_FLAGS } from "@/lib/regions";
import FoodBadge from "@/app/components/FoodBadge";
import type { AnalysisResult } from "./StepCamera";
import Button from "@/app/components/ui/Button";
import Icon from "@/app/components/ui/Icon";

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
  onScanBarcode?: () => void;
  onVoice?: () => void;
  initialQuery?: string;
};

export default function StepSearch({ onResult, onBack, onPhotoSelected, onScanBarcode, onVoice, initialQuery = "" }: Props) {
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
    const macros = calcMacros(selected as Food, effectiveWeight);
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
        className="w-full flex items-center justify-between px-5 py-3 border-b border-border last:border-0 active:bg-bg-tertiary text-left transition-colors duration-200 ease-[var(--ease-editorial)]"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-text-primary truncate">{food.nombre}</p>
            {isCustom && (
              <span className="text-[10px] uppercase tracking-[0.08em] bg-bg-tertiary text-text-secondary font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0">Mío</span>
            )}
            {/* HU-04: badge Verificado / Comunidad */}
            {!isCustom && (
              <FoodBadge
                verifiedAt={food.verifiedAt ?? null}
                voteCount={food.voteCount ?? 0}
                className="flex-shrink-0"
              />
            )}
            {food.regionCode && REGION_FLAGS[food.regionCode] && (
              <span
                className="text-sm flex-shrink-0"
                title={`Alimento típico de ${food.regionCode === "LAC" ? "Latinoamérica" : food.regionCode}`}
                aria-label={`Regional ${food.regionCode}`}
              >
                {REGION_FLAGS[food.regionCode]}
              </span>
            )}
          </div>
          <p className="text-xs text-text-tertiary mt-0.5 tabular-nums">
            <span className="font-numbers tracking-[0.01em]">{food.cal}</span> kcal ·{" "}
            <span className="font-numbers tracking-[0.01em]">{food.p}</span>g P ·{" "}
            <span className="font-numbers tracking-[0.01em]">{food.c}</span>g C ·{" "}
            <span className="font-numbers tracking-[0.01em]">{food.f}</span>g G — por{" "}
            {food.gramsPerUnit ? (
              <>
                <span className="font-numbers tracking-[0.01em]">{food.gramsPerUnit}</span>g
                {" "}(<span className="font-numbers tracking-[0.01em]">1</span> {food.unitLabel})
              </>
            ) : (
              <><span className="font-numbers tracking-[0.01em]">100</span>g</>
            )}
          </p>
        </div>
        <Icon icon={ChevronRight} size={16} className="text-text-tertiary flex-shrink-0 ml-2" />
      </button>
    );
  }

  const customIds = new Set(customFoods.map((f) => f.id));

  return (
    <div className="flex flex-col flex-1 p-5 bg-bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-text-tertiary active:text-text-primary text-sm -ml-1 transition-colors duration-200 ease-[var(--ease-editorial)]"
        >
          <Icon icon={ChevronLeft} size={16} />
          Cancelar
        </button>
        <h1 className="font-display text-xl tracking-[-0.02em] font-medium text-text-primary">Agregar comida</h1>
        <div className="w-16" />
      </div>

      {/* Buscador + botones foto */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none flex items-center">
            <Icon icon={Search} size={16} />
          </span>
          <input
            type="text"
            placeholder="ej: pechuga de pollo cruda"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
            autoFocus
            className="w-full bg-bg-secondary border border-border rounded-xl text-text-primary placeholder:text-text-tertiary pl-10 pr-10 py-3 text-sm focus:outline-none focus:border-text-primary transition-colors duration-200 ease-[var(--ease-editorial)]"
          />
          {searching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary">
              <Icon icon={Loader2} size={16} className="animate-spin" />
            </span>
          )}
          {query && !searching && (
            <button
              onClick={() => { setQuery(""); setSelected(null); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary active:text-text-primary"
              aria-label="Limpiar búsqueda"
            >
              <Icon icon={X} size={16} />
            </button>
          )}
        </div>

        {onPhotoSelected && (
          <label
            title="Abrir cámara"
            aria-label="Abrir cámara"
            className="w-11 h-11 flex-shrink-0 rounded-xl bg-bg-secondary border border-border flex items-center justify-center text-text-primary cursor-pointer active:bg-bg-tertiary transition-colors duration-200 ease-[var(--ease-editorial)]"
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
            <Icon icon={Camera} size={18} />
          </label>
        )}

        {onPhotoSelected && (
          <label
            title="Subir desde galería"
            aria-label="Subir desde galería"
            className="w-11 h-11 flex-shrink-0 rounded-xl bg-bg-secondary border border-border flex items-center justify-center text-text-primary cursor-pointer active:bg-bg-tertiary transition-colors duration-200 ease-[var(--ease-editorial)]"
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
            <Icon icon={ImageIcon} size={18} />
          </label>
        )}

        {onScanBarcode && (
          <button
            type="button"
            onClick={onScanBarcode}
            title="Escanear código de barras"
            aria-label="Escanear código de barras"
            className="w-11 h-11 flex-shrink-0 rounded-xl bg-bg-secondary border border-border flex items-center justify-center text-text-primary cursor-pointer active:bg-bg-tertiary transition-colors duration-200 ease-[var(--ease-editorial)]"
          >
            <Icon icon={Barcode} size={18} />
          </button>
        )}

        {onVoice && (
          <button
            type="button"
            onClick={onVoice}
            title="Registrar por voz"
            aria-label="Registrar por voz"
            className="w-11 h-11 flex-shrink-0 rounded-xl bg-bg-secondary border border-border flex items-center justify-center text-text-primary cursor-pointer active:bg-bg-tertiary transition-colors duration-200 ease-[var(--ease-editorial)]"
          >
            <Icon icon={Mic} size={18} />
          </button>
        )}
      </div>

      {/* Recientes */}
      {showRecents && (
        <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden mb-4">
          <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary px-5 py-3 border-b border-border">Recientes</p>
          {recentFoods.map((food) => (
            <FoodRow key={food.id} food={food} isCustom={customIds.has(food.id)} />
          ))}
        </div>
      )}

      {/* Resultados */}
      {!selected && query.trim() && (
        <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden mb-4">
          {results.length === 0 ? (
            <p className="text-text-tertiary text-sm text-center py-6">Sin resultados para &quot;{query}&quot;</p>
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
          <div className="w-14 h-14 rounded-full bg-bg-tertiary flex items-center justify-center text-text-tertiary">
            <Icon icon={Search} size={24} />
          </div>
          <p className="text-sm text-text-tertiary text-center">
            Escribe para buscar un alimento
          </p>
        </div>
      )}

      {/* Cantidad / Peso */}
      {selected && (
        <div className="flex flex-col gap-4">
          <div className="bg-bg-secondary border border-border rounded-xl p-5">
            <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary mb-2">Seleccionado</p>
            <p className="text-base font-medium text-text-primary mb-1">{selected.nombre}</p>
            <p className="text-xs text-text-tertiary tabular-nums">
              <span className="font-numbers tracking-[0.01em]">{selected.cal}</span> kcal ·{" "}
              <span className="font-numbers tracking-[0.01em]">{selected.p}</span>g P ·{" "}
              <span className="font-numbers tracking-[0.01em]">{selected.c}</span>g C ·{" "}
              <span className="font-numbers tracking-[0.01em]">{selected.f}</span>g G {selected.gramsPerUnit ? "— por " : "por "}
              {selected.gramsPerUnit ? (
                <>
                  <span className="font-numbers tracking-[0.01em]">{selected.gramsPerUnit}</span>g
                  {" "}(<span className="font-numbers tracking-[0.01em]">1</span> {selected.unitLabel})
                </>
              ) : (
                <><span className="font-numbers tracking-[0.01em]">100</span>g</>
              )}
            </p>
          </div>

          {isUnitBased ? (
            <div>
              <label className="text-xs uppercase tracking-[0.08em] text-text-tertiary block mb-2">
                ¿Cuántos {selected.unitLabel}s?
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setUnits((u) => Math.max(1, u - 1))}
                  className="w-11 h-11 rounded-xl bg-bg-tertiary flex items-center justify-center text-text-primary text-xl font-medium active:opacity-80 transition-opacity duration-200 ease-[var(--ease-editorial)]"
                >−</button>
                <span className="font-numbers text-3xl tabular-nums tracking-[0.01em] text-text-primary w-10 text-center">{units}</span>
                <button
                  onClick={() => setUnits((u) => u + 1)}
                  className="w-11 h-11 rounded-xl bg-bg-tertiary flex items-center justify-center text-text-primary text-xl font-medium active:opacity-80 transition-opacity duration-200 ease-[var(--ease-editorial)]"
                >+</button>
                <span className="text-sm text-text-tertiary tabular-nums ml-1">= {effectiveWeight}g</span>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs uppercase tracking-[0.08em] text-text-tertiary block mb-2">Peso en gramos *</label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="ej: 267"
                value={weightG}
                onChange={(e) => setWeightG(e.target.value)}
                autoFocus
                className="w-full bg-bg-secondary border border-border rounded-xl text-text-primary placeholder:text-text-tertiary px-4 py-3 text-sm focus:outline-none focus:border-text-primary transition-colors duration-200 ease-[var(--ease-editorial)] tabular-nums font-numbers tracking-[0.01em]"
              />
            </div>
          )}

          {effectiveWeight > 0 && (() => {
            const m = calcMacros(selected as Food, effectiveWeight);
            const label = isUnitBased
              ? `Para ${units} ${units === 1 ? selected.unitLabel : `${selected.unitLabel}s`} (${effectiveWeight}g)`
              : `Para ${weightG}g`;
            return (
              <div className="bg-bg-secondary border border-border rounded-xl p-5">
                <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary mb-3">{label}</p>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="font-numbers text-2xl leading-none tabular-nums tracking-[0.01em] text-text-primary">{m.calorias}</p>
                    <p className="text-xs text-text-tertiary mt-1">kcal</p>
                  </div>
                  <div>
                    <p className="font-numbers text-2xl leading-none tabular-nums tracking-[0.01em] text-macro-protein">{m.proteina}<span className="font-sans text-sm text-text-tertiary">g</span></p>
                    <p className="text-xs text-text-tertiary mt-1">prot</p>
                  </div>
                  <div>
                    <p className="font-numbers text-2xl leading-none tabular-nums tracking-[0.01em] text-macro-carbs">{m.carbs}<span className="font-sans text-sm text-text-tertiary">g</span></p>
                    <p className="text-xs text-text-tertiary mt-1">carbs</p>
                  </div>
                  <div>
                    <p className="font-numbers text-2xl leading-none tabular-nums tracking-[0.01em] text-macro-fat">{m.grasa}<span className="font-sans text-sm text-text-tertiary">g</span></p>
                    <p className="text-xs text-text-tertiary mt-1">grasa</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <Button
        variant="primary"
        size="lg"
        onClick={handleConfirm}
        disabled={!canConfirm}
        className="w-full mt-auto"
      >
        Continuar
      </Button>
    </div>
  );
}

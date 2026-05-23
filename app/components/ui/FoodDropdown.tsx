"use client";

import { Loader2 } from "lucide-react";
import { useFoodSearch } from "@/app/hooks/useFoodSearch";
import type { Food } from "@/lib/foods";
import Icon from "@/app/components/ui/Icon";

type Props = {
  query: string;
  onSelect: (food: Food) => void;
};

export default function FoodDropdown({ query, onSelect }: Props) {
  const { results, loading } = useFoodSearch(query);

  if (loading) return (
    <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-bg-secondary border border-border rounded-xl shadow-[var(--shadow-subtle)] px-4 py-3 flex items-center gap-2">
      <Icon icon={Loader2} size={16} className="text-text-tertiary animate-spin flex-shrink-0" />
      <span className="text-sm text-text-tertiary">Buscando…</span>
    </div>
  );

  if (results.length === 0) return null;

  return (
    <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-bg-secondary border border-border rounded-xl shadow-[var(--shadow-subtle)] overflow-hidden max-h-64 overflow-y-auto">
      {results.map((food) => (
        <button
          key={food.id}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onSelect(food); }}
          className="w-full flex items-start gap-2 px-4 py-2.5 text-left active:bg-bg-tertiary border-b border-border last:border-0 transition-colors duration-200 ease-[var(--ease-editorial)]"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-primary font-medium truncate">{food.nombre}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-text-tertiary tabular-nums">
                <span className="font-numbers tracking-[0.01em]">{food.cal}</span> kcal/<span className="font-numbers tracking-[0.01em]">100</span>g
              </span>
              {food.source === "openfoodfacts" && (
                <span className="text-[10px] font-semibold bg-bg-tertiary text-text-secondary px-1.5 py-0.5 rounded-full">OFF</span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

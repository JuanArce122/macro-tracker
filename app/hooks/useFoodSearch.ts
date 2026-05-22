"use client";

import { useState, useEffect, useRef } from "react";
import { searchFoods } from "@/lib/foods";
import type { Food } from "@/lib/foods";

export type DBFood = {
  id: number;
  nombre: string;
  categoria: string;
  cal: number;
  p: number;
  c: number;
  f: number;
  gramsPerUnit?: number | null;
  unitLabel?: string | null;
  source: string;
  userId?: number | null;
  regionCode?: string | null; // HU-12
};

export function dbFoodToFood(f: DBFood): Food {
  return {
    id: f.id,
    nombre: f.nombre,
    categoria: (f.categoria === "otros" ? "proteina" : f.categoria) as Food["categoria"],
    cal: f.cal,
    p: f.p,
    c: f.c,
    f: f.f,
    gramsPerUnit: f.gramsPerUnit ?? undefined,
    unitLabel: f.unitLabel ?? undefined,
  };
}

export type FoodWithSource = Food & { source: string; regionCode?: string | null };

const EMPTY_RESULTS: FoodWithSource[] = [];

export function useFoodSearch(query: string, debounceMs = 300) {
  // Estado interno: SOLO se popula cuando hay un query buscable. El reset
  // a [] cuando el query es muy corto se hace de forma derivada al
  // devolver el valor al consumidor (no se llama setResults([])).
  const [results, setResults] = useState<FoodWithSource[]>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmed = query.trim();
  const isQueryable = trimmed.length >= 2;

  useEffect(() => {
    if (!isQueryable) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/foods?q=${encodeURIComponent(query)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setResults((data.foods as DBFood[]).map((f) => ({
            ...dbFoodToFood(f),
            source: f.source ?? "usda",
            regionCode: f.regionCode ?? null,
          })));
        } else {
          setResults(searchFoods(query).map((f) => ({ ...f, source: "usda" })));
        }
      } catch {
        setResults(searchFoods(query).map((f) => ({ ...f, source: "usda" })));
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, isQueryable, debounceMs]);

  return {
    results: isQueryable ? results : EMPTY_RESULTS,
    loading: isQueryable && loading,
  };
}

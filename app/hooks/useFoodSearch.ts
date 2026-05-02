"use client";

import { useState, useEffect, useRef } from "react";
import { searchFoods } from "@/lib/foods";
import type { Food } from "@/lib/foods";

type DBFood = {
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
};

function dbFoodToFood(f: DBFood): Food {
  return {
    id: f.id,
    nombre: f.nombre,
    categoria: f.categoria as Food["categoria"],
    cal: f.cal,
    p: f.p,
    c: f.c,
    f: f.f,
    gramsPerUnit: f.gramsPerUnit ?? undefined,
    unitLabel: f.unitLabel ?? undefined,
  };
}

export function useFoodSearch(query: string, debounceMs = 300) {
  const [results, setResults] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/foods?q=${encodeURIComponent(query)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setResults((data.foods as DBFood[]).map(dbFoodToFood));
        } else {
          // Fallback local si la API falla
          setResults(searchFoods(query));
        }
      } catch {
        // Sin conexión → búsqueda local
        setResults(searchFoods(query));
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, debounceMs]);

  return { results, loading };
}

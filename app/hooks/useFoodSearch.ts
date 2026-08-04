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
  // HU-04: BD dos capas
  verifiedAt?: string | null;
  voteScore?: number;
  voteCount?: number;
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

export type FoodWithSource = Food & {
  source: string;
  regionCode?: string | null;
  // HU-04
  verifiedAt?: string | null;
  voteScore?: number;
  voteCount?: number;
};

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

    // AbortController + flag `cancelled`: al cambiar el query se aborta el fetch
    // en vuelo y se ignora su respuesta, así una respuesta lenta no pisa a una
    // rápida posterior con resultados stale (F8).
    const controller = new AbortController();
    let cancelled = false;

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/foods?q=${encodeURIComponent(query)}&limit=10`,
          { signal: controller.signal }
        );
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          setResults((data.foods as DBFood[]).map((f) => ({
            ...dbFoodToFood(f),
            source: f.source ?? "usda",
            regionCode: f.regionCode ?? null,
            verifiedAt: f.verifiedAt ?? null,
            voteScore: f.voteScore ?? 0,
            voteCount: f.voteCount ?? 0,
          })));
        } else {
          setResults(searchFoods(query).map((f) => ({ ...f, source: "usda" })));
        }
      } catch (e) {
        if (cancelled || (e instanceof DOMException && e.name === "AbortError")) return;
        setResults(searchFoods(query).map((f) => ({ ...f, source: "usda" })));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, debounceMs);

    return () => {
      cancelled = true;
      controller.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, isQueryable, debounceMs]);

  return {
    results: isQueryable ? results : EMPTY_RESULTS,
    loading: isQueryable && loading,
  };
}

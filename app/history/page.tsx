"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import BottomNav from "@/app/components/BottomNav";

type DaySummary = {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type MealResult = {
  id: number;
  date: string;
  category: string;
  name: string;
  imageUrl: string | null;
  weightG: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
};

function MealDetailSheet({ meal, onClose }: { meal: MealResult; onClose: () => void }) {
  const router = useRouter();
  const day = meal.date.split("T")[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-[430px] mx-auto bg-white rounded-t-3xl p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        <div className="flex gap-4 mb-4">
          {meal.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={meal.imageUrl} alt={meal.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <span className="text-3xl">🍽️</span>
            </div>
          )}
          <div className="flex-1">
            <p className="font-bold text-gray-800 text-base">{meal.name}</p>
            <p className="text-sm text-gray-400 capitalize mt-0.5">{meal.category} · {meal.weightG}g</p>
            <p className="text-xs text-gray-400 mt-1">
              {format(parseISO(meal.date), "d 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 bg-gray-50 rounded-2xl p-4 mb-4">
          {[
            { label: "kcal", val: meal.calories, color: "text-emerald-600" },
            { label: "prot.", val: meal.protein, color: "text-blue-500" },
            { label: "carbs", val: meal.carbs, color: "text-amber-500" },
            { label: "grasa", val: meal.fat, color: "text-violet-500" },
          ].map(({ label, val, color }) => (
            <div key={label} className="text-center">
              <p className={`text-lg font-bold ${color}`}>{val.toFixed(1)}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => { router.push(`/day/${day}`); onClose(); }}
          className="w-full border border-gray-200 text-gray-600 font-medium rounded-2xl py-3 text-sm"
        >
          Ver día completo →
        </button>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [days, setDays] = useState<DaySummary[]>([]);
  const [searchResults, setSearchResults] = useState<MealResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealResult | null>(null);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then(setDays)
      .finally(() => setLoading(false));
  }, []);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const res = await fetch(`/api/history?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setSearchResults(data);
    setSearching(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  const isSearching = query.trim().length > 0;

  return (
    <div className="flex flex-col flex-1 bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-5 pb-3">
        <h1 className="text-2xl font-bold text-gray-800 mb-3">Historial</h1>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar alimento..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-gray-100 rounded-xl pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {/* Resultados de búsqueda */}
        {isSearching && (
          <div className="px-4 pt-4">
            {searching ? (
              <p className="text-gray-400 text-sm text-center py-8">Buscando…</p>
            ) : searchResults.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Sin resultados para "{query}"</p>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <p className="text-xs text-gray-400 px-4 py-2.5 border-b border-gray-50">
                  {searchResults.length} resultado{searchResults.length !== 1 ? "s" : ""}
                </p>
                {searchResults.map((meal) => (
                  <button
                    key={meal.id}
                    onClick={() => setSelectedMeal(meal)}
                    className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 active:bg-gray-50 text-left"
                  >
                    {meal.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={meal.imageUrl} alt={meal.name} className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">🍽️</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{meal.name}</p>
                      <p className="text-xs text-gray-400">
                        {format(parseISO(meal.date), "d MMM yyyy", { locale: es })} · {meal.calories.toFixed(0)} kcal
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lista de días */}
        {!isSearching && (
          <div className="px-4 pt-4 flex flex-col gap-2">
            {loading && (
              <p className="text-gray-400 text-sm text-center py-12">Cargando…</p>
            )}
            {!loading && days.length === 0 && (
              <div className="flex flex-col items-center py-16 text-center">
                <span className="text-5xl mb-3">📅</span>
                <p className="text-gray-500 font-medium">Sin registros todavía</p>
                <p className="text-gray-400 text-sm mt-1">Agrega comidas para verlas aquí</p>
              </div>
            )}
            {days.map((day) => {
              const parsed = parseISO(day.date);
              return (
                <button
                  key={day.date}
                  onClick={() => router.push(`/day/${day.date}`)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left active:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-800 capitalize">
                        {format(parsed, "EEEE", { locale: es })}
                      </p>
                      <p className="text-xs text-gray-400">
                        {format(parsed, "d 'de' MMMM yyyy", { locale: es })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-600">{day.calories.toFixed(0)}</p>
                      <p className="text-xs text-gray-400">kcal</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    {[
                      { label: "P", val: day.protein, color: "text-blue-500" },
                      { label: "C", val: day.carbs, color: "text-amber-500" },
                      { label: "G", val: day.fat, color: "text-violet-500" },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="flex items-baseline gap-1">
                        <span className={`text-sm font-semibold ${color}`}>{val.toFixed(1)}g</span>
                        <span className="text-xs text-gray-400">{label}</span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />

      {selectedMeal && (
        <MealDetailSheet meal={selectedMeal} onClose={() => setSelectedMeal(null)} />
      )}
    </div>
  );
}

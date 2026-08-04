"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { UtensilsCrossed, CalendarDays, Search, X, Download, ChevronRight } from "lucide-react";
import BottomNav from "@/app/components/BottomNav";
import Icon from "@/app/components/ui/Icon";

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
  dateLocal: string | null;
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
  const day = meal.dateLocal ?? meal.date.split("T")[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-[430px] mx-auto bg-bg-primary rounded-t-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-bg-tertiary rounded-full mx-auto mb-5" />

        <div className="flex gap-4 mb-5">
          {meal.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={meal.imageUrl} alt={meal.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-bg-tertiary flex items-center justify-center flex-shrink-0 text-text-tertiary">
              <Icon icon={UtensilsCrossed} size={32} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-display text-xl tracking-[-0.02em] font-medium text-text-primary leading-tight">{meal.name}</p>
            <p className="text-xs text-text-tertiary capitalize mt-1 tabular-nums">{meal.category} · {meal.weightG}g</p>
            <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary mt-1.5">
              {format(parseISO(meal.dateLocal ?? meal.date), "d 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>
        </div>

        <div className="bg-bg-secondary border border-border rounded-xl p-5 mb-4">
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="font-numbers text-2xl leading-none tabular-nums tracking-[0.01em] text-text-primary">{meal.calories.toFixed(0)}</p>
              <p className="text-xs text-text-tertiary mt-1">kcal</p>
            </div>
            <div>
              <p className="font-numbers text-2xl leading-none tabular-nums tracking-[0.01em] text-macro-protein">{meal.protein.toFixed(1)}<span className="font-body text-sm text-text-tertiary">g</span></p>
              <p className="text-xs text-text-tertiary mt-1">prot</p>
            </div>
            <div>
              <p className="font-numbers text-2xl leading-none tabular-nums tracking-[0.01em] text-macro-carbs">{meal.carbs.toFixed(1)}<span className="font-body text-sm text-text-tertiary">g</span></p>
              <p className="text-xs text-text-tertiary mt-1">carbs</p>
            </div>
            <div>
              <p className="font-numbers text-2xl leading-none tabular-nums tracking-[0.01em] text-macro-fat">{meal.fat.toFixed(1)}<span className="font-body text-sm text-text-tertiary">g</span></p>
              <p className="text-xs text-text-tertiary mt-1">grasa</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => { router.push(`/day/${day}`); onClose(); }}
          className="w-full border border-text-primary text-text-primary font-medium rounded-xl py-3 text-sm active:bg-bg-tertiary transition-colors duration-200 ease-[var(--ease-editorial)] inline-flex items-center justify-center gap-2"
        >
          Ver día completo
          <Icon icon={ChevronRight} size={16} />
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
    <div className="flex flex-col flex-1 bg-bg-primary">
      {/* Header */}
      <div className="px-5 pt-7 pb-4">
        <div className="flex items-end justify-between mb-5">
          <h1 className="font-display text-[40px] leading-[1.1] tracking-[-0.02em] font-medium text-text-primary">Historial</h1>
          <a
            href="/api/export"
            download
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.08em] font-medium text-text-primary border-b border-text-primary pb-0.5 active:opacity-70 transition-opacity duration-200 ease-[var(--ease-editorial)]"
          >
            <Icon icon={Download} size={14} />
            CSV
          </a>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none flex items-center">
            <Icon icon={Search} size={16} />
          </span>
          <input
            type="text"
            placeholder="Buscar alimento…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-bg-secondary border border-border rounded-xl text-text-primary placeholder:text-text-tertiary pl-10 pr-10 py-3 text-sm focus:outline-none focus:border-text-primary transition-colors duration-200 ease-[var(--ease-editorial)]"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary active:text-text-primary"
              aria-label="Limpiar búsqueda"
            >
              <Icon icon={X} size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {/* Resultados de búsqueda */}
        {isSearching && (
          <div className="px-4 pt-2">
            {searching ? (
              <p className="text-text-tertiary text-sm text-center py-8">Buscando…</p>
            ) : searchResults.length === 0 ? (
              <p className="text-text-tertiary text-sm text-center py-8">Sin resultados para «{query}»</p>
            ) : (
              <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
                <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary px-5 py-3 border-b border-border">
                  {searchResults.length} resultado{searchResults.length !== 1 ? "s" : ""}
                </p>
                {searchResults.map((meal) => (
                  <button
                    key={meal.id}
                    onClick={() => setSelectedMeal(meal)}
                    className="w-full flex items-center gap-3 px-5 py-3 border-b border-border last:border-0 active:bg-bg-tertiary text-left transition-colors duration-200 ease-[var(--ease-editorial)]"
                  >
                    {meal.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={meal.imageUrl} alt={meal.name} className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-bg-tertiary flex items-center justify-center flex-shrink-0 text-text-tertiary">
                        <Icon icon={UtensilsCrossed} size={20} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{meal.name}</p>
                      <p className="text-xs text-text-tertiary tabular-nums mt-0.5">
                        {format(parseISO(meal.dateLocal ?? meal.date), "d MMM yyyy", { locale: es })} ·{" "}
                        <span className="font-numbers tracking-[0.01em]">{meal.calories.toFixed(0)}</span> kcal
                      </p>
                    </div>
                    <Icon icon={ChevronRight} size={16} className="text-text-tertiary flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lista de días */}
        {!isSearching && (
          <div className="px-4 pt-2 flex flex-col gap-2">
            {/* Promedios últimos 7 días */}
            {!loading && days.length > 0 && (() => {
              const recent = days.slice(0, 7);
              const n = recent.length;
              const avg = {
                calories: recent.reduce((s, d) => s + d.calories, 0) / n,
                protein:  recent.reduce((s, d) => s + d.protein,  0) / n,
                carbs:    recent.reduce((s, d) => s + d.carbs,    0) / n,
                fat:      recent.reduce((s, d) => s + d.fat,      0) / n,
              };
              return (
                <div className="bg-bg-secondary border border-border rounded-xl px-4 py-3.5">
                  <p className="text-[10px] uppercase tracking-[0.08em] text-text-tertiary mb-2.5">
                    Promedio · últimos {n} {n === 1 ? "día" : "días"} registrados
                  </p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="font-numbers text-xl leading-none tabular-nums tracking-[0.01em] text-text-primary">{avg.calories.toFixed(0)}</p>
                      <p className="text-[10px] text-text-tertiary mt-1">kcal</p>
                    </div>
                    <div>
                      <p className="font-numbers text-xl leading-none tabular-nums tracking-[0.01em] text-macro-protein">{avg.protein.toFixed(1)}<span className="font-body text-xs text-text-tertiary">g</span></p>
                      <p className="text-[10px] text-text-tertiary mt-1">prot</p>
                    </div>
                    <div>
                      <p className="font-numbers text-xl leading-none tabular-nums tracking-[0.01em] text-macro-carbs">{avg.carbs.toFixed(1)}<span className="font-body text-xs text-text-tertiary">g</span></p>
                      <p className="text-[10px] text-text-tertiary mt-1">carbs</p>
                    </div>
                    <div>
                      <p className="font-numbers text-xl leading-none tabular-nums tracking-[0.01em] text-macro-fat">{avg.fat.toFixed(1)}<span className="font-body text-xs text-text-tertiary">g</span></p>
                      <p className="text-[10px] text-text-tertiary mt-1">grasa</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {loading && (
              <p className="text-text-tertiary text-sm text-center py-12">Cargando…</p>
            )}
            {!loading && days.length === 0 && (
              <div className="flex flex-col items-center py-16 text-center">
                <span className="text-text-tertiary mb-4">
                  <Icon icon={CalendarDays} size={48} />
                </span>
                <p className="text-text-secondary font-medium">Sin registros todavía</p>
                <p className="text-text-tertiary text-sm mt-1">Agrega comidas para verlas aquí</p>
              </div>
            )}
            {days.map((day) => {
              const parsed = parseISO(day.date);
              return (
                <button
                  key={day.date}
                  onClick={() => router.push(`/day/${day.date}`)}
                  className="bg-bg-secondary border border-border rounded-xl px-4 py-3.5 text-left active:bg-bg-tertiary transition-colors duration-200 ease-[var(--ease-editorial)]"
                >
                  <div className="flex items-baseline justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="font-display text-xl leading-none tracking-[-0.02em] font-medium text-text-primary capitalize">
                        {format(parsed, "EEEE", { locale: es })}
                      </p>
                      <p className="text-[10px] uppercase tracking-[0.08em] text-text-tertiary mt-1 capitalize">
                        {format(parsed, "d 'de' MMMM yyyy", { locale: es })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-numbers text-xl leading-none tabular-nums tracking-[0.01em] text-text-primary">
                        {day.calories.toFixed(0)}
                        <span className="font-body text-xs text-text-tertiary ml-1 tracking-normal">kcal</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2.5 text-[11px] tabular-nums">
                    <span>
                      <span className="font-numbers tracking-[0.01em] text-macro-protein">{day.protein.toFixed(1)}</span>
                      <span className="text-macro-protein">g</span>
                      <span className="text-text-tertiary"> P</span>
                    </span>
                    <span className="text-text-tertiary">·</span>
                    <span>
                      <span className="font-numbers tracking-[0.01em] text-macro-carbs">{day.carbs.toFixed(1)}</span>
                      <span className="text-macro-carbs">g</span>
                      <span className="text-text-tertiary"> C</span>
                    </span>
                    <span className="text-text-tertiary">·</span>
                    <span>
                      <span className="font-numbers tracking-[0.01em] text-macro-fat">{day.fat.toFixed(1)}</span>
                      <span className="text-macro-fat">g</span>
                      <span className="text-text-tertiary"> G</span>
                    </span>
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

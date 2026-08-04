"use client";

/**
 * HU-06: Plan semanal activo — calendario 7 días × N comidas.
 *
 * Si el user no tiene plan, redirige a /plan/setup.
 * Permite marcar cada comida como "consumida" (POST log-meal).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Check,
  RefreshCw,
  Loader2,
  CalendarDays,
} from "lucide-react";
import Button from "@/app/components/ui/Button";
import Icon from "@/app/components/ui/Icon";

type Recipe = {
  id: number;
  name: string;
  prepTimeMin: number;
  cookTimeMin: number;
  caloriesPerServing: number | null;
  proteinPerServing: number | null;
  carbsPerServing: number | null;
  fatPerServing: number | null;
  cuisineCode: string | null;
};

type PlannedMeal = {
  id: number;
  planId: number;
  date: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | "snack1" | "snack2";
  recipeId: number;
  servings: number;
  consumed: boolean;
  consumedAt: string | null;
  recipe: Recipe;
};

type Plan = {
  id: number;
  startDate: string;
  endDate: string;
  preferences: string;
  isActive: boolean;
  plannedMeals: PlannedMeal[];
};

const MEAL_LABELS: Record<PlannedMeal["mealType"], string> = {
  breakfast: "Desayuno",
  lunch: "Almuerzo",
  snack: "Snack",
  snack1: "Snack",
  snack2: "Snack",
  dinner: "Cena",
};

const MEAL_ORDER: PlannedMeal["mealType"][] = ["breakfast", "snack1", "lunch", "snack2", "snack", "dinner"];

function dayLabel(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00.000Z`);
  const names = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  return names[d.getUTCDay()];
}

function shortDate(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00.000Z`);
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

function dayKey(dateISO: string, meals: PlannedMeal[]): PlannedMeal[] {
  const filtered = meals.filter((m) => m.date === dateISO);
  return filtered.sort(
    (a, b) => MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType)
  );
}

export default function PlanPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggingId, setLoggingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/meal-plans")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("No pudimos cargar tu plan"))))
      .then((data) => {
        if (!cancelled) setPlan(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error inesperado");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function logMeal(plannedMealId: number) {
    if (!plan) return;
    setLoggingId(plannedMealId);
    try {
      const res = await fetch(`/api/meal-plans/${plan.id}/log-meal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plannedMealId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "No pudimos registrar la comida");
      }
      // Refrescar el router: la vista del día mostrará la comida registrada al
      // volver (F11). Además marcamos localmente para feedback inmediato.
      router.refresh();
      setPlan((prev) =>
        prev
          ? {
              ...prev,
              plannedMeals: prev.plannedMeals.map((m) =>
                m.id === plannedMealId
                  ? { ...m, consumed: true, consumedAt: new Date().toISOString() }
                  : m
              ),
            }
          : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoggingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <Loader2 className="animate-spin text-text-secondary" size={28} />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary">
        <header className="sticky top-0 bg-bg-primary border-b border-border z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-1 -ml-1"
              aria-label="Volver"
            >
              <Icon icon={ChevronLeft} size={24} />
            </button>
            <h1 className="text-lg font-medium">Plan semanal</h1>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
          <Icon icon={CalendarDays} size={48} className="mx-auto text-text-secondary" />
          <h2 className="text-xl font-medium">Aún no tenés un plan</h2>
          <p className="text-sm text-text-secondary">
            Generá tu primer plan semanal con tus preferencias.
          </p>
          <Button
            onClick={() => router.push("/plan/setup")}
            size="lg"
            className="mx-auto"
          >
            Crear plan
          </Button>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </main>
      </div>
    );
  }

  // Días únicos en orden
  const dates = Array.from(new Set(plan.plannedMeals.map((m) => m.date))).sort();

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <header className="sticky top-0 bg-bg-primary border-b border-border z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1 -ml-1"
            aria-label="Volver"
          >
            <Icon icon={ChevronLeft} size={24} />
          </button>
          <h1 className="text-lg font-medium">Plan semanal</h1>
          <button
            onClick={() => router.push("/plan/setup")}
            className="ml-auto p-1"
            aria-label="Regenerar plan"
            title="Regenerar plan"
          >
            <Icon icon={RefreshCw} size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="text-xs text-text-secondary">
          Semana del {shortDate(plan.startDate)} al {shortDate(plan.endDate)}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {dates.map((date) => {
          const dayMeals = dayKey(date, plan.plannedMeals);
          const totalCal = dayMeals.reduce(
            (sum, m) => sum + (m.recipe.caloriesPerServing ?? 0) * m.servings,
            0
          );
          return (
            <section key={date} className="space-y-2">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-medium">
                  {dayLabel(date)}{" "}
                  <span className="text-xs text-text-secondary font-normal">
                    {shortDate(date)}
                  </span>
                </h2>
                <span className="text-xs text-text-secondary">
                  {Math.round(totalCal)} kcal
                </span>
              </div>

              <div className="space-y-2">
                {dayMeals.map((m) => (
                  <article
                    key={m.id}
                    className={`rounded-lg border p-3 ${
                      m.consumed ? "bg-bg-tertiary/40 border-border" : "border-border"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs uppercase tracking-wide text-text-secondary">
                            {MEAL_LABELS[m.mealType]}
                          </span>
                          {m.consumed && (
                            <span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                              Consumido
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-medium truncate">
                          {m.recipe.name}
                        </h3>
                        <div className="text-xs text-text-secondary mt-0.5">
                          {Math.round((m.recipe.caloriesPerServing ?? 0) * m.servings)} kcal ·{" "}
                          {m.servings}× porción ·{" "}
                          {m.recipe.prepTimeMin + m.recipe.cookTimeMin} min
                        </div>
                      </div>
                      {!m.consumed && (
                        <button
                          onClick={() => logMeal(m.id)}
                          disabled={loggingId === m.id}
                          className="rounded-full bg-text-primary text-bg-primary p-2 disabled:opacity-50"
                          aria-label="Marcar como consumido"
                        >
                          {loggingId === m.id ? (
                            <Loader2 className="animate-spin" size={16} />
                          ) : (
                            <Icon icon={Check} size={16} />
                          )}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
